from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import RegisterUserView, VerifyUserEmail, LoginUserView, PasswordResetConfirm, PasswordResetRequestView, SetNewPassword, LogoutUserView, VerifyUserView, CSRFTokenView, CookieTokenRefreshView, get_user_profile_data, toggleFollow

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

]