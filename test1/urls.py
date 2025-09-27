
from django.contrib import admin
from django.urls import path
from graphdisplay.views import *

urlpatterns = [
    path('admin/', admin.site.urls),
    path('home/',HomePage),
    path('bot/',BotPage),
    path('query/',OutputAPI.as_view())
]
