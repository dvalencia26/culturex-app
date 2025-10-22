from django.contrib import admin
from .models import User, Profile, Post
# Register your models here.

admin.site.register(User) # Register the User model
admin.site.register(Profile)
admin.site.register(Post)