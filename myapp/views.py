from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import login, logout
from .models import User, DashboardData, ChatMessage, LocationData
from .serializers import *
from .agent import func
from .rag import rag_service
import os
import json

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'message': 'Logout successful'})

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        try:
            user = serializer.save()
            login(request, user)
            return Response({
                'message': 'User created successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'error': 'Validation failed',
        'details': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def current_user(request):
    if request.user.is_authenticated:
        return Response(UserSerializer(request.user).data)
    return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

class DashboardDataViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DashboardDataSerializer
    
    def get_queryset(self):
        return DashboardData.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def generate_visualization(self, request):
        """Generate visualization using the agent function"""
        try:
            query = request.data.get('query', '')
            filename = request.data.get('filename', f'user_{request.user.id}')
            
            if not query:
                return Response({
                    'error': 'Query is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"Processing agent request from user {request.user.id}: {query}")
            
            # Call your agent function - this connects to floatai.py -> datadb.py
            result = func(query, filename)
            
            # Check if JSON file was created and return the data
            json_filename = f'{filename}.json'
            response_data = {
                'message': 'Visualization processed successfully',
                'query': query,
                'agent_response': str(result)
            }
            
            if os.path.exists(json_filename):
                with open(json_filename, 'r') as f:
                    chart_data = json.load(f)
                
                print(f"Chart data generated successfully for query: {query}")
                
                # Save to DashboardData
                dashboard_data = DashboardData.objects.create(
                    user=request.user,
                    query=query,
                    chart_data=chart_data,
                    filename=filename
                )
                
                response_data.update({
                    'data': DashboardDataSerializer(dashboard_data).data,
                    'chart_data': chart_data,
                    'id': dashboard_data.id
                })
            else:
                print(f"No chart file created for query: {query}")
            
            return Response(response_data)
                
        except Exception as e:
            print(f"Error in generate_visualization: {str(e)}")
            return Response({
                'error': f'Error generating visualization: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def ai_chat(self, request):
        """AI chat endpoint"""
        user_query = request.query_params.get('query', '')
        if not user_query:
            return Response({'error': 'Query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            print(f"AI Chat request from user {request.user.id}: {user_query}")
            response = func(user_query, f'chat_{request.user.id}')
            return Response({
                'response': str(response),
                'query': user_query
            })
        except Exception as e:
            print(f"Error in ai_chat: {str(e)}")
            return Response({
                'error': f'AI chat error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # NEW: RAG Chat endpoint - added without changing existing code
    @action(detail=False, methods=['post'])
    def rag_chat(self, request):
        """RAG-based chat endpoint for LiveMapView"""
        try:
            user_query = request.data.get('query', '')
            if not user_query:
                return Response({
                    'error': 'Query is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            print(f"RAG Chat request from user {request.user.id}: {user_query}")
            
            # Use RAG service for response
            rag_response = rag_service.query(user_query)
            
            # Create chat message record
            chat_message = ChatMessage.objects.create(
                user=request.user,
                message=user_query,
                response=rag_response
            )
            
            return Response({
                'response': rag_response,
                'query': user_query,
                'message_id': chat_message.id
            })
            
        except Exception as e:
            print(f"Error in rag_chat: {str(e)}")
            return Response({
                'error': f'RAG chat error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChatMessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatMessageSerializer
    
    def get_queryset(self):
        return ChatMessage.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        user_message = serializer.validated_data['message']
        
        try:
            # Use agent for AI responses instead of echo
            response = func(user_message, f'chat_{self.request.user.id}')
            response_text = str(response)
        except Exception as e:
            response_text = f"Error: {str(e)}"
        
        serializer.save(
            user=self.request.user,
            response=response_text
        )
    
    @action(detail=False, methods=['post'])
    def send_message(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LocationDataViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LocationDataSerializer
    
    def get_queryset(self):
        return LocationData.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)