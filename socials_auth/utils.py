from google.auth.transport import requests
from google.oauth2 import id_token
from users.models import User, Profile
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

# Google OAuth2.0
class Google():
    @staticmethod
    def validate(access_token):
        try:
            id_info=id_token.verify_oauth2_token(access_token, requests.Request())
            if 'accounts.google.com' in id_info['iss']: # Check if account is from Google
                return id_info
        except Exception as e:
            return "Token is not valid or has expired"


# Build auth response for an already-verified social user
def login_social_user(user):
    if not user:
        raise AuthenticationFailed(detail="Google authentication failed.")
    if not user.is_active:
        raise AuthenticationFailed(detail="This account is inactive. Please contact support.")
    user_tokens = user.token()  
    return {
        'email': user.email,
        'full_name': user.get_full_name,
        'access_token': str(user_tokens.get('access')),
        'refresh_token': str(user_tokens.get('refresh'))
    }


def register_social_user(provider, email, first_name, last_name):
    register_user = User.objects.filter(email=email)  # Check if user exists in our database
    if register_user.exists():
        existing_user = register_user[0]
        if provider == existing_user.auth_provider:  # Check if the auth provider matches with the user's auth provider from our users model
            if not existing_user.is_verified:
                existing_user.is_verified = True
                existing_user.save(update_fields=['is_verified'])
            Profile.objects.get_or_create(user=existing_user)
            result = login_social_user(existing_user)
            return result
        else:
            raise AuthenticationFailed(
                detail=f"Please continue your login with {existing_user.auth_provider}."
            )
    else:
        new_user = {
            'email': email,
            'first_name': first_name,
            'last_name': last_name,
            'password': settings.SOCIAL_AUTH_PASSWORD
        }
        # Create a new user object
        register_user = User.objects.create_user(**new_user)
        register_user.auth_provider = provider
        register_user.is_verified = True
        register_user.save(update_fields=['auth_provider', 'is_verified'])
        Profile.objects.get_or_create(user=register_user)
        result = login_social_user(register_user)
        return result
