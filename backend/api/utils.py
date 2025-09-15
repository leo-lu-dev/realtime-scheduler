import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Membership

log = logging.getLogger(__name__)

def broadcast_schedule_change(schedule_id):
    layer = get_channel_layer()
    if not layer:
        log.error("no channel layer")
        return
    async_to_sync(layer.group_send)(
        f"schedule_{schedule_id}",
        {"type": "broadcast", "event": {"type": "event_changed", "scheduleId": str(schedule_id)}},
    )
    group_ids = list(Membership.objects.filter(active_schedule_id=schedule_id).values_list("group_id", flat=True).distinct())
    log.info("broadcast schedule=%s -> groups=%s", schedule_id, group_ids)
    for gid in group_ids:
        async_to_sync(layer.group_send)(
            f"group_{gid}",
            {"type": "broadcast", "event": {"type": "availability_changed", "groupId": str(gid)}},
        )
