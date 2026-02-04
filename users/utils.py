import secrets
from datetime import timedelta
import mailtrap as mt
from django.conf import settings
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives # for sending multi-part emails (text and HTML)
from django.template.loader import render_to_string # render templates with context
from django.utils import timezone
from django.utils.html import strip_tags # to convert HTML to plain text
from .models import User, OneTimePassword

def generateOtp():
    # 6-digit numeric code. Randbelow generates a number between 0 and 999999. Zfill adds leading zeros to ensure it's 6 digits.
    return str(secrets.randbelow(1_000_000)).zfill(6)


def _send_email_via_mailtrap(to_email, subject, text, category="Transactional", html=None):
    api_token = getattr(settings, 'MAILTRAP_API_TOKEN')
    from_email = getattr(settings, 'MAILTRAP_FROM_EMAIL')
    from_name = getattr(settings, 'MAILTRAP_FROM_NAME')

    if not api_token or not from_email:
        return False, "Email service is not configured. correctly."

    try:
        mail = mt.Mail(
            sender=mt.Address(email=from_email, name=from_name),
            to=[mt.Address(email=to_email)],
            subject=subject,
            text=text,
            html=html,
            category=category,
        )
        client = mt.MailtrapClient(token=api_token)
        client.send(mail)
        return True, None
    except Exception:
        return False, "Email service error."


def _send_email(to_email, subject, text, category=None, html=None):
    backend_mode = getattr(settings, 'EMAIL_BACKEND_MODE', 'smtp')
    if backend_mode == 'mailtrap_api':
        return _send_email_via_mailtrap(to_email, subject, text, category or "Transactional", html=html)

    d_email = EmailMultiAlternatives(
        subject=subject,
        body=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email]
    )
    if html:
        d_email.attach_alternative(html, "text/html")
    d_email.send(fail_silently=True)
    return True, None


def send_code_via_email(email, expires_minutes=10, max_sends=3, window_seconds=600):
    subject = "OTP Code for Email Verification"
    otp_code = generateOtp()
    user = User.objects.get(email=email)
    current_site = "urroutes.com"

    # Rate limit: max_sends per window per email
    cache_key = f"otp_send:{email}"
    sent_count = cache.get(cache_key, 0)
    if sent_count >= max_sends:
        return False, "Too many requests. Please try again later."
    cache.set(cache_key, sent_count + 1, timeout=window_seconds)

    expires_at = timezone.now() + timedelta(minutes=expires_minutes)
    OneTimePassword.objects.update_or_create(
        user=user,
        defaults={
            'code': otp_code,
            'attempts': 0,
            'expires_at': expires_at
        }
    )

    context = {
        'first_name': user.first_name,
        'otp_code': otp_code,
        'expires_minutes': expires_minutes,
        'current_site': current_site,
    }
    html_body = render_to_string('otp_verification.html', context) # Find the file in templates folder and render it
    text_body = render_to_string('otp_verification.txt', context) # Plain text version

    return _send_email(email, subject, text_body, category="OTP", html=html_body)


def send_normal_email(data):
    subject = data['email_subject']
    to_email = data['to_email']
    html_template = data.get('html_template')
    text_template = data.get('text_template')
    context = data.get('context', {})

    if html_template:
        html_body = render_to_string(html_template, context) # Render HTML template with context
        if text_template:
            text_body = render_to_string(text_template, context)
        else:
            text_body = strip_tags(html_body) # Fallback to stripping HTML tags for plain text
    else:
        text_body = data.get('email_body', '')
        html_body = None

    _send_email(to_email, subject, text_body, category="Transactional", html=html_body)


# Utility function to get full URL for an image field
# This is being used in serializers for Profile and Post to return absolute URLs for image fields
def get_full_image_url(request, image_field):
    if not image_field:
        return None
    return request.build_absolute_uri(image_field.url)

