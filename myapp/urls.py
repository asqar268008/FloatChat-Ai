from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'dashboard-data', views.DashboardDataViewSet, basename='dashboarddata')
router.register(r'chat-messages', views.ChatMessageViewSet, basename='chatmessage')
router.register(r'location-data', views.LocationDataViewSet, basename='locationdata')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/login/', views.login_view, name='login'),
    path('api/logout/', views.logout_view, name='logout'),
    path('api/register/', views.register_view, name='register'),
    path('api/current-user/', views.current_user, name='current_user'),
]