import hashlib
import json
import re
from django.utils.html import strip_tags


def _clean_editor_text(value):
    if not value:
        return ""
    cleaned = strip_tags(str(value))
    return re.sub(r"\s+", " ", cleaned).strip()


def _flatten_list_items(items):
    extracted = []
    for item in items or []:
        if isinstance(item, str):
            text = _clean_editor_text(item)
            if text:
                extracted.append(text)
        elif isinstance(item, dict):
            text = _clean_editor_text(item.get('content') or item.get('text'))
            if text:
                extracted.append(text)
            nested_items = item.get('items')
            if nested_items:
                extracted.extend(_flatten_list_items(nested_items))
    return extracted


def extract_text_from_editorjs(content, max_chars=12000):
    # Convert Editor.js content (JSON string or dict) to plain text for AI summarization.
    # Only extract paragraph, header, list, and image caption blocks.
    parsed_content = content
    if isinstance(content, str):
        try:
            parsed_content = json.loads(content)
        except (TypeError, ValueError):
            return _clean_editor_text(content)[:max_chars]

    if not isinstance(parsed_content, dict):
        return ""

    blocks = parsed_content.get('blocks', [])
    if not isinstance(blocks, list):
        return ""

    chunks = []
    # Recursively extract text from list items in Editor.js format
    for block in blocks:
        if not isinstance(block, dict):
            continue

        block_type = block.get('type')
        data = block.get('data', {}) or {}

        if block_type in {'paragraph', 'header'}:
            text = _clean_editor_text(data.get('text'))
            if text:
                chunks.append(text)
            continue

        if block_type == 'list':
            for item_text in _flatten_list_items(data.get('items')):
                chunks.append(f"- {item_text}")
            continue

        if block_type == 'image':
            caption = _clean_editor_text(data.get('caption'))
            if caption:
                chunks.append(f"Image caption: {caption}")

    combined_text = "\n\n".join(chunks).strip()
    return combined_text[:max_chars]


def compute_content_hash(content):
    # we are hashing the content to detect changes for caching summaries
    if content is None:
        return ""

    if isinstance(content, str):
        normalized = content
    else:
        # For dicts/lists, serialize to JSON with sorted keys for consistent hashing
        normalized = json.dumps(content, sort_keys=True, separators=(',', ':'))

    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()
