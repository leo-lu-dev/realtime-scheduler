from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny, SAFE_METHODS, BasePermission
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import UserSerializer, GroupSerializer, ScheduleSerializer, EventSerializer, MembershipSerializer, MembershipAddByEmailSerializer
from .models import User, Group, Schedule, Event, Membership
from django.shortcuts import get_object_or_404
from django.db.models import Q, Exists, OuterRef
from django.http import Http404
from datetime import timedelta, timezone as dt_timezone
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from .utils import broadcast_schedule_change

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserCreateView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class IsGroupAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        is_admin = (obj.admin_id == request.user.id)
        if request.method in SAFE_METHODS:
            return is_admin or obj.memberships.filter(user=request.user).exists()
        return is_admin

class GroupListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(memberships__user=self.request.user)
    
    def perform_create(self, serializer):
        group = serializer.save(admin=self.request.user)
        Membership.objects.get_or_create(user=self.request.user, group=group)

class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated, IsGroupAdmin]
    lookup_url_kwarg = 'group_id'
    lookup_field = 'id'

    def get_queryset(self):
        return Group.objects.filter(Q(admin=self.request.user) | Q(memberships__user=self.request.user)).distinct()
    
    def perform_update(self, serializer):
        obj = serializer.save()
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        layer = get_channel_layer()
        if layer:
            async_to_sync(layer.group_send)(
                f"group_{obj.id}",
                {"type": "broadcast", "event": {"type": "group_name_updated", "groupId": str(obj.id), "name": obj.name}},
            )

class ScheduleListCreateView(generics.ListCreateAPIView):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Schedule.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'schedule_id'
    lookup_field = 'id'

    def get_queryset(self):
        return Schedule.objects.filter(user=self.request.user)

class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_schedule(self):
        schedule_id = self.kwargs['schedule_id']
        return get_object_or_404(Schedule, id=schedule_id, user=self.request.user)
    
    def get_queryset(self):
        return Event.objects.filter(schedule=self.get_schedule())

    def perform_create(self, serializer):
        obj = serializer.save(schedule=self.get_schedule())
        broadcast_schedule_change(obj.schedule_id)

class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'event_id'
    lookup_field = 'id'

    def get_queryset(self):
        schedule_id = self.kwargs['schedule_id']
        return Event.objects.filter(schedule_id=schedule_id, schedule__user=self.request.user)
    
    def perform_update(self, serializer):
        obj = serializer.save()
        broadcast_schedule_change(obj.schedule_id)

    def perform_destroy(self, instance):
        sid = instance.schedule_id
        super().perform_destroy(instance)
        broadcast_schedule_change(sid)

class MembershipListCreateView(generics.ListCreateAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_group(self):
        group_id = self.kwargs['group_id']
        member_exists = Membership.objects.filter(group_id=OuterRef('id'), user=self.request.user)
        qs = Group.objects.filter(id=group_id).annotate(is_member=Exists(member_exists)).filter(Q(admin=self.request.user) | Q(is_member=True))
        group = qs.first()
        if not group:
            raise Http404("Group not found")
        return group

    def get_queryset(self):
        group = self.get_group()
        return Membership.objects.filter(group=group).select_related('user', 'active_schedule')

    def create(self, request, *args, **kwargs):
        group = self.get_group()
        if group.admin != request.user:
            raise PermissionDenied("Only the group owner can add members.")
        add_ser = MembershipAddByEmailSerializer(data=request.data)
        add_ser.is_valid(raise_exception=True)
        emails = [User.objects.normalize_email(e).lower() for e in add_ser.validated_data['emails']]
        users = list(User.objects.filter(email__in=emails))
        user_by_email = {u.email.lower(): u for u in users}
        created = []
        skipped = []
        for email in emails:
            u = user_by_email.get(email)
            if not u:
                skipped.append({'email': email, 'reason': 'not_found'})
                continue
            if Membership.objects.filter(user=u, group=group).exists():
                skipped.append({'email': email, 'reason': 'already_member'})
                continue
            m = Membership.objects.create(user=u, group=group)
            created.append(MembershipSerializer(m, context={'request': request}).data)
        return Response({'created': created, 'skipped': skipped}, status=status.HTTP_201_CREATED)

class MembershipUpdateView(generics.UpdateAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'membership_id'
    lookup_field = 'id'

    def get_queryset(self):
        return Membership.objects.filter(user=self.request.user)
    
    def perform_update(self, serializer):
        prev = self.get_object().active_schedule_id
        obj = serializer.save()
        if obj.active_schedule_id != prev:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            layer = get_channel_layer()
            if layer:
                async_to_sync(layer.group_send)(
                    f"group_{obj.group_id}",
                    {"type": "broadcast", "event": {"type": "availability_changed", "groupId": str(obj.group_id)}},
                )

class MembershipDeleteView(generics.DestroyAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'membership_id'
    lookup_field = 'id'

    def get_queryset(self):
        return Membership.objects.filter(user=self.request.user) | Membership.objects.filter(group__admin=self.request.user)

    def perform_destroy(self, instance):
        if self.request.user not in [instance.user, instance.group.admin]:
            raise PermissionDenied("Only the user or group admin can remove this membership.")
        instance.delete()

class GroupAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        start_str = request.query_params.get('start')
        end_str = request.query_params.get('end')
        step = int(request.query_params.get('step', '30'))
        mode = request.query_params.get('mode', 'active_only')
        min_people = int(request.query_params.get('min_people', '0'))

        if not start_str or not end_str:
            raise ValidationError("start and end are required ISO datetimes")
        start = parse_datetime(start_str)
        end = parse_datetime(end_str)
        if start is None or end is None or start >= end:
            raise ValidationError("Invalid start/end")
        if timezone.is_naive(start):
            start = timezone.make_aware(start, dt_timezone.utc)
        if timezone.is_naive(end):
            end = timezone.make_aware(end, dt_timezone.utc)
        if step <= 0 or step > 240:
            raise ValidationError("step must be 1..240 minutes")

        group = Group.objects.filter(
            Q(id=group_id) & (Q(admin=request.user) | Q(memberships__user=request.user))
        ).distinct().first()
        if not group:
            raise PermissionDenied("Not allowed")

        all_members = Membership.objects.filter(group=group).select_related('user', 'active_schedule')
        actives = all_members.filter(active_schedule__isnull=False)
        missing = all_members.filter(active_schedule__isnull=True)

        total_members = all_members.count()
        active_count = actives.count()
        missing_count = total_members - active_count

        if active_count == 0:
            return Response({
                "stepMinutes": step,
                "mode": mode,
                "minPeople": min_people,
                "activeCount": 0,
                "totalMembers": total_members,
                "missingCount": missing_count,
                "memberCount": 0,
                "activeMemberIds": [],
                "missingMemberIds": list(missing.values_list('id', flat=True)),
                "slots": [],
                "allFreeBlocks": []
            })

        schedule_ids = list(actives.values_list('active_schedule_id', flat=True))
        events = Event.objects.filter(
            schedule_id__in=schedule_ids,
            end__gt=start, start__lt=end
        ).values('schedule_id', 'start', 'end')

        by_sched = {}
        for e in events:
            by_sched.setdefault(e['schedule_id'], []).append((e['start'], e['end']))

        slots = []
        step_delta = timedelta(minutes=step)
        cursor = start
        while cursor < end:
            slot_end = min(cursor + step_delta, end)
            busy_count = 0
            for sid in schedule_ids:
                busy = False
                for s, ev in by_sched.get(sid, []):
                    if not (ev <= cursor or s >= slot_end):
                        busy = True
                        break
                if busy:
                    busy_count += 1
            available = active_count - busy_count
            slots.append({
                "start": cursor.isoformat().replace("+00:00", "Z"),
                "end": slot_end.isoformat().replace("+00:00", "Z"),
                "available": available
            })
            cursor = slot_end

        all_free_blocks = []
        curr_start = None
        last_end = None
        for s in slots:
            if s["available"] == active_count:
                if curr_start is None:
                    curr_start = s["start"]
                last_end = s["end"]
            else:
                if curr_start is not None:
                    all_free_blocks.append({"start": curr_start, "end": last_end})
                    curr_start = None
        if curr_start is not None:
            all_free_blocks.append({"start": curr_start, "end": last_end})

        return Response({
            "stepMinutes": step,
            "mode": mode,
            "minPeople": min_people,
            "activeCount": active_count,
            "totalMembers": total_members,
            "missingCount": missing_count,
            "memberCount": active_count,
            "activeMemberIds": list(actives.values_list('id', flat=True)),
            "missingMemberIds": list(missing.values_list('id', flat=True)),
            "slots": slots,
            "allFreeBlocks": all_free_blocks
        })
