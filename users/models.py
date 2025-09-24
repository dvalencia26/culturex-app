from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils.translation import gettext_lazy as _
from .managers import UserManager
from rest_framework_simplejwt.tokens import RefreshToken
import re


AUTH_PROVIDERS = {'email': 'email', 'google': 'google', 'facebook': 'facebook'}

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(max_length=255, verbose_name=_('email address'), unique=True)
    first_name = models.CharField(max_length=50, verbose_name=_('first name'))
    last_name = models.CharField(max_length=50, verbose_name=_('last name'))
    is_staff = models.BooleanField(_('staff'), default=False) # _('staff') helps with translation of the specific word
    is_superuser = models.BooleanField(_('superuser'), default=False)
    is_verified = models.BooleanField(_('verified'), default=False)
    is_active = models.BooleanField(_('active'), default=True)
    date_joined = models.DateTimeField(_('date joined'), auto_now_add=True)
    last_login = models.DateTimeField(_('last login'), auto_now=True)
    auth_provider = models.CharField(max_length=50, default=AUTH_PROVIDERS['email']) # Default to email provider


    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def token(self):
        # Generate a token for the user
        refresh = RefreshToken.for_user(self)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token)
        }


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    username = models.CharField(max_length=30, unique=True, blank=True, null=True)
    bio = models.CharField(max_length=500, blank=True, null=True)
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    
    # Social media links
    facebook_url = models.URLField(max_length=200, blank=True, null=True)
    instagram_url = models.URLField(max_length=200, blank=True, null=True)
    twitter_url = models.URLField(max_length=200, blank=True, null=True)
    tiktok_url = models.URLField(max_length=200, blank=True, null=True)
    
    # Follow system
    followers = models.ManyToManyField('self', symmetrical=False, related_name='following', blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-generate username if not set, we use self.pk to check if there is an existing profile
        if not self.username and not self.pk:
            self.username = self.generate_simple_username()
        super().save(*args, **kwargs)

    def generate_simple_username(self):
        """Generate a simple username from first + last name"""
        # Get first and last name, remove spaces and special characters
        first = re.sub(r'[^a-zA-Z0-9]', '', self.user.first_name.lower())
        last = re.sub(r'[^a-zA-Z0-9]', '', self.user.last_name.lower())
        
        # Create base username
        base_username = f"{first}_{last}" 
        
        # Make sure it's at least 3 characters
        if len(base_username) < 3:
            base_username = f"user{self.user.id}" # Fallback to user ID if too short
   

        # Check if it's available, add number if not
        username = base_username
        counter = 1
        # Loop until we find a unique username
        while Profile.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        return username

    def __str__(self):
        return self.username

    # Properties to get followers and following count
    @property
    def followers_count(self):
        return self.followers.count()

    @property
    def following_count(self):
        return self.following.count()

    class Meta:
        verbose_name = _('Profile')
        verbose_name_plural = _('Profiles')


class OneTimePassword(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6, unique=True)

    def __str__(self):
        return f"{self.user.first_name} - passcode"