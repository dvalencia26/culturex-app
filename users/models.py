from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils.translation import gettext_lazy as _
from .managers import UserManager
from rest_framework_simplejwt.tokens import RefreshToken


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


class OneTimePassword(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6, unique=True)

    def __str__(self):
        return f"{self.user.first_name} - passcode"