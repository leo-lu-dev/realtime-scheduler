from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    CurrentUserView,
    UserCreateView,
    GroupListCreateView,
    GroupDetailView,
    ScheduleListCreateView,
    ScheduleDetailView,
    EventListCreateView,
    EventDetailView,
    MembershipListCreateView,
    MembershipUpdateView,
    MembershipDeleteView,
    GroupAvailabilityView,
)

urlpatterns = [
    path('register/', UserCreateView.as_view(), name='user-register'),
    path('token/', TokenObtainPairView.as_view(), name='token-obtain'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    path('groups/', GroupListCreateView.as_view(), name='group-list-create'),
    path('groups/<uuid:group_id>/', GroupDetailView.as_view(), name='group-detail'),

    path('groups/<uuid:group_id>/members/', MembershipListCreateView.as_view(), name='member-list-create'),
    path('members/<uuid:membership_id>/', MembershipUpdateView.as_view(), name='member-update'),
    path('members/<uuid:membership_id>/delete/', MembershipDeleteView.as_view(), name='member-delete'),

    path('schedules/', ScheduleListCreateView.as_view(), name='schedule-list-create'),
    path('schedules/<uuid:schedule_id>/', ScheduleDetailView.as_view(), name='schedule-detail'),

    path('schedules/<uuid:schedule_id>/events/', EventListCreateView.as_view(), name='event-list-create'),
    path('schedules/<uuid:schedule_id>/events/<uuid:event_id>/', EventDetailView.as_view(), name='event-detail'),

    path('groups/<uuid:group_id>/availability/', GroupAvailabilityView.as_view(), name='group-availability'),

    path('user/', CurrentUserView.as_view(), name='current-user'),
]
