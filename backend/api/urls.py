from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GroupViewSet, ScheduleViewSet, EventViewSet, MembershipViewSet

router = DefaultRouter()
router.register(r'groups', GroupViewSet, basename='group')
router.register(r'schedules', ScheduleViewSet, basename='schedule')
router.register(r'events', EventViewSet, basename='event')
router.register(r'memberships', MembershipViewSet, basename='membership')

urlpatterns = router.urls
