from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from google.genai.errors import ClientError

from .ai_summarizer import SummaryGenerationError, summarize_with_gemini


def _rate_limit_error(*, quota_id, retry_delay="47s"):
    return ClientError(
        429,
        {
            "error": {
                "code": 429,
                "message": "Quota exceeded.",
                "status": "RESOURCE_EXHAUSTED",
                "details": [
                    {
                        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                        "violations": [
                            {
                                "quotaId": quota_id,
                                "quotaMetric": "generativelanguage.googleapis.com/generate_content_requests",
                            }
                        ],
                    },
                    {
                        "@type": "type.googleapis.com/google.rpc.RetryInfo",
                        "retryDelay": retry_delay,
                    },
                ],
            }
        },
        None,
    )


class AISummarizerTests(SimpleTestCase):
    @override_settings(
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3-flash-preview",
        GEMINI_FALLBACK_MODELS=["gemini-2.5-flash", "gemini-2.0-flash"],
        GEMINI_SUMMARY_MAX_OUTPUT_TOKENS=300,
    )
    @patch("users.ai_summarizer.genai.Client")
    def test_success_returns_summary_and_primary_model(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content.return_value = SimpleNamespace(
            text="Sentence one. Sentence two. Sentence three."
        )

        result = summarize_with_gemini(
            title="My title",
            text="My post body.",
            post_id=31,
            request_id="req-success",
        )

        self.assertEqual(result["summary"], "Sentence one. Sentence two. Sentence three.")
        self.assertEqual(result["model_used"], "gemini-3-flash-preview")
        self.assertEqual(mock_client.models.generate_content.call_count, 1)

    @override_settings(
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3-flash-preview",
        GEMINI_FALLBACK_MODELS=["gemini-2.5-flash"],
        GEMINI_SUMMARY_MAX_OUTPUT_TOKENS=300,
    )
    @patch("users.ai_summarizer.genai.Client")
    def test_incomplete_output_retries_once_on_same_model(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content.side_effect = [
            SimpleNamespace(text="This summary is incomplete and"),
            SimpleNamespace(text="This summary is now complete."),
        ]

        with self.assertLogs("users.ai_summarizer", level="INFO") as captured:
            result = summarize_with_gemini(
                title="My title",
                text="My post body.",
                post_id=31,
                request_id="req-incomplete-retry",
            )

        self.assertEqual(result["summary"], "This summary is now complete.")
        self.assertEqual(result["model_used"], "gemini-3-flash-preview")
        self.assertEqual(mock_client.models.generate_content.call_count, 2)
        self.assertTrue(any("RETRY_REASON=INCOMPLETE_OUTPUT" in line for line in captured.output))

    @override_settings(
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3-flash-preview",
        GEMINI_FALLBACK_MODELS=["gemini-2.5-flash"],
        GEMINI_SUMMARY_MAX_OUTPUT_TOKENS=300,
    )
    @patch("users.ai_summarizer.genai.Client")
    def test_incomplete_output_after_retry_raises_incomplete_error(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content.side_effect = [
            SimpleNamespace(text="First incomplete summary and"),
            SimpleNamespace(text="Second incomplete summary because"),
        ]

        with self.assertRaises(SummaryGenerationError) as raised:
            summarize_with_gemini(
                title="My title",
                text="My post body.",
                post_id=31,
                request_id="req-incomplete-fail",
            )

        exc = raised.exception
        self.assertEqual(exc.error_code, "INCOMPLETE_OUTPUT")
        self.assertEqual(exc.model_used, "gemini-3-flash-preview")
        self.assertEqual(exc.http_status, 502)

    @override_settings(
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3-flash-preview",
        GEMINI_FALLBACK_MODELS=["gemini-2.5-flash"],
        GEMINI_SUMMARY_MAX_OUTPUT_TOKENS=300,
    )
    @patch("users.ai_summarizer.genai.Client")
    def test_429_rpm_switches_to_fallback_model(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content.side_effect = [
            _rate_limit_error(
                quota_id="GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
                retry_delay="42s",
            ),
            SimpleNamespace(text="Fallback model summary is complete."),
        ]

        with self.assertLogs("users.ai_summarizer", level="INFO") as captured:
            result = summarize_with_gemini(
                title="My title",
                text="My post body.",
                post_id=31,
                request_id="req-rpm-fallback",
            )

        self.assertEqual(result["model_used"], "gemini-2.5-flash")
        self.assertEqual(mock_client.models.generate_content.call_count, 2)
        first_call = mock_client.models.generate_content.call_args_list[0].kwargs
        second_call = mock_client.models.generate_content.call_args_list[1].kwargs
        self.assertEqual(first_call["model"], "gemini-3-flash-preview")
        self.assertEqual(second_call["model"], "gemini-2.5-flash")
        self.assertTrue(any("RETRY_REASON=RATE_LIMIT_429" in line for line in captured.output))

    @override_settings(
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3-flash-preview",
        GEMINI_FALLBACK_MODELS=[],
        GEMINI_SUMMARY_MAX_OUTPUT_TOKENS=300,
    )
    @patch("users.ai_summarizer.genai.Client")
    def test_429_rpd_is_classified_with_retry_after(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content.side_effect = _rate_limit_error(
            quota_id="GenerateRequestsPerDayPerProjectPerModel-FreeTier",
            retry_delay="3600s",
        )

        with self.assertRaises(SummaryGenerationError) as raised:
            summarize_with_gemini(
                title="My title",
                text="My post body.",
                post_id=31,
                request_id="req-rpd",
            )

        exc = raised.exception
        self.assertEqual(exc.error_code, "RATE_LIMIT_RPD_EXCEEDED")
        self.assertEqual(exc.http_status, 429)
        self.assertEqual(exc.retry_after_seconds, 3600)
        self.assertIn("tomorrow", exc.user_message.lower())

    @override_settings(
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3-flash-preview",
        GEMINI_FALLBACK_MODELS=["gemini-2.5-flash"],
        GEMINI_SUMMARY_MAX_OUTPUT_TOKENS=300,
    )
    @patch("users.ai_summarizer.genai.Client")
    def test_non_rate_limit_provider_error_does_not_switch_models(self, mock_client_cls):
        mock_client = mock_client_cls.return_value
        mock_client.models.generate_content.side_effect = ClientError(
            500,
            {"error": {"code": 500, "message": "Internal provider error."}},
            None,
        )

        with self.assertRaises(SummaryGenerationError) as raised:
            summarize_with_gemini(
                title="My title",
                text="My post body.",
                post_id=31,
                request_id="req-provider-error",
            )

        exc = raised.exception
        self.assertEqual(exc.error_code, "PROVIDER_ERROR")
        self.assertEqual(mock_client.models.generate_content.call_count, 1)

    @override_settings(
        GEMINI_API_KEY="",
        GEMINI_MODEL="gemini-3-flash-preview",
        GEMINI_FALLBACK_MODELS=["gemini-2.5-flash"],
        GEMINI_SUMMARY_MAX_OUTPUT_TOKENS=300,
    )
    def test_missing_api_key_raises_provider_error(self):
        with self.assertRaises(SummaryGenerationError) as raised:
            summarize_with_gemini(
                title="My title",
                text="My post body.",
                post_id=31,
                request_id="req-missing-key",
            )

        exc = raised.exception
        self.assertEqual(exc.error_code, "PROVIDER_ERROR")
        self.assertEqual(exc.http_status, 502)
