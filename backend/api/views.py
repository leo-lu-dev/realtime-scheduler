from rest_framework import generics
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import User, Group, Schedule, Event, Membership
from .serializers import UserSerializer, GroupSerializer, ScheduleSerializer, EventSerializer, MembershipSerializer
from django.shortcuts import get_object_or_404

class UserCreateView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

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
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'group_id'
    lookup_field = 'id'

    def get_queryset(self):
        return Group.objects.filter(admin=self.request.user)

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
    permission_classes = [IsAuthenticated]

    def get_group(self):
        group_id = self.kwargs['group_id']
        return get_object_or_404(Group.objects.filter(memberships__user=self.request.user), id=group_id)

    def get_queryset(self):
        group = self.get_group()
        return Membership.objects.filter(group=group)

    def perform_create(self, serializer):
        group = self.get_group()
        user = serializer.validated_data.get('user')

        if group.admin != self.request.user:
            raise PermissionDenied("Only the group owner can manage members.")

        if Membership.objects.filter(user=user, group=group).exists():
            raise ValidationError("User is already a member of this group.")

        serializer.save(group=group)

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
