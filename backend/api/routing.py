from django.urls import re_path
from .consumers import Consumer

websocket_urlpatterns = [
    re_path(r"^ws/(?P<namespace>groups|schedules)/(?P<obj_id>[\w-]+)/$", Consumer.as_asgi()),
]