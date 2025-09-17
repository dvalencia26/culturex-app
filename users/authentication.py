from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken, TokenError
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication class that retrieves the JWT from an HTTPOnly cookie.
    This validates the token and authenticates the user based on the token claims.
    """

    def authenticate(self, request):
        # First try to get token from Authorization header (for backward compatibility)
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            # If no header, try to get access token from cookie
            raw_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE'])

        if raw_token is None:
            return None

        try:
            # Validate the token
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token) # Gets user from token
            return (user, validated_token)
        except TokenError:
            # If token is invalid, return None (no authentication)
            return None
