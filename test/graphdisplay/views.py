from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
import plotly.io as pio
from .models import *
import time
import json


def HomePage(request):
    return render(request,"home.html")
def BotPage(request):
    return render(request,'bot.html')
class OutputAPI(APIView):
    def post(self,request):
        
        user_input = request.data.get("userinput")
        # bot_output=pio.read_json("static/assets/Show.json")
        # bot_output=bot_output.to_html(full_html=False, include_plotlyjs='cdn')
        # if not user_input:
        #     return Response({"error": "No input provided"}, status=400)
        
        # Chat.objects.create(user_input=user_input,answer=bot_output)
        # time.sleep(1.1)
        # # bot_html = bot_output.to_html(full_html=False)
        # return Response({"userinput": user_input,"bot_output":bot_output})