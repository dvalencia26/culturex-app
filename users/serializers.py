from rest_framework import serializers
from .models import User, Profile
from django.contrib.auth import authenticate
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.sites.shortcuts import get_current_site
from django.utils.encoding import smart_bytes, force_str
from django.urls import reverse
from .utils import send_normal_email
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from django.conf import settings

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(max_length=128, min_length=8, write_only=True)
    password2 = serializers.CharField(max_length=128, min_length=8, write_only=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password2']


    def validate(self, attrs):
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

    class Meta:
        fields = ['email']

    def validate(self, attrs):
        email = attrs.get('email')

        # check if user exists in database
        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            uidb64 = urlsafe_base64_encode(smart_bytes(user.id)) # We're encoding the user ID that we get from the url
            token = PasswordResetTokenGenerator().make_token(user)
            request = self.context.get('request') # We're getting the request object from the context in views function
            site_domain = get_current_site(request).domain
            relative_link = reverse('password-reset-confirm', kwargs={'uidb64': uidb64, 'token': token}) # We pass this into the url that we sent the user
            absolute_link = f"http://{site_domain}{relative_link}"

            email_body = f"Hello, \n Use the link below to reset your password \n {absolute_link}"
            data = {'email_body': email_body,
                    'email_subject': 'Reset your password',
                    'to_email': user.email
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
        