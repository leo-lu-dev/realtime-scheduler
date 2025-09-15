import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.db.models import Q
from .models import Group, Schedule

log = logging.getLogger(__name__)

class Consumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            user = self.scope.get("user")
            if not user or user.is_anonymous:
                await self.close(code=4401)
                return

            self.namespace = self.scope["url_route"]["kwargs"]["namespace"]
            self.obj_id = self.scope["url_route"]["kwargs"]["obj_id"]

            if not await self._allowed(self.namespace, self.obj_id, user.id):
                await self.close(code=4403)
                return

            singular = "group" if self.namespace == "groups" else "schedule"
            self.room = f"{singular}_{self.obj_id}"

            await self.channel_layer.group_add(self.room, self.channel_name)
            await self.accept()
            log.info("ws connect ok ns=%s room=%s user=%s", self.namespace, self.room, user.id)
        except Exception as e:
            log.exception("ws connect error: %s", e)
            try:
                await self.close(code=1011)
            except Exception:
                pass

    async def disconnect(self, code):
        try:
            if hasattr(self, "room"):
                await self.channel_layer.group_discard(self.room, self.channel_name)
            log.info("ws disconnect room=%s code=%s", getattr(self, "room", None), code)
        except Exception as e:
            log.exception("ws disconnect error: %s", e)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            event = data.get("event")
            if event is None:
                return
            # Re-broadcast to everyone in the room
            await self.channel_layer.group_send(self.room, {"type": "broadcast", "event": event})
            log.info("ws recv -> broadcast room=%s event=%s", self.room, event.get("type"))
        except Exception as e:
            log.exception("ws receive error: %s", e)

    async def broadcast(self, message):
        try:
            await self.send(text_data=json.dumps({"event": message["event"]}))
        except Exception as e:
            log.exception("ws send error: %s", e)

    async def broadcast_message(self, message):
        # Some senders (or channel layers) may use "broadcast.message" or "broadcast_message".
        # Treat it the same as "broadcast".
        await self.broadcast(message)

    @database_sync_to_async
    def _allowed(self, ns, oid, uid):
        if ns == "groups":
            return Group.objects.filter(Q(id=oid) & (Q(admin_id=uid) | Q(memberships__user_id=uid))).exists()
        if ns == "schedules":
            return Schedule.objects.filter(id=oid, user_id=uid).exists()
        return False
