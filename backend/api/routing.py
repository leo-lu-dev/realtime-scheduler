from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/schedules/(?P<schedule_id>[\w-]+)/$", consumers.ScheduleConsumer.as_asgi()),
]
