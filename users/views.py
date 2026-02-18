from django.shortcuts import render
from rest_framework.generics import GenericAPIView
from .serializers import (LoginSerializer, UserRegisterSerializer, PasswordResetRequestSerializer,
                          SetNewPasswordSerializer, LogoutUserSerializer, ProfileSerializer, ProfileUpdateSerializer, PostSerializer, PostDetailSerializer,
                          RecommendationCategorySerializer, PostRecommendationSerializer,
                          ThreadCategorySerializer, ThreadSubcategorySerializer, ThreadSerializer, ThreadReplySerializer, UserSearchSerializer)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .utils import send_code_via_email
from .models import OneTimePassword, User, Profile, Post, PostSummary, RecommendationCategory, PostRecommendation, ThreadCategory, ThreadSubcategory, Thread, ThreadReply
from .extract_text_for_ai import extract_text_from_editorjs, compute_content_hash
from .ai_summarizer import summarize_with_gemini, SummaryGenerationError
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import smart_str, DjangoUnicodeDecodeError
from django.utils import timezone
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.middleware.csrf import get_token # To get the CSRF token
from django.conf import settings
from django.db import models
from django.db.models import CharField
from django.db.models.functions import Lower
from cities_light.models import Country, City
from django_countries import countries as django_countries
from django.db.models import Count
from botocore.config import Config
import uuid # For generating unique identifiers
import boto3
import json
import logging

logger = logging.getLogger(__name__) # use logger to log errors and info

# Custom database function for unaccent when filtering city names
class Unaccent(models.Func):
    """PostgreSQL unaccent function"""
    function = 'unaccent'
    template = "%(function)s(%(expressions)s)"
    output_field = CharField()

# Presigned upload configuration for different upload types
UPLOAD_CONFIG = {
    'posts': {
        'prefix': 'posts',
        'with_thumb': True,
        'max_mb': 10,
        'thumb_mb': 1,
        'include_media_prefix': False,
    },
    'profile': {
        'prefix': 'profile_images',
        'with_thumb': False,
        'max_mb': 10,
        'thumb_mb': None,
        'include_media_prefix': True,
    },
}

ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
EXT_MAP = {'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}


def _build_object_key(prefix, user_id, file_uuid, ext, include_media_prefix, is_thumb=False):
    suffix = '_thumb' if is_thumb else ''
    relative_name = f"{prefix}/{user_id}/{file_uuid}{suffix}.{ext}" # ex: posts/123/uuid_thumb.jpg
    if include_media_prefix:
        object_key = f"media/{relative_name}"
    else:
        object_key = relative_name
    return relative_name, object_key


def _generate_presigned_post(s3_client, bucket_name, object_key, content_type, max_bytes):
    return s3_client.generate_presigned_post(
        Bucket=bucket_name,
        Key=object_key,
        Fields={
            'Content-Type': content_type,
            'acl': 'public-read',
        },
        Conditions=[
            {'Content-Type': content_type},
            {'acl': 'public-read'},
            ['content-length-range', 1, max_bytes],
        ],
        ExpiresIn=120
    )


def _presign_upload_payload(request, upload_type):
    config = UPLOAD_CONFIG.get(upload_type)
    if not config:
        return None, Response({'error': 'Invalid upload type'}, status=status.HTTP_400_BAD_REQUEST)

    content_type = request.data.get('content_type', 'image/jpeg')
    if content_type not in ALLOWED_TYPES:
        return None, Response(
            {'error': f'Invalid content type. Allowed: {", ".join(ALLOWED_TYPES)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    ext = EXT_MAP.get(content_type, 'jpg') # Default to jpg if not found
    file_uuid = uuid.uuid4()
    user_id = request.user.id

    try:
        s3_client = boto3.client(
            's3',
            region_name=settings.AWS_S3_REGION_NAME,
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        cdn_base = f"https://{settings.AWS_S3_CDN_DOMAIN}"

        relative_name, object_key = _build_object_key(
            config['prefix'],
            user_id,
            file_uuid,
            ext,
            config['include_media_prefix']
        )

        original_presigned = _generate_presigned_post(
            s3_client,
            bucket_name,
            object_key,
            content_type,
            config['max_mb'] * 1024 * 1024
        )

        if config['with_thumb']:
            _, thumb_key = _build_object_key(
                config['prefix'],
                user_id,
                file_uuid,
                ext,
                config['include_media_prefix'],
                is_thumb=True
            )
            thumb_presigned = _generate_presigned_post(
                s3_client,
                bucket_name,
                thumb_key,
                content_type,
                config['thumb_mb'] * 1024 * 1024
            )

            payload = {
                'original': {
                    'key': object_key,
                    'upload': original_presigned,
                    'url': f"{cdn_base}/{object_key}"
                },
                'thumb': {
                    'key': thumb_key,
                    'upload': thumb_presigned,
                    'url': f"{cdn_base}/{thumb_key}"
                }
            }
        else:
            payload = {
                'upload': original_presigned,
                'url': f"{cdn_base}/{object_key}",
                'name': relative_name,
                'key': object_key
            }

        return payload, None

    except Exception as e:
        print(f"Presign error: {e}")
        return None, Response(
            {'error': 'Failed to generate upload URL'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class RegisterUserView(GenericAPIView):
    serializer_class = UserRegisterSerializer

    # Once we get the data from the frontend, we want to validate and create the user
    def post(self, request):
        user_data = request.data
        serializer = self.serializer_class(data=user_data)

        if serializer.is_valid(raise_exception=True):
            serializer.save()
            user = serializer.data # Get the created user data
            email_sent, error = send_code_via_email(user['email']) # Note: In production, use celery to send emails asynchronously

            return Response({
                'data': user,
                'message': (
                    f'Hi {user["first_name"]}, Thanks for signing up! Please check your email for verification.'
                    if email_sent else
                    f'Hi {user["first_name"]}, Thanks for signing up! Verification email could not be sent yet.'
                )
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyUserEmail(GenericAPIView):
    def post(self, request):
        otpcode = request.data.get('otp')
        email = request.data.get('email')
        try:
            if not email:
                return Response({
                    'error': 'Email is required.'
                }, status=status.HTTP_400_BAD_REQUEST)

            user = User.objects.get(email=email)
            user_code_obj = OneTimePassword.objects.get(user=user)

            if user_code_obj.expires_at < timezone.now():
                user_code_obj.delete()
                return Response({
                    'error': 'OTP has expired. Please request a new one.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if user_code_obj.attempts >= 3:
                user_code_obj.delete()
                return Response({
                    'error': 'Too many attempts. Please request a new OTP.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if user_code_obj.code != otpcode:
                user_code_obj.attempts += 1
                user_code_obj.save(update_fields=['attempts'])
                return Response({
                    'error': 'Invalid OTP code.'
                }, status=status.HTTP_400_BAD_REQUEST)

            if not user.is_verified:
                user.is_verified = True
                user.save()
                user_code_obj.delete()
                return Response({
                    'message': 'Email verified successfully!'
                }, status=status.HTTP_200_OK)
            # If the user is already verified
            return Response({
                'message': 'Invalid code. Email is already verified.'
            }, status=status.HTTP_204_NO_CONTENT)

        # The code does not exist, raise an error
        except (OneTimePassword.DoesNotExist, User.DoesNotExist):
            return Response({
                'error': 'Invalid or expired OTP code.'
            }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def resend_otp(request):
    email = request.data.get('email')
    website = request.data.get('website', '')

    if website:
        return Response({'error': 'Invalid submission.'}, status=status.HTTP_400_BAD_REQUEST)

    if not email:
        return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if user.is_verified:
        return Response({'message': 'Email already verified.'}, status=status.HTTP_200_OK)

    email_sent, error = send_code_via_email(email)
    if not email_sent:
        return Response({'error': error or 'Too many requests.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    return Response({'message': 'Verification code resent.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
def check_email_availability(request):
    email = request.GET.get('email', '').strip().lower()
    if not email:
        return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    exists = User.objects.filter(email__iexact=email).exists()
    return Response({'available': not exists}, status=status.HTTP_200_OK)


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
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_verified': user.is_verified,
            'username': username,  # Include username from profile
            'authenticated': True
        }, status=status.HTTP_200_OK)


class MeView(GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.profile
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProfileSerializer(profile, many=False, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


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


class ProfileUpdateView(GenericAPIView):
    serializer_class = ProfileUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_profile(self, handle):
        if handle.isdigit():
            return Profile.objects.select_related('user').get(user__id=handle)
        return Profile.objects.select_related('user').get(username=handle)

    def patch(self, request, handle):
        return self._update(request, handle, partial=True)

    def put(self, request, handle):
        return self._update(request, handle, partial=False)

    def _update(self, request, handle, partial):
        try:
            profile = self.get_profile(handle)
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user != profile.user:
            return Response({'error': 'You can only edit your own profile'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.serializer_class(profile, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            response_serializer = ProfileSerializer(profile, many=False, context={'request': request})
            return Response({
                **response_serializer.data,
                'is_our_profile': True,
                'following': False
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
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


# POST VIEWS
@api_view(['GET', 'POST'])
def post_list_create(request):
    """
    GET: List of all posts (from everyone)
    POST: Create a new post (authenticated users only)
    """
     # Anyone can view published posts 
    if request.method == 'GET':
       
        # Select_related() is use for foreign key relationships to optimize queries
        # BASE QUERY: Gets all 
        posts = Post.objects.select_related(
            'user__profile', 'primary_city'
        ).filter(status=Post.Status.PUBLISHED).order_by('-created_at') # Newest posts first
        
        # Extract filters 
        country = request.GET.get('country')              # Country code: EC, BR, US
        city = request.GET.get('city')                    # City ID: 123
        city_slug = request.GET.get('city_slug')          # City slug: quito, sao-paulo
        location_scope = request.GET.get('location_scope') # none, country, city
        author = request.GET.get('author')                # Username
        search = request.GET.get('search')                # Text search
        include_related = request.GET.get('include_related', 'false').lower() == 'true'

        # LOCATION FILTERING LOGIC
        if country and (city or city_slug):
            # Specific city posts only
            if city_slug:
                # Filter by city slug
                posts = posts.filter(
                    primary_city__slug=city_slug,
                    primary_city__country__code2=country
                )
            else:
                # Filter by city ID
                posts = posts.filter(primary_city__id=city)
            
        elif country and not city and not city_slug:
            if include_related:
                # All posts related to this country (country posts + city posts in this country)
                posts = posts.filter(
                    models.Q(primary_country=country) |  # Country posts about this country
                    models.Q(primary_city__country__code2=country)  # City posts in this country
                )
            else:
                # Only country-level posts about this country
                posts = posts.filter(
                    primary_country=country,
                    location_scope='country'
                )
                
        elif (city or city_slug) and not country:
            # Specific city posts only
            if city_slug:
                posts = posts.filter(primary_city__slug=city_slug)
            else:
                posts = posts.filter(primary_city__id=city)
            
        elif location_scope:
            # Filter by location scope only
            posts = posts.filter(location_scope=location_scope)
        
        # OTHER FILTERS
        if author:
            posts = posts.filter(user__profile__username=author)
            
        if search:
            # Search in title and content
            posts = posts.filter(
                models.Q(title__icontains=search) | 
                models.Q(content__icontains=search)
            )
        
        # Implement pagination for handling large datasets
        limit = int(request.GET.get('limit', 20))  # Default 20 posts
        offset = int(request.GET.get('offset', 0))  # offset=0 means start at the beginning of the list
        
        total_count = posts.count() # Total posts after filtering
        posts = posts[offset:offset + limit] # Paginate the posts
        
        # Serialize the posts
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response({
            'posts': serializer.data,
            'count': len(serializer.data),
            'total': total_count,
            'has_more': offset + limit < total_count,
            'filters': {
                'country': country,
                'city': city,
                'location_scope': location_scope,
                'include_related': include_related,
                'author': author,
                'search': search
            }
        }, status=status.HTTP_200_OK)

    # Handle POST request
    elif request.method == 'POST':
        # Only authenticated users can create posts
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required to create posts'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Create a new post
        serializer = PostSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            # Save the post with the current user as author
            post = serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_user_posts(request, username):
    """Get all published posts by a specific user"""
    try:
        # Get posts by username. 
        posts = Post.objects.select_related(
            'user__profile', 'primary_city', 
        ).filter(
            user__profile__username=username,
            status=Post.Status.PUBLISHED
        ).order_by('-created_at')
        
        # Check if any posts exist for this user
        if not posts.exists():
            return Response({
                'posts': [],
                'count': 0,
                'message': f'No posts found for user @{username}'
            }, status=status.HTTP_200_OK)
        
        # Serialize the posts
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response({
            'posts': serializer.data,
            'count': posts.count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Error fetching user posts'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def post_detail(request, username, slug):
    """
    GET: Retrieve a specific post by username and slug (public access for published posts)
    PUT/PATCH: Update a post, only author can update (requires authentication)
    DELETE: Delete a post, only author can delete (requires authentication)
    """
    try:
        # Get the post by username and slug
        post = Post.objects.select_related(
            'user__profile', 'primary_city', 'summary',
        ).prefetch_related(
            'recommendations__category'
        ).get(user__profile__username=username, slug=slug)
        
        # Check permissions for viewing
        if post.status != Post.Status.PUBLISHED:
            # Only allow authenticated author to view unpublished posts
            if not request.user.is_authenticated or request.user != post.user:
                return Response({
                    'error': 'Post not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        if request.method == 'GET':
            # GET is public for published posts, no authentication required
            serializer = PostDetailSerializer(post, context={'request': request}) #Return detailed post info with summary
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        # For PUT, PATCH, DELETE - require authentication
        if not request.user.is_authenticated:
            return Response({
                'error': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if user is the author
        if request.user != post.user:
            return Response({
                'error': 'You do not have permission to modify this post'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if request.method in ['PUT', 'PATCH']:
            # Update the post
            partial = request.method == 'PATCH'
            previous_content_hash = compute_content_hash(post.content)
            serializer = PostSerializer(
                post, 
                data=request.data, 
                partial=partial,
                context={'request': request}
            )
            
            if serializer.is_valid():
                updated_post = serializer.save()
                current_content_hash = compute_content_hash(updated_post.content)

                # If content has changed, mark summary as stale
                if previous_content_hash != current_content_hash:
                    try:
                        summary_obj = updated_post.summary
                    except PostSummary.DoesNotExist:
                        summary_obj = None

                    if summary_obj:
                        summary_obj.status = PostSummary.Status.STALE
                        summary_obj.error_message = ''
                        summary_obj.save(update_fields=['status', 'error_message', 'updated_at'])

                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            # Delete the post
            post.delete()
            return Response({
                'message': 'Post deleted successfully'
            }, status=status.HTTP_204_NO_CONTENT)
            
    except Post.DoesNotExist:
        return Response({
            'error': 'Post not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Error: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def summarize_post(request, post_id):
    # Unique request ID for logging and tracking purposes. 
    # This helps correlate logs and responses for this specific summary generation request.
    request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4()) 

    try:
        # Get the post by ID
        post = Post.objects.select_related('summary').get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only published posts can be summarized
    if post.status != Post.Status.PUBLISHED:
        return Response(
            {'error': 'Only published posts can be summarized.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Extract text from EditorJS content using utility function (extract_text_for_ai.py)
    extracted_text = extract_text_from_editorjs(post.content)
    if not extracted_text:
        return Response(
            {'error': 'No summarizeable text found in this post.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check for existing summary or create a new one
    summary_obj, _ = PostSummary.objects.get_or_create(post=post)
    current_content_hash = compute_content_hash(post.content) # Hash of current content

    if (
        summary_obj.status == PostSummary.Status.READY
        and summary_obj.content_hash == current_content_hash # Content hasn't changed
        and summary_obj.summary # Summary exists
    ):
        # Return cached summary
        return Response({
            'post_id': post.id,
            'summary': summary_obj.summary,
            'summary_status': summary_obj.status,
            'generated_at': summary_obj.generated_at,
            'model_used': summary_obj.model_name or settings.GEMINI_MODEL,
            'source': 'cache',
        }, status=status.HTTP_200_OK)

    try:
        # otherwise, generate a new summary using Gemini
        summary_result = summarize_with_gemini(
            title=post.title,
            text=extracted_text,
            post_id=post.id,
            request_id=request_id,
        )
        generated_summary = summary_result['summary']
        model_used = summary_result['model_used']
    except SummaryGenerationError as exc:
        logger.warning(
            "Summary generation failed request_id=%s post_id=%s error_code=%s model_used=%s http_status=%s",
            request_id,
            post.id,
            exc.error_code,
            exc.model_used,
            exc.http_status,
        )

        summary_obj.status = PostSummary.Status.FAILED
        summary_obj.error_message = exc.backend_message[:1000]
        summary_obj.save(update_fields=['status', 'error_message', 'updated_at'])

        response_payload = {
            'error': exc.user_message,
            'error_code': exc.error_code,
            'model_used': exc.model_used,
            'request_id': request_id,
        }
        if exc.retry_after_seconds is not None:
            response_payload['retry_after_seconds'] = exc.retry_after_seconds
        if settings.DEBUG:
            response_payload['detail'] = exc.backend_message
            if exc.provider_error_message:
                response_payload['provider_error_message'] = exc.provider_error_message

        response_status = exc.http_status or status.HTTP_502_BAD_GATEWAY
        return Response(response_payload, status=response_status)
    except Exception as exc:
        logger.exception("Gemini summary generation failed for post_id=%s request_id=%s", post.id, request_id)
        detailed_error = str(exc).strip() or "Unknown Gemini error"
        summary_obj.status = PostSummary.Status.FAILED
        summary_obj.error_message = detailed_error[:1000]
        summary_obj.save(update_fields=['status', 'error_message', 'updated_at'])

        response_payload = {
            'error': 'Unable to generate summary right now. Please try again later.',
            'error_code': 'PROVIDER_ERROR',
            'request_id': request_id,
        }
        if settings.DEBUG:
            response_payload['detail'] = detailed_error
        return Response(
            response_payload,
            status=status.HTTP_502_BAD_GATEWAY
        )

    # Save the new summary
    summary_obj.summary = generated_summary 
    summary_obj.content_hash = current_content_hash
    summary_obj.status = PostSummary.Status.READY
    summary_obj.model_name = model_used
    summary_obj.error_message = ''
    summary_obj.generated_at = timezone.now()
    summary_obj.save()

    return Response({
        'post_id': post.id,
        'summary': summary_obj.summary,
        'summary_status': summary_obj.status,
        'generated_at': summary_obj.generated_at,
        'model_used': summary_obj.model_name,
        'request_id': request_id,
        'source': 'generated',
    }, status=status.HTTP_200_OK)


# RECOMMENDATION VIEWS
@api_view(['GET'])
def recommendation_category_list(request):
    """Get all active recommendation categories"""
    categories = RecommendationCategory.objects.filter(is_active=True)
    serializer = RecommendationCategorySerializer(categories, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
def post_recommendations_list_create(request, post_id):
    """
    GET: List all recommendations for a post (public)
    POST: Create a new recommendation (only for post author)
    """
    try:
        post = Post.objects.select_related('user').get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        recommendations = PostRecommendation.objects.filter(
            post=post
        ).select_related('category').order_by('display_order', 'created_at')
        serializer = PostRecommendationSerializer(recommendations, many=True, context={'request': request})
        return Response({
            'recommendations': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        if request.user != post.user:
            return Response({'error': 'Only the post author can add recommendations'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PostRecommendationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(post=post)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def post_recommendation_detail(request, recommendation_id):
    """
    GET: Retrieve a specific recommendation
    (Only post authors can update or delete their recommendations, but anyone can view them as part of the post details)
    PUT/PATCH: Update a recommendation
    DELETE: Delete a recommendation
    """
    try:
        recommendation = PostRecommendation.objects.select_related('post__user', 'category').get(id=recommendation_id)
    except PostRecommendation.DoesNotExist:
        return Response({'error': 'Recommendation not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = PostRecommendationSerializer(recommendation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.user != recommendation.post.user:
        return Response({'error': 'Only the post author can modify recommendations'}, status=status.HTTP_403_FORBIDDEN)

    if request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = PostRecommendationSerializer(
            recommendation, data=request.data, partial=partial, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        recommendation.delete()
        return Response({'message': 'Recommendation deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def post_recommendations_bulk_create(request, post_id):
    """
    This create multiple recommendations for a post in a single request.
    """
    try:
        post = Post.objects.select_related('user').get(id=post_id)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != post.user:
        return Response({'error': 'Only the post author can add recommendations'}, status=status.HTTP_403_FORBIDDEN)

    recommendations_data = request.data.get('recommendations', [])
    if not recommendations_data:
        return Response({'error': 'No recommendations provided'}, status=status.HTTP_400_BAD_REQUEST)

    created = []
    errors_list = []
    for i, rec_data in enumerate(recommendations_data):
        serializer = PostRecommendationSerializer(data=rec_data, context={'request': request})
        if serializer.is_valid():
            serializer.save(post=post)
            created.append(serializer.data)
        else:
            errors_list.append({'index': i, 'errors': serializer.errors})

    if errors_list:
        return Response({
            'created': created,
            'errors': errors_list,
            'message': f'{len(created)} created, {len(errors_list)} failed'
        }, status=status.HTTP_207_MULTI_STATUS)

    return Response({
        'recommendations': created,
        'count': len(created)
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_posts(request):
    """Get all posts by the current authenticated user (including drafts)"""
    try:
        # Get all posts by current user (including drafts)
        posts = Post.objects.select_related(
            'user__profile', 'primary_city', 
        ).filter(user=request.user).order_by('-created_at')
        
        # Optional status filtering
        status_filter = request.GET.get('status')
        if status_filter:
            posts = posts.filter(status=status_filter)
        
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response({
            'posts': serializer.data,
            'count': posts.count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Error fetching your posts'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Location Data Endpoints
@api_view(['GET'])
def get_countries_for_posts(request):
    """Get countries based on location scope with filtering"""
    try:
        location_scope = request.GET.get('location_scope', 'country')
        
        if location_scope == 'city':
            # For city posts: get only countries that have cities in database
            countries = Country.objects.filter(
                city__isnull=False
            ).distinct().order_by('name')
            
            countries_data = [{
                'code': country.code2,
                'name': country.name
            } for country in countries]
        else:
            # For country posts
            countries_data = [{
                'code': code,
                'name': name
            } for code, name in django_countries]
        
        return Response({
            'countries': countries_data,
            'count': len(countries_data),
            'location_scope': location_scope
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Error fetching countries: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_countries_with_posts(request):
    """Get countries that have published posts"""
    try:
        # Get unique countries from published posts
        countries_with_posts = Post.objects.filter(
            status=Post.Status.PUBLISHED,
            primary_country__isnull=False
        ).values_list('primary_country', flat=True).distinct()
        
        # Convert country codes to country names using django_countries
        countries_data = []
        for country_code in countries_with_posts:
            try:
                country_name = dict(django_countries)[country_code]
                countries_data.append({
                    'code': country_code,
                    'name': country_name
                })
            except KeyError:
                # Skip invalid country codes
                continue
        
        # Sort by country name
        countries_data.sort(key=lambda x: x['name'])
        
        return Response({
            'countries': countries_data,
            'count': len(countries_data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Error fetching countries with posts: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_country_previews(request):
    """
    Get countries with preview posts (latest 4 posts with images per country).
    Used for the home page country grid display.
    """
    limit = int(request.GET.get('limit', 4))  # Number of posts per country
    
    try:
        # Get unique countries from published posts
        countries_with_posts = Post.objects.filter(
            status=Post.Status.PUBLISHED,
            primary_country__isnull=False
        ).values_list('primary_country', flat=True).distinct()
        
        result = [] # List to hold country previews
        
        for country_code in countries_with_posts:
            try:
                country_name = dict(django_countries)[country_code]
            except KeyError:
                continue
            
            # Get latest posts for this country with related data
            posts = Post.objects.select_related(
                'user__profile', 'primary_city'
            ).filter(
                status=Post.Status.PUBLISHED,
                primary_country=country_code
            ).order_by('-created_at')[:limit * 2]  # Fetch extra to account for posts without images
            
            # Serialize posts and filter for those with images
            serializer = PostSerializer(posts, many=True, context={'request': request})
            preview_posts = []
            
            for post_data in serializer.data:
                # Stop if we reached the limit
                if len(preview_posts) >= limit:
                    break
                
                # Only include posts with thumbnails
                if post_data.get('thumbnailUrl'):
                    preview_posts.append({
                        'id': post_data['id'],
                        'slug': post_data['slug'],
                        'title': post_data['title'],
                        'author_username': post_data['author_username'],
                        'thumbnailUrl': post_data['thumbnailUrl'],
                        'created_at': post_data['created_at']
                    })
            
            # Only include countries that have at least one post with an image
            if preview_posts:
                result.append({
                    'countryCode': country_code,
                    'countryName': country_name,
                    'previewPosts': preview_posts
                })
        
        # Sort by country name
        result.sort(key=lambda x: x['countryName'])
        
        return Response({
            'countries': result,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Error fetching country previews: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_cities_with_posts_by_country(request, country_code):
    """Get cities that have posts in a specific country"""
    try:
        # Get cities that have published city-specific posts in this country
        cities_with_posts = Post.objects.filter(
            status=Post.Status.PUBLISHED,
            location_scope='city',
            primary_city__country__code2=country_code
        ).values_list('primary_city', flat=True).distinct()
        
        # Get city details
        cities = City.objects.filter(
            id__in=cities_with_posts
        ).select_related('country').order_by('name')
        
        cities_data = [{
            'id': city.id,
            'name': city.name,
            'slug': city.name.lower().replace(' ', '-'),
            'country_code': city.country.code2
        } for city in cities]
        
        return Response({
            'cities': cities_data,
            'count': len(cities_data),
            'country_code': country_code.upper()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Error fetching cities with posts: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_cities_by_country(request, country_code):
    """City filtering with accent-insensitive search and pagination"""
    
    try:
        # Get search query
        search = request.GET.get('search', '').strip()
        limit = min(int(request.GET.get('limit', 50)), 200)  # Max 200 cities
        
        # Base query
        cities = City.objects.filter(
            country__code2=country_code
        ).select_related('region', 'country')
        
        # Apply search filter with accent-insensitive matching and priority ordering
        if search:
            # Use custom Unaccent function for accent-insensitive search
            # This allows "brasilia" to match "Brasília"
            cities = cities.annotate(
                unaccented_name=Unaccent(Lower('name'))
            ).filter(
                unaccented_name__icontains=search.lower()
            ).order_by(
                # Prioritize cities that start with the search term (accent-insensitive)
                models.Case(
                    models.When(unaccented_name__istartswith=search.lower(), then=models.Value(0)),
                    default=models.Value(1),
                    output_field=models.IntegerField()
                ),
                'name'  # Then alphabetical
            )
        else:
            # When no search, just order alphabetically
            cities = cities.order_by('name')
        
        # Pagination
        cities = cities[:limit] # Paginated slice
        
        cities_data = [{
            'id': city.id,
            'name': city.name,
            'display_name': city.name 
        } for city in cities]
        
        return Response({
            'cities': cities_data,
            'search': search,
            'country_code': country_code
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Error fetching cities: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# THREAD VIEWS

# Thread Category Views
@api_view(['GET'])
def thread_category_list(request):
    """Get all active thread categories"""
    try:
        categories = ThreadCategory.objects.filter(is_active=True).prefetch_related('subcategories')
        serializer = ThreadCategorySerializer(categories, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def thread_category_detail(request, slug):
    """Get a specific thread category by slug"""
    try:
        category = ThreadCategory.objects.get(slug=slug, is_active=True)
        serializer = ThreadCategorySerializer(category, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except ThreadCategory.DoesNotExist:
        return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Thread Subcategory Views
@api_view(['GET'])
def thread_subcategory_list(request, category_slug):
    """Get all active subcategories for a specific category"""
    try:
        category = ThreadCategory.objects.get(slug=category_slug, is_active=True)
        subcategories = ThreadSubcategory.objects.filter(category=category, is_active=True)
        serializer = ThreadSubcategorySerializer(subcategories, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except ThreadCategory.DoesNotExist:
        return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Thread Views
@api_view(['GET', 'POST'])
def thread_list_create(request):
    """
    GET: List all threads with filtering options
    POST: Create a new thread (authenticated users only)
    """
    if request.method == 'GET':
        try:
            # Base query
            threads = Thread.objects.select_related(
                'author__profile', 'category', 'subcategory'
            ).prefetch_related('replies').all().order_by('-is_pinned', '-created_at')
            
            # Filters
            category_slug = request.GET.get('category')
            subcategory_slug = request.GET.get('subcategory')
            country = request.GET.get('country')
            author = request.GET.get('author')
            search = request.GET.get('search')
            is_pinned = request.GET.get('is_pinned')
            
            # Apply filters: Search by slugs, country code, author username, text search, pinned status
            if category_slug:
                threads = threads.filter(category__slug=category_slug)
            
            if subcategory_slug:
                threads = threads.filter(subcategory__slug=subcategory_slug)
            
            if country:
                # CountryField stores as 2-letter code (e.g., 'EC', 'US')
                threads = threads.filter(country=country.upper())
            
            if author:
                threads = threads.filter(author__profile__username=author)
            
            if search:
                threads = threads.filter(
                    models.Q(title__icontains=search) | 
                    models.Q(content__icontains=search)
                )
            
            if is_pinned:
                threads = threads.filter(is_pinned=is_pinned.lower() == 'true')
            
            # Pagination
            limit = int(request.GET.get('limit', 20))
            offset = int(request.GET.get('offset', 0))
            
            total_count = threads.count()
            threads = threads[offset:offset + limit]
            
            serializer = ThreadSerializer(threads, many=True, context={'request': request})
            
            return Response({
                'threads': serializer.data,
                'total_count': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            serializer = ThreadSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save(author=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_user_threads(request, username):
    """Get all threads by a specific user"""
    try:
        profile = Profile.objects.get(username=username)
        threads = Thread.objects.filter(author=profile.user).select_related(
            'category', 'subcategory'
        ).order_by('-created_at')
        
        # Pagination
        limit = int(request.GET.get('limit', 20))
        offset = int(request.GET.get('offset', 0))
        
        total_count = threads.count()
        threads = threads[offset:offset + limit]
        
        serializer = ThreadSerializer(threads, many=True, context={'request': request})
        
        return Response({
            'threads': serializer.data,
            'total_count': total_count,
            'limit': limit,
            'offset': offset,
            'has_more': (offset + limit) < total_count
        }, status=status.HTTP_200_OK)
        
    except Profile.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def thread_detail(request, username, slug):
    """
    GET: Retrieve a specific thread by username and slug
    PUT/PATCH: Update a thread (only author can update)
    DELETE: Delete a thread (only author can delete)
    """
    try:
        profile = Profile.objects.get(username=username)
        thread = Thread.objects.select_related('author__profile', 'category', 'subcategory').get(
            author=profile.user, slug=slug
        )
        
        if request.method == 'GET':
            # Increment view count
            thread.view_count += 1
            thread.save(update_fields=['view_count'])
            
            serializer = ThreadSerializer(thread, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method in ['PUT', 'PATCH']:
            # Only author can update
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user != thread.author:
                return Response({'error': 'You can only edit your own threads'}, status=status.HTTP_403_FORBIDDEN)
            
            # Check if thread is locked
            if thread.is_locked:
                return Response({'error': 'This thread is locked and cannot be edited'}, status=status.HTTP_403_FORBIDDEN)
            
            partial = request.method == 'PATCH'
            serializer = ThreadSerializer(thread, data=request.data, partial=partial, context={'request': request})
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            # Only author can delete
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user != thread.author:
                return Response({'error': 'You can only delete your own threads'}, status=status.HTTP_403_FORBIDDEN)
            
            thread.delete()
            return Response({'message': 'Thread deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
    
    except Profile.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Thread.DoesNotExist:
        return Response({'error': 'Thread not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_threads(request):
    """Get all threads by the current authenticated user"""
    try:
        threads = Thread.objects.filter(author=request.user).select_related(
            'category', 'subcategory'
        ).order_by('-created_at')
        
        # Pagination
        limit = int(request.GET.get('limit', 20))
        offset = int(request.GET.get('offset', 0))
        
        total_count = threads.count()
        threads = threads[offset:offset + limit]
        
        serializer = ThreadSerializer(threads, many=True, context={'request': request})
        
        return Response({
            'threads': serializer.data,
            'total_count': total_count,
            'limit': limit,
            'offset': offset,
            'has_more': (offset + limit) < total_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Thread Reply Views
@api_view(['GET', 'POST'])
def thread_reply_list_create(request, username, slug):
    """
    GET: Get all replies for a thread
    POST: Create a new reply (authenticated users only)
    """
    try:
        profile = Profile.objects.get(username=username)
        thread = Thread.objects.get(author=profile.user, slug=slug)
        
        if request.method == 'GET':
            # Get all top-level replies (no parent_reply)
            replies = ThreadReply.objects.filter(thread=thread, parent_reply=None).select_related(
                'author__profile'
            ).prefetch_related('child_replies').order_by('created_at')
            
            serializer = ThreadReplySerializer(replies, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Check if thread is locked
            if thread.is_locked:
                return Response({'error': 'This thread is locked and cannot receive new replies'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            serializer = ThreadReplySerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save(author=request.user, thread=thread)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    except Profile.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Thread.DoesNotExist:
        return Response({'error': 'Thread not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def thread_reply_detail(request, reply_id):
    """
    GET: Get a specific reply
    PUT/PATCH: Update a reply (only author can update)
    DELETE: Delete a reply (only author can delete)
    """
    try:
        reply = ThreadReply.objects.select_related('author__profile', 'thread').get(id=reply_id)
        
        if request.method == 'GET':
            serializer = ThreadReplySerializer(reply, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method in ['PUT', 'PATCH']:
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user != reply.author:
                return Response({'error': 'You can only edit your own replies'}, status=status.HTTP_403_FORBIDDEN)
            
            # Check if thread is locked
            if reply.thread.is_locked:
                return Response({'error': 'This thread is locked and replies cannot be edited'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            partial = request.method == 'PATCH'
            serializer = ThreadReplySerializer(reply, data=request.data, partial=partial, context={'request': request})
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user != reply.author:
                return Response({'error': 'You can only delete your own replies'}, status=status.HTTP_403_FORBIDDEN)
            
            reply.delete()
            return Response({'message': 'Reply deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
    
    except ThreadReply.DoesNotExist:
        return Response({'error': 'Reply not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_nested_replies(request, reply_id):
    """Get all nested replies (children) for a specific reply"""
    try:
        parent_reply = ThreadReply.objects.get(id=reply_id)
        child_replies = ThreadReply.objects.filter(parent_reply=parent_reply).select_related(
            'author__profile'
        ).order_by('created_at')
        
        serializer = ThreadReplySerializer(child_replies, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except ThreadReply.DoesNotExist:
        return Response({'error': 'Reply not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['GET'])
def popular_countries(request):
    """Get top countries with most threads"""
    limit = int(request.GET.get('limit', 5))
    try:
        # Annotate countries with thread counts
        country_thread_counts = Thread.objects.values('country').annotate(
            thread_count=Count('id')
        ).order_by('-thread_count')[:limit]  # Top 5 countries 
        
        countries_data = []
        for item in country_thread_counts:
            if item['country']:
                countries_data.append({
                    'code': item['country'],
                    'name': dict(django_countries).get(item['country'], 'Unknown'),
                    'thread_count': item['thread_count']
                })
        
        return Response({
            'countries': countries_data,
            'limit': limit
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['GET'])
def get_all_countries(request):
    """
    Get all countries. This endpoint is used for Post and Thread country selection dropdowns.
    """
    try:
        countries_data = [{
            'code': code,
            'name': name
        } for code, name in django_countries]
        
        return Response({
            'countries': countries_data,
            'count': len(countries_data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def presign_image_upload(request):
    """
    Generate presigned POST data for direct upload to DigitalOcean Spaces.
    Returns presigned data for both original and thumbnail.
    """
    payload, error_response = _presign_upload_payload(request, 'posts')
    if error_response:
        return error_response
    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def presign_profile_upload(request):
    """
    Generate presigned POST data for profile image upload to DigitalOcean Spaces.
    Returns presigned data and final URL for the uploaded image.
    """
    payload, error_response = _presign_upload_payload(request, 'profile')
    if error_response:
        return error_response
    return Response(payload)


@api_view(['GET'])
def search_users(request):
    """
    Search users by name or username.
    Query params:
        - q: Search query (searches first_name, last_name, and profile username)
        - limit: Number of results per page (default: 20, max: 50)
        - offset: Pagination offset (default: 0)
    Returns:
        - users: List of user data (id, username, full_name, profile_image, bio, social links)
        - total_count: Total matching users
        - has_more: Whether more results are available
    """
    try:
        # Get query parameters
        query = request.GET.get('q', '').strip()
        limit = min(int(request.GET.get('limit', 20)), 50)  # Max 50 per request
        offset = int(request.GET.get('offset', 0))
        
        # Base queryset - only verified users with profiles
        users = User.objects.filter(
            is_verified=True
        ).select_related('profile').exclude(
            profile__isnull=True
        )
        
        # Apply search filter if query provided
        if query:
            users = users.filter(
                models.Q(first_name__icontains=query) |
                models.Q(last_name__icontains=query) |
                models.Q(profile__username__icontains=query)
            )
            # Order by relevance: exact username match first, then by name
            users = users.order_by(
                models.Case(
                    models.When(profile__username__iexact=query, then=0),
                    models.When(first_name__iexact=query, then=1),
                    models.When(last_name__iexact=query, then=2),
                    default=3,
                    output_field=models.IntegerField()
                ),
                'first_name',
                'last_name'
            )
        else:
            # If no query, return latest users ordered by date joined
            users = users.order_by('-date_joined')
        
        # Get total count before pagination
        total_count = users.count()
        
        # Apply pagination
        users = users[offset:offset + limit]
        
        # Serialize results
        serializer = UserSearchSerializer(users, many=True, context={'request': request})
        
        return Response({
            'users': serializer.data,
            'total_count': total_count,
            'has_more': (offset + limit) < total_count,
            'query': query
        }, status=status.HTTP_200_OK)
        
    except ValueError:
        return Response({'error': 'Invalid limit or offset parameter'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"User search error: {str(e)}")
        return Response({'error': f'Error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
