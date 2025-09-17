from rest_framework import serializers
from .utils import Google, register_social_user
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

# Define and validate access token for Google Sign-In
class GoogleSignInSerializer(serializers.Serializer):
    token = serializers.CharField(min_length=6)  

    def validate(self, attrs):
        token = attrs['token'] # Google OAuth token from the request
        google_user_data = Google.validate(token) # if the token is valid, we will get user data
        
        try:
            userid = google_user_data['sub']
        except:
            raise serializers.ValidationError("The token has expired or invalid. Please try again")

        # The values of 'aud' in the ID token must match the client ID. This helps prevent malicious use of the token
        if google_user_data['aud'] != settings.GOOGLE_CLIENT_ID:
                raise AuthenticationFailed(detail='Could not verify user.')

        # Get user data from their Google account
        email = google_user_data['email']
        first_name = google_user_data['given_name']
        last_name = google_user_data['family_name']
        provider = 'google'

        # Get the user data from register_social_user
        # This creates the user in our database if they do not exist
        user_data = register_social_user(provider, email, first_name, last_name)
        
        # Return the complete user data as validated_data
        return user_data

        