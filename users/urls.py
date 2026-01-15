from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import (
    RegisterUserView, VerifyUserEmail, LoginUserView, PasswordResetConfirm, 
    PasswordResetRequestView, SetNewPassword, LogoutUserView, VerifyUserView, 
    CSRFTokenView, CookieTokenRefreshView, get_user_profile_data, toggleFollow, 
    post_list_create, get_user_posts, post_detail, get_my_posts, get_countries_for_posts, 
    get_countries_with_posts, get_cities_by_country, get_cities_with_posts_by_country,
    # Thread views
    thread_category_list, thread_category_detail, thread_subcategory_list,
    thread_list_create, get_user_threads, thread_detail, get_my_threads,
    thread_reply_list_create, thread_reply_detail, get_nested_replies,
    popular_countries, get_all_countries,
)

urlpatterns = [
    # User Registration & Email Verification
    path('register/', RegisterUserView.as_view(), name='register'),
    path('verify-email/', VerifyUserEmail.as_view(), name='verify-email'),  # Email verification after signup

    # Authentication
    path('login/', LoginUserView.as_view(), name='login'),
    path('logout/', LogoutUserView.as_view(), name='logout'),
    path('verify/', VerifyUserView.as_view(), name='verify-user'),  # Check authentication status

    # Token Management
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='refresh-token'), # 

    # Password Management
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/<uidb64>/<token>/', PasswordResetConfirm.as_view(), name='password-reset-confirm'),
    path('set-new-password/', SetNewPassword.as_view(), name='set-new-password'),

    # Security
    path('csrf-token/', CSRFTokenView.as_view(), name='csrf-token'), 

    # User Profile
    path('profile/<str:handle>/', get_user_profile_data, name='user-profile'),  # Get user profile data
    path('toggle-follow/<str:handle>/', toggleFollow, name='toggle-follow'),  # Toggle follow/unfollow user

    # Posts
    path('posts/', post_list_create, name='post-list-create'),  # GET: List posts, POST: Create post
    path('my-posts/', get_my_posts, name='my-posts'),  # GET: Current user's posts (including drafts)
    path('profile/<str:username>/posts/', get_user_posts, name='user-posts'),  # GET: User's published posts
    path('profile/<str:username>/posts/<slug:slug>/', post_detail, name='post-detail'),  # GET/PUT/PATCH/DELETE: Specific post

    # Location Data
    path('countries/', get_all_countries, name='all-countries'),  # GET: All countries
    path('countries-for-posts/', get_countries_for_posts, name='countries-for-posts'),  # GET: Countries based on location scope
    path('countries-with-posts/', get_countries_with_posts, name='countries-with-posts'),  # GET: Countries that have posts
    path('countries/<str:country_code>/cities/', get_cities_by_country, name='cities-by-country'),  # GET: Cities for country
    path('countries/<str:country_code>/cities-with-posts/', get_cities_with_posts_by_country, name='cities-with-posts'),  # GET: Cities with posts

    # Thread Categories
    path('thread-categories/', thread_category_list, name='thread-category-list'),  # GET: List all categories
    path('thread-categories/<slug:slug>/', thread_category_detail, name='thread-category-detail'),  # GET: Category detail
    path('thread-categories/<slug:category_slug>/subcategories/', thread_subcategory_list, name='thread-subcategory-list'),  # GET: Subcategories

    # Threads
    path('threads/', thread_list_create, name='thread-list-create'),  # GET: List threads, POST: Create thread
    path('my-threads/', get_my_threads, name='my-threads'),  # GET: Current user's threads
    path('profile/<str:username>/threads/', get_user_threads, name='user-threads'),  # GET: User's threads
    path('profile/<str:username>/threads/<slug:slug>/', thread_detail, name='thread-detail'),  # GET/PUT/PATCH/DELETE: Specific thread
    path('popular-countries/', popular_countries, name='popular-countries'),

    # Thread Replies
    path('profile/<str:username>/threads/<slug:slug>/replies/', thread_reply_list_create, name='thread-reply-list-create'),  # GET: List replies, POST: Create reply
    path('thread-replies/<int:reply_id>/', thread_reply_detail, name='thread-reply-detail'),  # GET/PUT/PATCH/DELETE: Specific reply
    path('thread-replies/<int:reply_id>/nested/', get_nested_replies, name='nested-replies'),  # GET: Nested replies

]