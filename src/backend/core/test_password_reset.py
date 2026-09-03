"""Tests for the password-reset OTP request endpoint (core/views.py
PasswordResetRequestOTPView). Deliberately reveals whether an account
exists -- a product decision to trade account-enumeration resistance for a
clearer error message (see the view's docstring)."""
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Role, Staff


class PasswordResetRequestOTPTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        role = Role.objects.get_or_create(role_name='Cashier')[0]
        self.staff = Staff.objects.create_user(
            username='reset_user', password='password123', full_name='Reset User',
            role=role, email='reset.user@example.com',
        )
        self.no_email_staff = Staff.objects.create_user(
            username='no_email_user', password='password123', full_name='No Email User', role=role,
        )

    def test_missing_identifier_rejected(self):
        res = self.client.post(reverse('password-reset-request-otp'), {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data['error_code'], 'missing_identifier')

    def test_unknown_identifier_returns_account_not_found(self):
        res = self.client.post(reverse('password-reset-request-otp'), {'identifier': 'nobody'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data['error_code'], 'account_not_found')

    def test_account_without_email_returns_account_not_found(self):
        res = self.client.post(reverse('password-reset-request-otp'), {'identifier': 'no_email_user'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data['error_code'], 'account_not_found')

    @patch('core.views.send_mail')
    def test_known_username_sends_otp(self, mock_send_mail):
        res = self.client.post(reverse('password-reset-request-otp'), {'identifier': 'reset_user'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mock_send_mail.assert_called_once()
        self.assertEqual(mock_send_mail.call_args.kwargs['recipient_list'], ['reset.user@example.com'])

    @patch('core.views.send_mail')
    def test_known_email_case_insensitive_sends_otp(self, mock_send_mail):
        res = self.client.post(reverse('password-reset-request-otp'), {'identifier': 'RESET.USER@EXAMPLE.COM'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mock_send_mail.assert_called_once()
