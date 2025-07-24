from channels.generic.websocket import AsyncWebsocketConsumer
import json

class ScheduleConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.schedule_id = self.scope['url_route']['kwargs']['schedule_id']
        self.group_name = f'schedule_{self.schedule_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'broadcast_message',
                'message': data.get('message')
            }
        )

    async def broadcast_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message']
        }))
