from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Group, Membership, Schedule, Event

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','username','password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name', 'created_by', 'created_at']


class MembershipSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    active_schedule = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Membership
        fields = ['id', 'user', 'group', 'active_schedule', 'joined_at']


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ['id', 'user', 'name', 'created_at']


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'schedule', 'date', 'start_time', 'end_time']
