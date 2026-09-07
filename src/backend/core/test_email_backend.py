"""Tests for core/email_backend.py::ResendEmailBackend."""
from unittest.mock import Mock, patch

from django.core.mail import EmailMessage
from django.test import TestCase, override_settings

from core.email_backend import ResendEmailBackend


def _message():
    return EmailMessage(
        subject='Test OTP', body='Your code is 123456',
        from_email='no-reply@example.com', to=['user@example.com'],
    )


class ResendEmailBackendTests(TestCase):
    @override_settings(RESEND_API_KEY='test-key')
    @patch('core.email_backend.requests.post')
    def test_sends_message_via_resend_api(self, mock_post):
        mock_post.return_value = Mock(status_code=200, text='{}')

        sent = ResendEmailBackend().send_messages([_message()])

        self.assertEqual(sent, 1)
        call = mock_post.call_args
        self.assertEqual(call.args[0], 'https://api.resend.com/emails')
        self.assertEqual(call.kwargs['headers']['Authorization'], 'Bearer test-key')
        self.assertEqual(call.kwargs['json']['to'], ['user@example.com'])
        self.assertEqual(call.kwargs['json']['subject'], 'Test OTP')

    @override_settings(RESEND_API_KEY='')
    def test_missing_api_key_raises_by_default(self):
        with self.assertRaises(ValueError):
            ResendEmailBackend().send_messages([_message()])

    @override_settings(RESEND_API_KEY='')
    def test_missing_api_key_silent_when_fail_silently(self):
        sent = ResendEmailBackend(fail_silently=True).send_messages([_message()])
        self.assertEqual(sent, 0)

    @override_settings(RESEND_API_KEY='test-key')
    @patch('core.email_backend.requests.post')
    def test_api_error_raises_by_default(self, mock_post):
        mock_post.return_value = Mock(status_code=422, text='{"message": "invalid from"}')

        with self.assertRaises(Exception):
            ResendEmailBackend().send_messages([_message()])

    @override_settings(RESEND_API_KEY='test-key')
    @patch('core.email_backend.requests.post')
    def test_api_error_silent_when_fail_silently(self, mock_post):
        mock_post.return_value = Mock(status_code=500, text='error')

        sent = ResendEmailBackend(fail_silently=True).send_messages([_message()])
        self.assertEqual(sent, 0)

    def test_empty_message_list_returns_zero(self):
        self.assertEqual(ResendEmailBackend().send_messages([]), 0)
