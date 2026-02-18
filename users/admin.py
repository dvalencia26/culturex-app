from django.contrib import admin
from .models import User, Profile, Post, PostRecommendation, RecommendationCategory, Thread, ThreadCategory, ThreadSubcategory, ThreadReply
# Register your models here.

admin.site.register(User) # Register the User model
admin.site.register(Profile)
admin.site.register(Post)
admin.site.register(RecommendationCategory)
admin.site.register(PostRecommendation)
admin.site.register(Thread)
admin.site.register(ThreadCategory)
admin.site.register(ThreadSubcategory)
admin.site.register(ThreadReply)
