from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User, Group, Membership, Schedule, Event

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'display_name', 'password']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'display_name': {'required': True}
        }

    def validate_email(self, value):
        try:
            validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError("Enter a valid email address.")
        return value

    def create(self, validated_data):
        email = validated_data['email']
        if not validated_data.get('display_name'):
            validated_data['display_name'] = email.split('@')[0]
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
