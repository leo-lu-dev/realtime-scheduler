from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import CreateUserView, GroupViewSet, ScheduleViewSet, EventViewSet, MembershipViewSet

router = DefaultRouter()
router.register('groups', GroupViewSet, basename='group')
router.register('schedules', ScheduleViewSet, basename='schedule')
router.register('events', EventViewSet, basename='event')
router.register('memberships', MembershipViewSet, basename='membership')

urlpatterns = [
    path('user/register', CreateUserView.as_view(), name='register'),
    path('token', TokenObtainPairView.as_view(), name='token'),
    path('token/refresh', TokenRefreshView.as_view(), name='refresh'),
    path('', include(router.urls)),
]
