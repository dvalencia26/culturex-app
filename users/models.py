from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils.translation import gettext_lazy as _
from .managers import UserManager
from rest_framework_simplejwt.tokens import RefreshToken
from django_countries.fields import CountryField
from slugify import slugify
from cities_light.models import Region, City
from django.core.exceptions import ValidationError


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
    

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=200, verbose_name="Post Title")
    slug = models.SlugField(max_length=200, blank=True) # set slug to blank initially, will be auto-generated on save

    content = models.TextField() 

    class LocationScope(models.TextChoices):
        NONE = "none", "Not location specific"
        COUNTRY = "country", "Country specific"
        CITY = "city", "City specific"

    location_scope = models.CharField(max_length=20, choices=LocationScope.choices, default=LocationScope.NONE,
                                      help_text="Is this post related to a specific location?")

    # For single-country or city-specific posts
    # database indexes make queries faster but use more storage space and slow down writes.
    primary_country = CountryField(blank=True, null=True, db_index=True)

    #Define foreign keys to cities_light models for region and city
    primary_city = models.ForeignKey(City, blank=True, null=True, on_delete=models.PROTECT)

    # Publication status
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True) # db_index=True for faster queries by created_at
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Validate location data consistency"""
        
        # Validation for NONE (global posts - no location data allowed)
        if self.location_scope == self.LocationScope.NONE:
            if self.primary_country or self.primary_city:
                raise ValidationError("Global posts (location_scope='none') cannot have country or city data.")
        
        # Validation for COUNTRY (must have country, no city)
        elif self.location_scope == self.LocationScope.COUNTRY:
            if not self.primary_country:
                raise ValidationError("Country-specific posts must have a country selected.")
            if self.primary_city:
                raise ValidationError("Country-level posts should not have a city selected. Use 'city' scope for city-specific posts.")
        
        # Validation for CITY (must have both country and city)
        elif self.location_scope == self.LocationScope.CITY:
            if not self.primary_country or not self.primary_city:
                raise ValidationError("City-specific posts must have both country and city selected.")

        # Check city/country consistency (if both are set)
        if self.primary_city and self.primary_country:
            # cities-light Country uses .code2 for ISO country codes
            city_country_code = self.primary_city.region.country.code2
            # django-countries uses .code for ISO country codes
            primary_country_code = self.primary_country.code
            
            if primary_country_code != city_country_code:
                raise ValidationError(f"Selected city is in {city_country_code}, but country is set to {primary_country_code}")
        
    def save(self, *args, **kwargs):
        # Auto-generate slug from title so user doesn't have to write it manually
        if not self.slug:
            self.slug = self.generate_unique_slug()
        super().save(*args, **kwargs)
    
    def generate_unique_slug(self):
        """Generate a unique slug per user from the title"""
        base_slug = slugify(self.title) # We use python-slugify to convert title to URL-friendly format

        if not base_slug:  # If title has no valid characters 
            base_slug = f"post-{self.user.id}" 
        
        # Make slug unique per user so different users can have same slug
        slug = base_slug
        counter = 1
        
        # Check if slug exists for this user
        while Post.objects.filter(user=self.user, slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        return slug
    
    def get_absolute_url(self):
        """Return the URL for this post"""
        try:
            username = self.user.profile.username
        except Profile.DoesNotExist:
            # Fallback to user's email prefix if no profile exists
            username = self.user.email.split('@')[0]
        
        return f"/u/{username}/posts/{self.slug}/"
    
    def __str__(self):
        return f"{self.title} by {self.user.get_full_name}"
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'slug'], name='unique_user_slug')
        ]
