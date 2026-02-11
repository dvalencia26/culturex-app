import logging
import re
from dataclasses import dataclass

from django.conf import settings
from google import genai
from google.genai import types
from google.genai.errors import ClientError


logger = logging.getLogger(__name__) 

PROVIDER_NAME = "gemini"
DEFAULT_PRIMARY_MODEL = "gemini-3-flash-preview"
DEFAULT_FALLBACK_MODELS = ("gemini-2.5-flash", "gemini-2.0-flash")
RETRY_REASON_INCOMPLETE_OUTPUT = "INCOMPLETE_OUTPUT"
RETRY_REASON_RATE_LIMIT_429 = "RATE_LIMIT_429"

# Custom exception to encapsulate summary generation errors with rich context for both developers and users.
@dataclass
class SummaryGenerationError(Exception):
    error_code: str
    backend_message: str
    user_message: str
    model_used: str
    http_status: int | None = None
    provider_error_message: str = ""
    retry_after_seconds: int | None = None

    def __str__(self):
        return self.backend_message


def get_summary_model_name():
    configured = getattr(settings, "GEMINI_MODEL", "")
    if not isinstance(configured, str):
        return DEFAULT_PRIMARY_MODEL
    configured = configured.strip()
    return configured or DEFAULT_PRIMARY_MODEL

# Builds the ordered list of models to attempt for summarization, starting with the primary model and followed by any configured fallbacks. 
# Ensures all entries are valid strings and removes duplicates while preserving order.
def get_summary_model_chain():
    primary = get_summary_model_name()
    configured_fallbacks = getattr(settings, "GEMINI_FALLBACK_MODELS", None)

    if isinstance(configured_fallbacks, (list, tuple)):
        candidates = [primary, *configured_fallbacks]
    else:
        candidates = [primary, *DEFAULT_FALLBACK_MODELS]

    chain = []
    for model in candidates:
        if not isinstance(model, str):
            continue
        normalized = model.strip()
        if normalized and normalized not in chain:
            chain.append(normalized)
    return chain


def _build_summary_prompt(title, text):
    clean_title = (title or "").strip() or "Untitled post"
    clean_text = (text or "").strip()

    if not clean_text:
        raise ValueError("Post text is required for summarization.")

    return (
        "You are a precise summarization assistant.\n"
        "Summarize the post using only the provided title and post text.\n"
        "Do not add facts that are not present in the post.\n"
        "If locations are mentioned or recommended, include them in the summary.\n"
        "Use the same language as the post text.\n"
        "Keep the summary under about 200 words.\n"
        "Write a coherent summary with complete sentences and a clear ending.\n\n"
        f"Title: {clean_title}\n"
        f"Post text: {clean_text}"
    )


def _build_retry_prompt(title, text, previous_output):
    clean_title = (title or "").strip() or "Untitled post"
    clean_text = (text or "").strip()
    clean_previous = (previous_output or "").strip()

    return (
        "Write a complete summary. Do not cut off.\n"
        "Use only facts from the title and post text.\n"
        "If locations are mentioned or recommended, include them in the summary.\n"
        "Use the same language as the post text.\n"
        "Keep it under about 200 words.\n\n"
        f"Title: {clean_title}\n"
        f"Post text: {clean_text}\n"
        f"Previous incomplete output: {clean_previous}"
    )


def _normalize_summary_output(text):
    if not isinstance(text, str):
        raise ValueError("Gemini returned a non-text summary response.")

    normalized = text.strip()
    if not normalized:
        raise ValueError("Gemini returned an empty summary response.")

    if normalized.startswith("```") and normalized.endswith("```"):
        normalized = normalized.strip("`").strip()
        if normalized.lower().startswith("text"):
            normalized = normalized[4:].strip()

    return re.sub(r"\s+", " ", normalized).strip()


def _is_incomplete_summary(text):
    if not text:
        return True
    if not re.search(r"[.!?。！？]$", text):
        return True

    trailing = re.search(r"([A-Za-zÀ-ÿ]+)\s*[.!?。！？]?$", text)
    if trailing:
        token = trailing.group(1).casefold()
        if token in {"and", "or", "but", "because", "y", "o", "pero", "porque", "que"}:
            return True

    if text.count("(") > text.count(")") or text.count('"') % 2 == 1:
        return True

    return False

# Helper to parse retry delay values from headers or error details.
def _parse_seconds(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        if stripped.isdigit():
            return int(stripped)
        match = re.search(r"(\d+(?:\.\d+)?)\s*s", stripped, flags=re.IGNORECASE)
        if match:
            return int(float(match.group(1)))
    return None


def _extract_retry_after_seconds(exc):
    retry_after_seconds = None

    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None) if response is not None else None
    if headers:
        retry_after_seconds = _parse_seconds(headers.get("retry-after") or headers.get("Retry-After"))

    if retry_after_seconds is not None:
        return retry_after_seconds

    details = getattr(exc, "details", None)
    if not isinstance(details, dict):
        return None

    error_data = details.get("error", {})
    if not isinstance(error_data, dict):
        return None

    for item in error_data.get("details", []) or []:
        if not isinstance(item, dict):
            continue
        type_name = item.get("@type", "")
        if not isinstance(type_name, str):
            continue
        if type_name.endswith("RetryInfo"):
            retry_after_seconds = _parse_seconds(item.get("retryDelay"))
            if retry_after_seconds is not None:
                return retry_after_seconds

    return None


def _rate_limit_signals(exc):
    details = getattr(exc, "details", None) # Extract details from the exception
    has_per_day = False
    has_per_minute = False

    if isinstance(details, dict):
        error_data = details.get("error", {})
        if isinstance(error_data, dict):
            for item in error_data.get("details", []) or []:
                if not isinstance(item, dict):
                    continue
                type_name = item.get("@type", "")
                if not isinstance(type_name, str) or not type_name.endswith("QuotaFailure"):
                    continue
                for violation in item.get("violations", []) or []:
                    if not isinstance(violation, dict):
                        continue
                    quota_id = str(violation.get("quotaId", ""))
                    quota_metric = str(violation.get("quotaMetric", ""))
                    quota_blob = f"{quota_id} {quota_metric}".lower()
                    if "perday" in quota_blob:
                        has_per_day = True
                    if "perminute" in quota_blob:
                        has_per_minute = True

    raw_text = str(exc).lower()
    if "per day" in raw_text or "today" in raw_text:
        has_per_day = True
    if "per minute" in raw_text or "retry in" in raw_text:
        has_per_minute = True

    return has_per_day, has_per_minute


def _extract_provider_error_message(exc):
    details = getattr(exc, "details", None)
    if isinstance(details, dict):
        error_data = details.get("error", {})
        if isinstance(error_data, dict):
            message = error_data.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()
    return str(exc).strip()


def _build_rate_limit_error(exc, model_used):
    # Determine status code and extract relevant information from the exception.
    status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None) or 429
    provider_error_message = _extract_provider_error_message(exc)
    retry_after_seconds = _extract_retry_after_seconds(exc)
    has_per_day, has_per_minute = _rate_limit_signals(exc)

    if has_per_day:
        error_code = "RATE_LIMIT_RPD_EXCEEDED"
        user_message = "You've reached today's summary limit. Try again tomorrow."
    elif has_per_minute:
        error_code = "RATE_LIMIT_RPM_EXCEEDED"
        user_message = "Summaries are temporarily busy. Please try again in a minute."
    else:
        error_code = "RATE_LIMIT_UNKNOWN"
        user_message = "Summary service is rate-limited right now. Please try again later."

    developer_message = (
        f"Provider={PROVIDER_NAME} model={model_used} status={status_code} "
        f"rate-limit error_code={error_code} retry_after_seconds={retry_after_seconds} "
        f"raw={provider_error_message}"
    )

    return SummaryGenerationError(
        error_code=error_code,
        backend_message=developer_message,
        user_message=user_message,
        model_used=model_used,
        http_status=429,
        provider_error_message=provider_error_message,
        retry_after_seconds=retry_after_seconds,
    )


def _build_provider_error(exc, model_used):
    status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None) or 502
    provider_error_message = _extract_provider_error_message(exc)
    developer_message = (
        f"Provider={PROVIDER_NAME} model={model_used} status={status_code} "
        f"provider_error={provider_error_message}"
    )

    return SummaryGenerationError(
        error_code="PROVIDER_ERROR",
        backend_message=developer_message,
        user_message="Unable to generate summary right now. Please try again later.",
        model_used=model_used,
        http_status=502,
        provider_error_message=provider_error_message,
    )


def _build_incomplete_error(model_used, output_text):
    preview = (output_text or "")[:300]
    developer_message = (
        f"Provider={PROVIDER_NAME} model={model_used} incomplete summary after retry. "
        f"output_preview={preview}"
    )

    return SummaryGenerationError(
        error_code="INCOMPLETE_OUTPUT",
        backend_message=developer_message,
        user_message="Summary output was incomplete. Please try again.",
        model_used=model_used,
        http_status=502,
        provider_error_message=preview,
    )


# Logging helper to record each summarization attempt with relevant metadata.
def _log_attempt(
    *,
    request_id,
    post_id,
    model_used,
    attempt_number,
    error_code=None,
    http_status=None,
    provider_error_message=None,
    retry_after_seconds=None,
    final_outcome="success",
):
    safe_provider_message = (provider_error_message or "").replace("\n", " ")[:500]
    logger.info(
        "SUMMARY_ATTEMPT request_id=%s post_id=%s model_used=%s attempt_number=%s "
        "error_code=%s http_status=%s provider_error_message=%s retry_after_seconds=%s final_outcome=%s",
        request_id,
        post_id,
        model_used,
        attempt_number,
        error_code,
        http_status,
        safe_provider_message,
        retry_after_seconds,
        final_outcome,
    )

def _generate_summary_text(client, model_name, prompt):
    configured_tokens = int(getattr(settings, "GEMINI_SUMMARY_MAX_OUTPUT_TOKENS", 0))
    max_output_tokens = max(1400, configured_tokens)
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=max_output_tokens,
            temperature=0.2,
        ),
    )
    return _normalize_summary_output(getattr(response, "text", None))


# Attempts to generate a summary using the specified model and prompt, handling errors and logging outcomes.
def _attempt_generate(
    *,
    client,
    model_name,
    prompt,
    request_id,
    post_id,
    attempt_number,
):
    try:
        summary = _generate_summary_text(client=client, model_name=model_name, prompt=prompt)
        _log_attempt(
            request_id=request_id,
            post_id=post_id,
            model_used=model_name,
            attempt_number=attempt_number,
            final_outcome="success",
        )
        return {"ok": True, "summary": summary, "error": None}
    except ClientError as exc:
        status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
        is_rate_limited = status_code == 429 or "RESOURCE_EXHAUSTED" in str(exc)
        summary_error = _build_rate_limit_error(exc, model_name) if is_rate_limited else _build_provider_error(exc, model_name)

        _log_attempt(
            request_id=request_id,
            post_id=post_id,
            model_used=model_name,
            attempt_number=attempt_number,
            error_code=summary_error.error_code,
            http_status=summary_error.http_status,
            provider_error_message=summary_error.provider_error_message,
            retry_after_seconds=summary_error.retry_after_seconds,
            final_outcome="failure",
        )
        return {"ok": False, "summary": None, "error": summary_error}
    except Exception as exc:
        summary_error = SummaryGenerationError(
            error_code="PROVIDER_ERROR",
            backend_message=f"Provider={PROVIDER_NAME} model={model_name} unexpected_error={exc}",
            user_message="Unable to generate summary right now. Please try again later.",
            model_used=model_name,
            http_status=502,
            provider_error_message=str(exc),
        )

        _log_attempt(
            request_id=request_id,
            post_id=post_id,
            model_used=model_name,
            attempt_number=attempt_number,
            error_code=summary_error.error_code,
            http_status=summary_error.http_status,
            provider_error_message=summary_error.provider_error_message,
            retry_after_seconds=None,
            final_outcome="failure",
        )
        return {"ok": False, "summary": None, "error": summary_error}


def summarize_with_gemini(title, text, *, post_id=None, request_id=None):
    api_key = getattr(settings, "GEMINI_API_KEY", "").strip()
    if not api_key:
        raise SummaryGenerationError(
            error_code="PROVIDER_ERROR",
            backend_message="GEMINI_API_KEY is not configured.",
            user_message="Summary service is not configured right now.",
            model_used="",
            http_status=502,
        )

    client = genai.Client(api_key=api_key)
    base_prompt = _build_summary_prompt(title=title, text=text)
    models = get_summary_model_chain()

    attempt_number = 0

    for model_index, model_name in enumerate(models):
        has_next_model = model_index < len(models) - 1
        prompt = base_prompt
        last_summary = None

        # Up to 2 tries per model: initial + one retry for incomplete output.
        for try_index in range(2):
            attempt_number += 1
            result = _attempt_generate(
                client=client,
                model_name=model_name,
                prompt=prompt,
                request_id=request_id,
                post_id=post_id,
                attempt_number=attempt_number,
            )

            if not result["ok"]:
                error = result["error"]
                if error.error_code.startswith("RATE_LIMIT_") and has_next_model:
                    logger.info(
                        "SUMMARY_RETRY_TRIGGER request_id=%s post_id=%s model_used=%s RETRY_REASON=%s",
                        request_id,
                        post_id,
                        model_name,
                        RETRY_REASON_RATE_LIMIT_429,
                    )
                    break
                raise error

            summary = result["summary"]
            last_summary = summary

            if not _is_incomplete_summary(summary):
                return {"summary": summary, "model_used": model_name}

            if try_index == 0:
                logger.info(
                    "SUMMARY_RETRY_TRIGGER request_id=%s post_id=%s model_used=%s RETRY_REASON=%s",
                    request_id,
                    post_id,
                    model_name,
                    RETRY_REASON_INCOMPLETE_OUTPUT,
                )
                prompt = _build_retry_prompt(title=title, text=text, previous_output=summary)
                continue

            raise _build_incomplete_error(model_name, last_summary)

    raise SummaryGenerationError(
        error_code="PROVIDER_ERROR",
        backend_message="All summarization attempts failed without a classified error.",
        user_message="Unable to generate summary right now. Please try again later.",
        model_used="",
        http_status=502,
    )
