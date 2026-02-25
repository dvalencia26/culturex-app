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
import secrets


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
    code = models.CharField(max_length=6)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

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
        # Update slug after edits to title
        if self.pk:
            try:
                old_post = Post.objects.get(pk=self.pk)
                if old_post.title != self.title:
                    # Title changed, create new slug
                    self.slug = self.generate_unique_slug()
            except Post.DoesNotExist:
                pass
        
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


class PostSummary(models.Model):
    class Status(models.TextChoices):
        STALE = "stale", "Stale"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    post = models.OneToOneField(Post, on_delete=models.CASCADE, related_name='summary')
    summary = models.TextField(blank=True, default="")
    content_hash = models.CharField(max_length=64, blank=True, default="", db_index=True) # cost control + invalidation (if content don't change, no need to regenerate)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.STALE) # Default to stale
    model_name = models.CharField(max_length=100, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    generated_at = models.DateTimeField(blank=True, null=True) # When summary was generated
    created_at = models.DateTimeField(auto_now_add=True) 
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Summary for post {self.post_id} ({self.status})"


class RecommendationCategory(models.Model):
    """Dynamic categories for post recommendations (like acommodation, activity, and others) only admins can change."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, max_length=200, blank=True)
    icon = models.CharField(max_length=50, blank=True, default="")
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name_plural = "Recommendation Categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class PostRecommendation(models.Model):
    """User-generated recommendations related to a post. Includes, title, category, optional URL, rating, price level, and note."""

    class PriceLevel(models.TextChoices):
        BUDGET = "$", "$"
        MODERATE = "$$", "$$"
        PREMIUM = "$$$", "$$$"
        LUXURY = "$$$$", "$$$$"

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='recommendations')
    title = models.CharField(max_length=200)
    category = models.ForeignKey(
        RecommendationCategory,
        on_delete=models.PROTECT,
        related_name='recommendations'
    )
    url = models.URLField(max_length=500, blank=True, default="")
    google_maps_url = models.URLField(max_length=500, blank=True, default="")
    rating = models.PositiveSmallIntegerField(
        default=0,
        help_text="Rating from 1-5, 0 means no rating"
    )
    price_level = models.CharField(
        max_length=4,
        choices=PriceLevel.choices,
        blank=True,
        default=""
    )
    note = models.CharField(max_length=500, blank=True, default="")
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'created_at']

    def clean(self):
        if self.rating > 5:
            raise ValidationError("Rating must be between 0 and 5.")

    def __str__(self):
        return f"{self.title} ({self.category.name}) - {self.post.title}"


'''
Threads/Discussion models 
'''

class ThreadCategory(models.Model):
    """Main category (e.g., General, Regional, Specialized Topics)"""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, max_length=200, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # Icon class name
    display_order = models.PositiveIntegerField(default=0) # Order for display
    is_active = models.BooleanField(default=True) # Set if category is visible to users
    
    class Meta:
        ordering = ['display_order', 'name']
        verbose_name_plural = "Thread Categories"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class ThreadSubcategory(models.Model):
    """Subcategory for more specific topics"""
    category = models.ForeignKey(
        ThreadCategory, 
        on_delete=models.CASCADE,
        related_name='subcategories'
    )
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['display_order', 'name']
        unique_together = ['category', 'slug']
        verbose_name_plural = "Thread Subcategories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.category.name} - {self.name}"


class Thread(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=250, blank=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='threads')
    
    # Location context
    country = CountryField(blank=True, null=True, help_text="Country related to this thread")
    
    
    # Categorization of threads
    category = models.ForeignKey(
        ThreadCategory,
        on_delete=models.PROTECT,   # Prevent deletion if threads exist
        related_name='threads'
    )
    subcategory = models.ForeignKey(
        ThreadSubcategory,
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='threads'
    )
    
    # Content
    content = models.TextField()
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    view_count = models.PositiveIntegerField(default=0) # Track number of views
    is_pinned = models.BooleanField(default=False) # Pinned threads appear at top
    is_locked = models.BooleanField(default=False) # Locked threads cannot receive new replies
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['country', '-created_at']),
            models.Index(fields=['category', '-created_at']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['author', 'slug'], name='unique_thread_slug_per_author')
        ]
    def save(self, *args, **kwargs):
        # Update slug after edits to title
        if self.pk:
            try:
                old_thread = Thread.objects.get(pk=self.pk)
                if old_thread.title != self.title:
                    # Title changed, create new slug
                    self.slug = self.generate_unique_slug()
            except Thread.DoesNotExist:
                pass
        
        # Generate slug for newly created threads
        if not self.slug:
            self.slug = self.generate_unique_slug()
        
        super().save(*args, **kwargs)

    def generate_unique_slug(self):
        """Generate a unique slug per author from the title"""
        base_slug = slugify(self.title)

        if not base_slug:  # If title has no valid characters 
            base_slug = f"thread-{self.author.id}" 
        
        # Make slug unique per author
        slug = base_slug
        counter = 1
        
        while Thread.objects.filter(author=self.author, slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        return slug
    
    def get_absolute_url(self):
        """Return the URL for this thread"""
        try:
            username = self.author.profile.username
        except Profile.DoesNotExist:
            username = self.author.email.split('@')[0]
        
        return f"/u/{username}/threads/{self.slug}/"
    
    @property
    def reply_count(self):
        return self.replies.count()
    
    @property
    def author_username(self):
        try:
            return self.author.profile.username
        except Profile.DoesNotExist:
            return self.author.email.split('@')[0]
        
    def __str__(self):
        return self.title


class ThreadReply(models.Model):
    thread = models.ForeignKey(
        Thread,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='thread_replies')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Nested replies
    parent_reply = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='child_replies'
    )
    
    class Meta:
        ordering = ['created_at']
        verbose_name_plural = "Thread Replies"

    @property
    def author_username(self):
        try:
            return self.author.profile.username
        except Profile.DoesNotExist:
            return self.author.email.split('@')[0]
    
    def __str__(self):
        return f"Reply by {self.author_username} on {self.thread.title}"


class ShareLink(models.Model):
    """Shorter sharelinks for posts/threads with meta tags"""
    class ContentType(models.TextChoices):
        POST = "post", "Post"
        THREAD = "thread", "Thread"
    
    code = models.CharField(max_length=12, unique=True, db_index=True) # Unique code for the share link. Indexed for faster lookups
    content_type = models.CharField(max_length=10, choices=ContentType.choices) # Thread or post
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True, related_name='share_links')
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, null=True, blank=True, related_name='share_links')
    click_count = models.PositiveIntegerField(default=0) # Track number of clicks on this share link
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        constraints = [
            # Ensure that if content_type is post, then post must be set and thread must be null, and vice versa
            models.CheckConstraint(
                condition=(
                    models.Q(content_type='post', post__isnull=False, thread__isnull=True) |
                    models.Q(content_type='thread', thread__isnull=False, post__isnull=True)
                ),
                name='sharelink_content_integrity'
            )
        ]
    
    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_unique_code()
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_unique_code():
        """Generate a unique 8-character code (only letters and numbers)"""
        while True:
            code = secrets.token_urlsafe(6)[:8]
            if not ShareLink.objects.filter(code=code).exists():
                return code
    
    def get_target_url(self):
        """Get the URL from the frontend for this content"""
        if self.content_type == 'post' and self.post:
            return self.post.get_absolute_url()
        elif self.content_type == 'thread' and self.thread:
            return self.thread.get_absolute_url()
        return '/'
    
    def __str__(self):
        return f"{self.code} -> {self.content_type}"
