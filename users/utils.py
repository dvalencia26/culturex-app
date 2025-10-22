import random
from django.core.mail import EmailMessage
from .models import User, OneTimePassword
from django.conf import settings

# This is a simple implementation to generate a random OTP (One Time Password) to verify user email addresses
# There is a more secure way to generate OTPs using Django's built-in features, but for simplicity, we'll use random numbers here.
# use pyotp for a more secure OTP generation 

def generateOtp():
    otp = ""
    for i in range(6):
        otp += str(random.randint(0, 9))
    return otp


def send_code_via_email(email):
    subject = "OTP Code for Email Verification"
    otp_code = generateOtp()
    print(f"Generated OTP: {otp_code}") 
    user=User.objects.get(email=email)
    current_site="myAuth.com"
    email_body = f"Hi {user.first_name}! Thank you for signing up on {current_site}. Please verify your email address using the following One Time Passcode: {otp_code}"
    from_email = settings.DEFAULT_FROM_EMAIL # This is the email address that will appear as the sender which is configured in Django settings

    OneTimePassword.objects.create(user=user, code=otp_code)

    d_email = EmailMessage(subject=subject, body=email_body, from_email=from_email, to=[email])
    d_email.send(fail_silently=True)


def send_normal_email(data):
    email=EmailMessage(
        subject=data['email_subject'],
        body=data['email_body'],
        from_email=settings.EMAIL_HOST_USER,
        to=[data['to_email']]
    )
    email.send()


# Utility function to get full URL for an image field
# This is being used in serializers for Profile and Post to return absolute URLs for image fields
def get_full_image_url(request, image_field):
    if not image_field:
        return None
    return request.build_absolute_uri(image_field.url)

