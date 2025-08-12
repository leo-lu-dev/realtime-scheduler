from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny, SAFE_METHODS, BasePermission
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer
from .models import User, Group, Schedule, Event, Membership
from .serializers import UserSerializer, GroupSerializer, ScheduleSerializer, EventSerializer, MembershipSerializer, MembershipAddByEmailSerializer
from django.shortcuts import get_object_or_404
from django.db.models import Q, Exists, OuterRef
from django.http import Http404

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
      return Group.objects.filter(
          Q(admin=self.request.user) | Q(memberships__user=self.request.user)
      ).distinct()

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
        serializer.save(schedule=self.get_schedule())

class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'event_id'
    lookup_field = 'id'

    def get_queryset(self):
        schedule_id = self.kwargs['schedule_id']
        return Event.objects.filter(schedule_id=schedule_id, schedule__user=self.request.user)

class MembershipListCreateView(generics.ListCreateAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_group(self):
        group_id = self.kwargs['group_id']
        member_exists = Membership.objects.filter(group_id=OuterRef('id'), user=self.request.user)
        qs = (
            Group.objects
            .filter(id=group_id)
            .annotate(is_member=Exists(member_exists))
            .filter(Q(admin=self.request.user) | Q(is_member=True))
        )
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
