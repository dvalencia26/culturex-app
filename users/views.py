from django.shortcuts import render
from rest_framework.generics import GenericAPIView
from .serializers import LoginSerializer, UserRegisterSerializer, PasswordResetRequestSerializer, SetNewPasswordSerializer, LogoutUserSerializer, ProfileSerializer
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .utils import send_code_via_email
from .models import OneTimePassword, User, Profile
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import smart_str, DjangoUnicodeDecodeError
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.middleware.csrf import get_token # To get the CSRF token
from django.conf import settings


class RegisterUserView(GenericAPIView):
    serializer_class = UserRegisterSerializer

    # Once we get the data from the frontend, we want to validate and create the user
    def post(self, request):
        user_data = request.data
        serializer = self.serializer_class(data=user_data)

        if serializer.is_valid(raise_exception=True):
            serializer.save()
            user = serializer.data # Get the created user data
            send_code_via_email(user['email']) # Note: In production, use celery to send emails asynchronously

            return Response({
                'data': user,
                'message': f'Hi {user["first_name"]}, Thanks for signing up! Please check your email for verification.'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyUserEmail(GenericAPIView):
    def post(self, request):
        otpcode = request.data.get('otp')
        try:
            # Get the user associated with the OTP unique code
            user_code_obj= OneTimePassword.objects.get(code=otpcode) 
            user = user_code_obj.user
            if not user.is_verified:
                user.is_verified = True
                user.save()
                return Response({
                    'message': 'Email verified successfully!'
                }, status=status.HTTP_200_OK)
            # If the user is already verified
            return Response({
                'message': 'Invalid code. Email is already verified.'
            }, status=status.HTTP_204_NO_CONTENT)

        # The code does not exist, raise an error
        except OneTimePassword.DoesNotExist:
            return Response({
                'error': 'Invalid or expired OTP code.'
            }, status=status.HTTP_404_NOT_FOUND)


class LoginUserView(GenericAPIView):
    serializer_class = LoginSerializer  #Gets the data from the login form store in the serializer
    def post(self, request):
        response = Response()
        serializer=self.serializer_class(data=request.data, context={'request': request, 'response': response}) # Pass the request and response context to the serializer
        serializer.is_valid(raise_exception=True)
        response.data = serializer.data
        response.status_code = status.HTTP_200_OK
        return response
    

class PasswordResetRequestView(GenericAPIView):
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        return Response({
            'message': 'Password reset link sent to your email.'
        }, status=status.HTTP_200_OK)
    

class PasswordResetConfirm(GenericAPIView):
    def get(self, request, uidb64, token):
        # We check the token is valid and only use once
        try:
            user_id = smart_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(id=user_id)
            if not PasswordResetTokenGenerator().check_token(user, token):
                return Response({'message': 'Token is not valid or has expired, please request a new one.'}, status=status.HTTP_401_UNAUTHORIZED)
            return Response({'success': True, 'message': 'Credentials valid', 'uidb64': uidb64, 'token': token}, status=status.HTTP_200_OK)
        
        except (DjangoUnicodeDecodeError):
            return Response({'message': 'Token is not valid or has expired'}, status=status.HTTP_401_UNAUTHORIZED) 
        
class SetNewPassword(GenericAPIView):
    serializer_class = SetNewPasswordSerializer

    # We use patch in order to update the password
    def patch(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'message': 'Password reset successful.'
        }, status=status.HTTP_200_OK)   
    
class LogoutUserView(GenericAPIView):
    serializer_class = LogoutUserSerializer

    def post(self, request):
        response = Response()
        serializer = self.serializer_class(data=request.data, context={'request': request, 'response': response})

        # Don't raise exception on validation failure - just clear cookies
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except Exception:
            # If validation fails, still clear cookies
            response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
            response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])

        response.status_code = status.HTTP_204_NO_CONTENT
        return response


class CookieTokenRefreshView(GenericAPIView):
    """
    Custom TokenRefreshView that reads refresh token from HTTPOnly cookie
    instead of request body. Inherits from GenericAPIView to avoid any
    authentication requirements from TokenRefreshView.
    """

    def post(self, request, *args, **kwargs):
        # The refresh token is stored in the cookie and is used to generate a new access token
        # If the refresh token is not found in the cookie, return a 401 error
        # This allows the user to refresh the token even if the refresh token is not in the request body
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH']) 

        if not refresh_token:
            return Response({
                'error': 'Refresh token not found in cookies'
            }, status=status.HTTP_401_UNAUTHORIZED)

        try:
            # Create a token instance from the refresh token string
            token = RefreshToken(refresh_token)

            # Generate new access token
            access_token = str(token.access_token)

            # Set the new access token in cookie
            response = Response({
                'access': access_token,
                'detail': 'Token refreshed successfully'
            })

            # Set new access token cookie
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=access_token,
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
            )

            return response

        except (TokenError, InvalidToken) as e:
            return Response({
                'error': 'Invalid or expired refresh token'
            }, status=status.HTTP_401_UNAUTHORIZED)


class VerifyUserView(GenericAPIView):
    # Simple view that checks authentication status
    # Returns user info if authenticated, or appropriate response if not

    def get(self, request):
        # if the user is not authenticated, return a 200 with authenticated False
        if not request.user or not request.user.is_authenticated:
            return Response({
                'authenticated': False
            }, status=status.HTTP_200_OK)

        # if the user is authenticated, return user info including username from profile
        user = request.user
        username = None
        
        # Try to get username from profile
        try:
            if hasattr(user, 'profile') and user.profile:
                username = user.profile.username
        except Exception:
            pass  # If profile doesn't exist, username stays None
            
        return Response({
            'id': user.id,
            'email': user.email,
            'full_name': user.get_full_name,
            'is_verified': user.is_verified,
            'username': username,  # Include username from profile
            'authenticated': True
        }, status=status.HTTP_200_OK)


class CSRFTokenView(GenericAPIView):
    '''
    This view is used to get the CSRF token from the backend API.
    Django's CSRF middleware will set the CSRF cookie when this view is accessed. 
    '''
    def get(self, request):
        # This will set the CSRF cookie and return the token in the response
        csrf_token = get_token(request)
        return Response({'csrf_token': csrf_token}, status=status.HTTP_200_OK)


# We're using a single view to handle both user ID and username lookups for profiles
# We use @api_view decorator to create function-based views, meaning we can define the allowed HTTP methods directly
@api_view(['GET'])
def get_user_profile_data(request, handle):
    try:
        profile = None # Set to None initially since we'll assign it later
        
        # Start by checking if the handle is numeric (user ID) or text (username)
        if handle.isdigit():
            # We get the profile by user ID
            profile = Profile.objects.select_related('user').get(user__id=handle)
        else:
            # Otherwise, we get the profile by username (user-friendly URLs)
            profile = Profile.objects.select_related('user').get(username=handle)
        
        # Serialize the profile
        serializer = ProfileSerializer(profile, many=False, context={'request': request})
        
        # Check if current user follows this profile
        following = False
        
        # Only check if the request user is authenticated and has a profile
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            try:
                my_profile = request.user.profile # Get current user's profile
                following = my_profile in profile.followers.all() # Check if my profile is following this profile
            except Profile.DoesNotExist:
                following = False
        
        # Return profile data
        return Response({
            **serializer.data,
            'is_our_profile': request.user == profile.user,
            'following': following
        }, status=status.HTTP_200_OK)
        
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['POST'])
def toggleFollow(request, handle):
    try:
        # Find the profile to follow/unfollow (by ID or username)
        if handle.isdigit():
            profile_to_follow = Profile.objects.get(user__id=handle)
        else:
            profile_to_follow = Profile.objects.get(username=handle)
        
        # Get current user's profile
        my_profile = request.user.profile
        
        # Toggle follow status
        if my_profile in profile_to_follow.followers.all():
            profile_to_follow.followers.remove(my_profile)
            return Response({'now_following': False}, status=status.HTTP_200_OK)
        else:
            profile_to_follow.followers.add(my_profile)
            return Response({'now_following': True}, status=status.HTTP_200_OK)
            
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)