from rest_framework import generics
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import User, Group, Schedule, Event, Membership
from .serializers import UserSerializer, GroupSerializer, ScheduleSerializer, EventSerializer, MembershipSerializer
from django.shortcuts import get_object_or_404

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class GroupListCreate(generics.ListCreateAPIView):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(memberships__user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ScheduleListCreate(generics.ListCreateAPIView):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Schedule.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
class EventListCreate(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_schedule(self):
        schedule_id = self.kwargs['schedule_id']
        return get_object_or_404(Schedule, id=schedule_id, user=self.request.user)
    
    def get_queryset(self):
        return Event.objects.filter(schedule=self.get_schedule())

    def perform_create(self, serializer):
        serializer.save(schedule=self.get_schedule())

class MembershipListCreate(generics.ListCreateAPIView):
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

        if group.created_by != self.request.user:
            raise PermissionDenied("Only the group owner can manage members.")

        if Membership.objects.filter(user=user, group=group).exists():
            raise ValidationError("User is already a member of this group.")

        serializer.save(group=group)