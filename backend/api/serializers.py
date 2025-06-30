from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Group, Membership, Schedule, Event

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','username','password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name', 'admin', 'created_at']
        extra_kwargs = {'admin': {'read_only': True}, 'created_at': {'read_only': True}}

class MembershipSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    active_schedule = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Membership
        fields = ['id', 'user', 'group', 'active_schedule', 'joined_at']
        extra_kwargs = {'group': {'read_only': True}, 'joined_at': {'read_only': True}}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            self.fields['active_schedule'].queryset = Schedule.objects.filter(user=request.user)

class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ['id', 'user', 'name', 'created_at']
        extra_kwargs = {'user': {'read_only': True}, 'created_at': {'read_only': True}}

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'schedule', 'date', 'start_time', 'end_time']
        extra_kwargs = {'schedule': {'read_only': True}}
