from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Event, Membership

channel_layer = get_channel_layer()

def broadcast_group_availability(schedule_id):
    """Notify all groups where this schedule is active that availability changed"""
    memberships = Membership.objects.filter(active_schedule_id=schedule_id)
    for m in memberships:
        group_id = str(m.group.id)
        async_to_sync(channel_layer.group_send)(
            f"group_{group_id}",
            {
                "type": "broadcast_message",
                "event": {
                    "type": "availability_changed",
                    "groupId": group_id,
                },
            },
        )

@receiver(post_save, sender=Event)
def event_saved(sender, instance, created, **kwargs):
    broadcast_group_availability(instance.schedule.id)

@receiver(post_delete, sender=Event)
def event_deleted(sender, instance, **kwargs):
    broadcast_group_availability(instance.schedule.id)
