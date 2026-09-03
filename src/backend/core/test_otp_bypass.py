"""Tests for the OTP_BYPASS_CODE testing backdoor (settings.OTP_BYPASS_CODE)
-- see core/views.py::_is_otp_bypass. Covers all three OTP-verify endpoints:
register, login, password-reset."""
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import OTPRecord, Role, Staff


@override_settings(OTP_BYPASS_CODE='999999')
class OTPBypassTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.role = Role.objects.get_or_create(role_name='Cashier')[0]
        self.staff = Staff.objects.create_user(
            username='bypass_user', password='password123', full_name='Bypass User',
            role=self.role, email='bypass.user@example.com',
        )

    @patch('core.views.send_mail')
    def test_register_verify_accepts_bypass_code(self, mock_send_mail):
        email = 'new.bypass@example.com'
        res = self.client.post(reverse('register-request-otp'), {
            'username': 'new_bypass_user', 'password': 'StrongPass!2026',
            'full_name': 'New Bypass User', 'email': email,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.post(reverse('register-verify-otp'), {
            'email': email, 'otp': '999999',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Staff.objects.filter(username='new_bypass_user').exists())

    @patch('core.views.send_mail')
    def test_register_verify_rejects_wrong_code_without_bypass(self, mock_send_mail):
        email = 'no.bypass@example.com'
        self.client.post(reverse('register-request-otp'), {
            'username': 'no_bypass_user', 'password': 'StrongPass!2026',
            'full_name': 'No Bypass User', 'email': email,
        }, format='json')

        res = self.client.post(reverse('register-verify-otp'), {
            'email': email, 'otp': '000000',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('core.views.send_mail')
    def test_login_verify_accepts_bypass_code(self, mock_send_mail):
        res = self.client.post(reverse('login-request-otp'), {
            'identifier': 'bypass_user', 'password': 'password123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.post(reverse('login-verify-otp'), {
            'username': 'bypass_user', 'otp': '999999',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)

    @patch('core.views.send_mail')
    def test_password_reset_verify_accepts_bypass_code(self, mock_send_mail):
        res = self.client.post(reverse('password-reset-request-otp'), {
            'identifier': 'bypass_user',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.post(reverse('password-reset-verify-otp'), {
            'identifier': 'bypass_user', 'otp': '999999', 'new_password': 'BrandNewPass!2026',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password('BrandNewPass!2026'))

    @override_settings(OTP_BYPASS_CODE='')
    @patch('core.views.send_mail')
    def test_bypass_code_ignored_when_unset(self, mock_send_mail):
        """Guards against the backdoor being live by accident: with
        OTP_BYPASS_CODE blank (the default), submitting '999999' must be
        treated as an ordinary (wrong) OTP guess, not a bypass."""
        self.client.post(reverse('login-request-otp'), {
            'identifier': 'bypass_user', 'password': 'password123',
        }, format='json')

        res = self.client.post(reverse('login-verify-otp'), {
            'username': 'bypass_user', 'otp': '999999',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
