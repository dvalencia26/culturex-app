from rest_framework import serializers
from .models import User, Profile, Post, PostSummary, ThreadCategory, ThreadSubcategory, Thread, ThreadReply
from django.contrib.auth import authenticate
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.sites.shortcuts import get_current_site
from django.utils.encoding import smart_bytes, force_str
from django.urls import reverse
from .utils import send_normal_email, get_full_image_url
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from django.conf import settings
from urllib.parse import urlparse


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(max_length=128, min_length=8, write_only=True)
    password2 = serializers.CharField(max_length=128, min_length=8, write_only=True)
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password2', 'website']


    def validate(self, attrs):
        website = attrs.get('website', '')
        if website:
            raise serializers.ValidationError("Invalid submission.")

        password = attrs.get('password', '')
        password2 = attrs.get('password2', '')

        if password != password2:
            raise serializers.ValidationError("Passwords do not match.")
        return attrs


    # Note: We use [] for data that is required to create the user, and .get() for optional data
    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            password=validated_data['password']
        )
        Profile.objects.create(user=user) # Creates a profile for the user upon signup
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255, min_length=3)
    password = serializers.CharField(max_length=128, min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=255, read_only=True)

    class Meta:
        fields = ['email', 'password', 'full_name']

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        request = self.context.get('request')
        user = authenticate(request, email=email, password=password)

        if not user:
            raise AuthenticationFailed("Invalid email or password. Please try again.")
        if not user.is_verified:
            raise AuthenticationFailed("Email is not verified. Please verify your email before logging in.")

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # If the response is provided, set the cookies on the response otherwise return the data
        response = self.context.get('response')
        if response:
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                value=access_token,
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
            )
            response.set_cookie(
                key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
                value=refresh_token,
                httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
            )

        return {
            'email': user.email,
            'full_name': user.get_full_name,
        }

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255, required=True)
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        fields = ['email', 'website']

    def validate(self, attrs):
        email = attrs.get('email')
        website = attrs.get('website', '')
        if website:
            raise serializers.ValidationError("Invalid submission.")

        # check if user exists in database
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            uidb64 = urlsafe_base64_encode(smart_bytes(user.id)) # We're encoding the user ID that we get from the url
            token = PasswordResetTokenGenerator().make_token(user)
            frontend_base = settings.FRONTEND_URL.rstrip('/') # Get frontend URL from settings
            absolute_link = f"{frontend_base}/password-reset-confirm/{uidb64}/{token}" # Construct the absolute link for password reset

            data = {
                'email_subject': 'Reset your password',
                'to_email': user.email,
                'html_template': 'password_reset.html',
                'text_template': 'password_reset.txt',
                'context': {
                    'first_name': user.first_name,
                    'reset_link': absolute_link,
                },
            }
            send_normal_email(data)

        return email


class SetNewPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=128, min_length=8, write_only=True)
    confirm_password = serializers.CharField(max_length=128, min_length=8, write_only=True)
    uidb64 = serializers.CharField(write_only=True)
    token = serializers.CharField(write_only=True)

    class Meta:
        fields = ['password', 'confirm_password', 'uidb64', 'token']

    # Validate the incoming data to change the password
    def validate(self, attrs):
        token = attrs.get('token', '')
        uidb64 = attrs.get('uidb64', '')
        password = attrs.get('password', '')
        confirm_password = attrs.get('confirm_password', '')

        try:
            user_id = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(id=user_id)
        except Exception:
            raise AuthenticationFailed("The reset link is invalid or has expired.", 401)

        if not PasswordResetTokenGenerator().check_token(user, token):
            raise AuthenticationFailed("Reset Link is invalid or has expired.", 401)

        if password != confirm_password:
            raise AuthenticationFailed("Passwords do not match.")

        attrs['user'] = user
        return attrs

    # Update the user password
    def create(self, validated_data):
        user = validated_data['user']
        password = validated_data['password'] # Validates that the password and confirm password match
        user.set_password(password)
        user.save()
        return user
    

class LogoutUserSerializer(serializers.Serializer):
    default_error_messages = {
        'bad_token': ('Token is invalid or expired')
    }

    def validate(self, attrs):
        # Get refresh token from cookie instead of request body, this is the refresh token that is stored in the cookie
        request = self.context.get('request')
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])

        if not refresh_token:
            # Don't raise error if no refresh token - just set to None 
            self.token = None
        else:
            # If the refresh token is found, set it to the token
            self.token = refresh_token

        return attrs

    def save(self, **kwargs):
        # Always clear cookies regardless of token validity
        response = self.context.get('response')
        if response:
            response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
            response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])

        # Only try to blacklist if we have a valid token
        if self.token:
            try:
                token = RefreshToken(self.token)
                token.blacklist()
            except TokenError:
                # If token is invalid, just continue - cookies are already cleared
                pass
        

class ProfileSerializer(serializers.ModelSerializer):
    followers_count = serializers.ReadOnlyField()
    following_count = serializers.ReadOnlyField()
    profile_image = serializers.SerializerMethodField() # Method field gets its value by calling a method on the serializer class. 
    
    # Add user fields from the related User model, this is so we can display user info in profile for the frontend
    email = serializers.CharField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    is_verified = serializers.BooleanField(source='user.is_verified', read_only=True)
    

    class Meta:
        model = Profile
        fields = [
            # Profile fields
            'username', 'bio', 'profile_image', 'facebook_url', 'instagram_url', 
            'twitter_url', 'tiktok_url', 'followers_count', 'following_count',
            # User fields (from related User model)
            'email', 'full_name', 'first_name', 'last_name', 'is_verified'
        ]
        read_only_fields = ['followers_count', 'following_count', 'email', 'full_name', 'first_name', 'last_name', 'is_verified']
        
    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request') # Get the request from the context passed in views
            if request:
                # Gets the full absolute URL that the frontend can use to access the image
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None


class ProfileUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    profile_image_key = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Profile
        fields = [
            'username', 'bio', 'facebook_url', 'instagram_url',
            'twitter_url', 'tiktok_url', 'first_name', 'last_name',
            'profile_image_key'
        ]

    def _normalize_image_key(self, value):
        if not value:
            return ''
        if value.startswith('http'):
            parsed = urlparse(value)
            path = parsed.path or ''
            if '/media/' in path:
                return path.split('/media/', 1)[1]
            return path.lstrip('/')
        return value.lstrip('/')

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        image_key = validated_data.pop('profile_image_key', None)

        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save(update_fields=list(user_data.keys()))

        if image_key is not None:
            normalized = self._normalize_image_key(image_key)
            if normalized:
                instance.profile_image.name = normalized
            else:
                instance.profile_image = None

        return super().update(instance, validated_data)
        

class PostSerializer(serializers.ModelSerializer):
    author_username = serializers.SerializerMethodField() # Display user's profile username
    author_full_name = serializers.CharField(source='user.get_full_name', read_only=True) # Display user's full name
    author_profile_image = serializers.SerializerMethodField() # Get profile image

    slug = serializers.SlugField(read_only=True) # Slug is read-only, generated from title
    created_at = serializers.DateTimeField(read_only=True) # Read-only, set on creation
    updated_at = serializers.DateTimeField(read_only=True) # Read-only, set on update
    # get the profile image of the user who created the post

    # Override primary_country to return country code string instead of Country object
    # this prevents  Django from trying to serialize the Country object which caused a Json error
    primary_country = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    
    # Location display fields
    country_name = serializers.SerializerMethodField()
    country_code = serializers.SerializerMethodField()
    country_flag = serializers.SerializerMethodField()
    city_name = serializers.CharField(source='primary_city.name', read_only=True)

    absolute_url = serializers.CharField(source='get_absolute_url', read_only=True)
    thumbnailUrl = serializers.SerializerMethodField()

    def get_thumbnailUrl(self, obj):
        """Extract first image URL from EditorJS content blocks"""
        try:
            if obj.content:
                import json
                content_data = json.loads(obj.content) if isinstance(obj.content, str) else obj.content
                if content_data and 'blocks' in content_data:
                    for block in content_data['blocks']:
                        if block.get('type') == 'image':
                            thumbnail_url = block.get('data', {}).get('file', {}).get('url')
                            if thumbnail_url:
                                return thumbnail_url
        except (json.JSONDecodeError, TypeError, KeyError, AttributeError):
            pass
        return None

    def get_author_username(self, obj):
        """Get author username, with fallback if profile doesn't exist"""
        try:
            return obj.user.profile.username
        except Profile.DoesNotExist:
            # Fallback to email prefix if no profile exists
            return obj.user.email.split('@')[0]

    def get_author_profile_image(self, obj):
        request = self.context.get('request')
        if hasattr(obj.user, 'profile'): # Check if the user has a profile
            return get_full_image_url(request, obj.user.profile.profile_image) # Use utility function to get full URL
        return None
    
    def get_country_name(self, obj):
        """Get country name from primary_country field"""
        if obj.primary_country:
            return obj.primary_country.name
        return None
    
    def get_country_code(self, obj):
        """Get country code for flag emoji generation"""
        if obj.primary_country:
            return obj.primary_country.code
        return None
    
    def get_country_flag(self, obj):
        """Get country flag for display"""
        if obj.primary_country:
            return obj.primary_country.flag
        return None
    
    def create(self, validated_data):
        # Create post with model validation
        post = Post(**validated_data) # Create Post instance but don't save to DB yet
        post.full_clean()  # Validate the model using its clean() method
        post.save() # Save to DB, triggers save() method in Post model to auto-generate slug
        return post

    class Meta:
            model = Post
            # These are all that will appear in the JSON response to the frontend
            fields = [
                # Fields the user can input (writable)
                'title', 'content', 'location_scope', 'primary_country', 'primary_city', 'status',
                # Read-only fields (auto-generated)
                'id', 'slug', 'created_at', 'updated_at', 'absolute_url', 'thumbnailUrl',
                # Author info (read-only)
                'author_username', 'author_full_name', 'author_profile_image',
                # Location display names (read-only)
                'country_name', 'country_code', 'country_flag', 'city_name'
            ]
            # These fields are read-only and cannot be modified by the user
            read_only_fields = [
                'id', 'slug', 'created_at', 'updated_at', 'absolute_url', 'thumbnailUrl',
                'author_username', 'author_full_name', 'author_profile_image',
                'country_name', 'country_code', 'country_flag', 'city_name'
            ]


class PostDetailSerializer(PostSerializer):
    # Serializer for detailed post view including AI summary
    summary_text = serializers.SerializerMethodField()
    summary_status = serializers.SerializerMethodField()
    summary_generated_at = serializers.SerializerMethodField()

    def _get_summary_obj(self, obj):
        try:
            return obj.summary
        except PostSummary.DoesNotExist:
            return None

    def get_summary_text(self, obj):
        summary_obj = self._get_summary_obj(obj)
        return summary_obj.summary if summary_obj and summary_obj.summary else None

    def get_summary_status(self, obj):
        summary_obj = self._get_summary_obj(obj)
        return summary_obj.status if summary_obj else None

    def get_summary_generated_at(self, obj):
        summary_obj = self._get_summary_obj(obj)
        return summary_obj.generated_at if summary_obj else None

    class Meta(PostSerializer.Meta):
        fields = PostSerializer.Meta.fields + ['summary_text', 'summary_status', 'summary_generated_at']
        read_only_fields = PostSerializer.Meta.read_only_fields + ['summary_text', 'summary_status', 'summary_generated_at']


# Thread Serializers
class ThreadCategorySerializer(serializers.ModelSerializer):
    """Serializer for thread categories"""
    subcategories_count = serializers.SerializerMethodField()
    threads_count = serializers.SerializerMethodField()
    
    def get_subcategories_count(self, obj):
        """Get count of active subcategories"""
        return obj.subcategories.filter(is_active=True).count()
    
    def get_threads_count(self, obj):
        """Get count of threads in this category"""
        return obj.threads.count()
    
    class Meta:
        model = ThreadCategory
        fields = ['id', 'name', 'slug', 'description', 'display_order', 'is_active', 'subcategories_count', 'threads_count']
        read_only_fields = ['slug']


class ThreadSubcategorySerializer(serializers.ModelSerializer):
    """Serializer for thread subcategories"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    threads_count = serializers.SerializerMethodField()
    
    def get_threads_count(self, obj):
        """Get count of threads in this subcategory"""
        return obj.threads.count()
    
    class Meta:
        model = ThreadSubcategory
        fields = ['id', 'name', 'slug', 'description', 'display_order', 'is_active', 
                  'category', 'category_name', 'category_slug', 'threads_count']
        read_only_fields = ['slug']


class ThreadReplySerializer(serializers.ModelSerializer):
    """Serializer for thread replies"""
    author_username = serializers.ReadOnlyField()  # This is a property on ThreadReply model
    author_full_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_profile_image = serializers.SerializerMethodField()
    child_replies_count = serializers.SerializerMethodField()
    
    def get_author_profile_image(self, obj):
        request = self.context.get('request')
        if hasattr(obj.author, 'profile'):
            return get_full_image_url(request, obj.author.profile.profile_image)
        return None
    
    def get_child_replies_count(self, obj):
        """Get count of nested replies"""
        return obj.child_replies.count()
    
    class Meta:
        model = ThreadReply
        fields = ['id', 'thread', 'author', 'author_username', 'author_full_name', 
                  'author_profile_image', 'content', 'created_at', 'updated_at', 
                  'parent_reply', 'child_replies_count']
        read_only_fields = ['author', 'thread', 'created_at', 'updated_at']


class ThreadSerializer(serializers.ModelSerializer):
    """Serializer for threads"""
    author_username = serializers.ReadOnlyField()  # This is a @property
    author_full_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_profile_image = serializers.SerializerMethodField()
    
    # Change category and subcategory to use slugs instead of IDs. This makes it easier to read the data on frontend.
    category = serializers.SlugRelatedField(
        slug_field='slug',
        queryset=ThreadCategory.objects.filter(is_active=True)
    )
    subcategory = serializers.SlugRelatedField(
        slug_field='slug',
        queryset=ThreadSubcategory.objects.filter(is_active=True),
        allow_null=True,
        required=False
    )
    
    # Category info (convenience fields for display)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True, allow_null=True)
    subcategory_slug = serializers.CharField(source='subcategory.slug', read_only=True, allow_null=True)
    
    country = serializers.CharField(allow_blank=True, allow_null=True, required=False) # Returns the country code only
    country_name = serializers.SerializerMethodField()
    country_code = serializers.SerializerMethodField()
    country_flag = serializers.SerializerMethodField()
    
    # Other fields
    reply_count = serializers.ReadOnlyField()
    absolute_url = serializers.CharField(source='get_absolute_url', read_only=True)
    slug = serializers.SlugField(read_only=True)
    
    def get_author_profile_image(self, obj):
        request = self.context.get('request')
        if hasattr(obj.author, 'profile'):
            return get_full_image_url(request, obj.author.profile.profile_image)
        return None
    
    def get_country_name(self, obj):
        if obj.country:
            return obj.country.name
        return None
    
    def get_country_code(self, obj):
        if obj.country:
            return obj.country.code
        return None
    
    def get_country_flag(self, obj):
        if obj.country:
            return obj.country.flag
        return None
    
    def create(self, validated_data):
        """Create thread with model validation"""
        thread = Thread(**validated_data)
        thread.full_clean()
        thread.save()
        return thread
    
    class Meta:
        model = Thread
        fields = [
            # Writable fields
            'title', 'content', 'country', 'category', 'subcategory',
            # Read-only fields
            'id', 'slug', 'created_at', 'updated_at', 'view_count', 'is_pinned', 
            'is_locked', 'absolute_url', 'reply_count',
            # Author info
            'author_username', 'author_full_name', 'author_profile_image',
            # Category info
            'category_name', 'category_slug', 'subcategory_name', 'subcategory_slug',
            # Location info
            'country_name', 'country_code', 'country_flag'
        ]
        read_only_fields = [
            'id', 'slug', 'created_at', 'updated_at', 'view_count', 'is_pinned', 
            'is_locked', 'absolute_url', 'reply_count',
            'author_username', 'author_full_name', 'author_profile_image',
            'category_name', 'category_slug', 'subcategory_name', 'subcategory_slug',
            'country_name', 'country_code', 'country_flag'
        ]
