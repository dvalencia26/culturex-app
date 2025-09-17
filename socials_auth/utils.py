from google.auth.transport import requests
from google.oauth2 import id_token
from users.models import User
from django.contrib.auth import authenticate
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


# Login user with email and password
def login_social_user(email, password):
    user = authenticate(email=email, password=password)
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
        if provider == register_user[0].auth_provider:  # Check if the auth provider matches with the user's auth provider from our users model
            result = login_social_user(email=email, password=settings.SOCIAL_AUTH_PASSWORD)
            return result
        else:
            raise AuthenticationFailed(
                detail=f"Please continue your login with {register_user[0].auth_provider}."
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
        register_user.save()
        result = login_social_user(email=register_user.email, password=settings.SOCIAL_AUTH_PASSWORD)
        return result
