import json
import re

# Utility functions for handling EditorJS content and social media crawler detection. 
# It detects if a request is from a social media crawler and renders an HTML page (tags.html) with Open Graph meta tags for better sharing previews. 
# It also includes functions to extract the first image and text excerpts from EditorJS content for use in those meta tags.

# Common social media crawler user agents
CRAWLER_USER_AGENTS = [
    'facebookexternalhit',
    'Facebot',
    'Twitterbot',
    'LinkedInBot',
    'WhatsApp',
]

def is_crawler(user_agent: str) -> bool:
    """Check if the request is from a social media crawler"""
    if not user_agent:
        return False
    ua_lower = user_agent.lower()
    return any(bot.lower() in ua_lower for bot in CRAWLER_USER_AGENTS)


def extract_first_image(content) -> str | None:
    """Extract the first image URL from EditorJS content JSON"""
    if not content:
        return None
    
    # Parse if string
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            return None
    
    # EditorJS returns data in format: {"blocks": [...]}
    blocks = content.get('blocks', [])
    
    for block in blocks:
        if block.get('type') == 'image':
            data = block.get('data', {})
            # EditorJS image block stores URL in data.file.url or data.url
            url = data.get('file', {}).get('url') or data.get('url')
            if url:
                return url
    
    return None


def extract_text_excerpt(content, max_length: int = 160) -> str:
    """Extract text excerpt from EditorJS content"""
    if not content:
        return ""
    
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            # If not JSON, treat as plain text
            return content[:max_length].strip()
    
    blocks = content.get('blocks', [])
    text_parts = []
    
    for block in blocks:
        block_type = block.get('type')
        data = block.get('data', {})
        
        if block_type == 'paragraph':
            text = data.get('text', '')
            # Strip HTML tags
            clean_text = re.sub(r'<[^>]+>', '', text)
            text_parts.append(clean_text)
        elif block_type == 'header':
            text_parts.append(data.get('text', ''))
        elif block_type == 'list':
            items = data.get('items', [])
            text_parts.extend(items)
    
    full_text = ' '.join(text_parts)
    
    if len(full_text) > max_length:
        return full_text[:max_length-3].rsplit(' ', 1)[0] + '...'
    
    return full_text
