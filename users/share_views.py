from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404, render
from django.conf import settings
from django.db.models import F
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import ShareLink, Post, Thread
from .share_utils import is_crawler, extract_first_image, extract_text_excerpt

# This file handes contains the view for handling share links. 
# It detects if the request is from a social media crawler and renders an HTML page with Open Graph meta tags for better sharing previews. 
# For real users, it redirects to the regular frontend URL for the post/thread. It also includes an endpoint to create/get share links based on content type and ID.

class ShareLinkRedirectView(APIView):
    """Handle share link requests:
    - Social Media Crawlers get HTML with Open Graph meta tags
    - Real users get redirected to the regular frontend URL for the post/thread
    """
    permission_classes = [AllowAny]
    
    def get(self, request, code):
        share_link = get_object_or_404(ShareLink, code=code)
        
        # Increment click count
        ShareLink.objects.filter(code=code).update(click_count=F('click_count') + 1)
        
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        
        if is_crawler(user_agent):
            return self.render_og_page(share_link, request, frontend_url)
        else:
            # Redirect to frontend URL for the content
            target_path = share_link.get_target_url()
            return HttpResponseRedirect(f"{frontend_url}{target_path}") # Returns a 302 redirect
    
    def render_og_page(self, share_link, request, frontend_url):
        """Render HTML page with Open Graph meta tags for crawlers"""
        site_name = getattr(settings, 'SITE_NAME', 'Our Routes')
        
        if share_link.content_type == 'post' and share_link.post:
            content = share_link.post
            title = content.title
            
            # Try AI summary first, fallback to excerpt
            description = ""
            if hasattr(content, 'summary') and content.summary and content.summary.status == 'ready':
                description = content.summary.summary[:200]
            if not description:
                description = extract_text_excerpt(content.content)
            
            image = extract_first_image(content.content)
            url = f"{frontend_url}{content.get_absolute_url()}"
            author = content.user.get_full_name()
            
        elif share_link.content_type == 'thread' and share_link.thread:
            content = share_link.thread
            title = content.title
            description = extract_text_excerpt(content.content)
            image = None  # Threads don't have images
            url = f"{frontend_url}{content.get_absolute_url()}"
            author = content.author.get_full_name()
        else:
            return HttpResponseRedirect(frontend_url)
        
        # Default image fallback
        default_image = f"{frontend_url}/og-default.jpg"
        og_image = image or default_image
        
        context = {
            'title': title,
            'description': description,
            'og_image': og_image,
            'url': url,
            'site_name': site_name,
            'author': author,
        }
        
        return render(request, 'tags.html', context)


class CreateShareLinkView(APIView):
    """Endpoint to create/get share links based on content type and ID."""
    # Anyone can create share links for public content
    permission_classes = [AllowAny]
    
    def post(self, request, content_type, content_id):
        if content_type == 'post':
            content = get_object_or_404(Post, id=content_id, status='published')
            existing = ShareLink.objects.filter(content_type='post', post=content).first()
            if existing:
                return Response({'code': existing.code, 'created': False})
            
            share_link = ShareLink.objects.create(
                content_type='post',
                post=content
            )
        elif content_type == 'thread':
            content = get_object_or_404(Thread, id=content_id)
            existing = ShareLink.objects.filter(content_type='thread', thread=content).first()
            if existing:
                return Response({'code': existing.code, 'created': False})
            
            share_link = ShareLink.objects.create(
                content_type='thread',
                thread=content
            )
        else:
            return Response({'error': 'Invalid content type'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'code': share_link.code, 'created': True}, status=status.HTTP_201_CREATED)
