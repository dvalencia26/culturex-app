from django.shortcuts import render
from rest_framework.generics import GenericAPIView
from .serializers import GoogleSignInSerializer
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

class GoogleOauthSignInview(GenericAPIView):
    serializer_class = GoogleSignInSerializer

    def post(self, request):
        response = Response()
        serializer = self.serializer_class(data=request.data, context={'request': request, 'response': response})
        
        try:
            # Validate Google token and get user data using the serializer
            serializer.is_valid(raise_exception=True) 
            data = serializer.validated_data  # Get the validated data from serializer that includes user info
            
            # Set HTTPOnly cookies for tokens 
            if 'access_token' in data:
                response.set_cookie(
                    key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                    value=data['access_token'],
                    httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                    secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                    samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                    path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                    max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
                )
            
            if 'refresh_token' in data:
                response.set_cookie(
                    key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
                    value=data['refresh_token'],
                    httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                    secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                    samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                    path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                    max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
                )
            
            # Return user data
            response.data = {
                'email': data.get('email'),
                'full_name': data.get('full_name'),
                'message': 'Google authentication successful'
            }
            response.status_code = status.HTTP_200_OK
            
            return response
            
        except Exception as e:
            # Only check serializer errors if validation was attempted
            if hasattr(serializer, '_validated_data'):
                print(f"Serializer errors: {serializer.errors}")
            return Response({
                'error': 'Google authentication failed',
                'detail': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
