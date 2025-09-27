from django.urls import path
from .views import *

urlpatterns=[
    path('signup/',SignUpPage),
    path('',LoginPage),
    path('logout/',LogoutPage)
]