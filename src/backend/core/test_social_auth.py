"""Tests for Google/Facebook social login (core/views.py GoogleLoginView, FacebookLoginView)."""
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Role, Staff


@override_settings(GOOGLE_OAUTH_CLIENT_ID='test-client-id')
class GoogleLoginTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('auth-google')

    def _mock_response(self, status_code, json_data):
        class _Resp:
            def __init__(_self):
                _self.status_code = status_code

            def json(_self):
                return json_data
        return _Resp()

    def test_missing_token_rejected(self):
        res = self.client.post(self.url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data['error_code'], 'access_token_missing')

    @override_settings(GOOGLE_OAUTH_CLIENT_ID='')
    def test_not_configured(self):
        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(res.data['error_code'], 'oauth_not_configured')

    @patch('core.views.requests.get')
    def test_wrong_audience_rejected(self, mock_get):
        mock_get.return_value = self._mock_response(200, {'aud': 'someone-elses-client-id'})
        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res.data['error_code'], 'google_token_invalid')

    @patch('core.views.requests.get')
    def test_unverified_email_rejected(self, mock_get):
        def fake_get(url, params=None, headers=None, timeout=None):
            if 'tokeninfo' in url:
                return self._mock_response(200, {'aud': 'test-client-id'})
            return self._mock_response(200, {'email': 'new@example.com', 'email_verified': False, 'name': 'New Person'})
        mock_get.side_effect = fake_get

        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res.data['error_code'], 'email_not_verified')

    @patch('core.views.requests.get')
    def test_new_email_creates_chain_manager(self, mock_get):
        def fake_get(url, params=None, headers=None, timeout=None):
            if 'tokeninfo' in url:
                return self._mock_response(200, {'aud': 'test-client-id'})
            return self._mock_response(200, {'email': 'new.person@example.com', 'email_verified': True, 'name': 'New Person'})
        mock_get.side_effect = fake_get

        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

        staff = Staff.objects.get(email='new.person@example.com')
        self.assertEqual(staff.role.role_name, 'Chain Manager')
        self.assertFalse(staff.has_usable_password())
        self.assertEqual(res.data['username'], staff.username)

    @patch('core.views.requests.get')
    def test_existing_email_reuses_staff(self, mock_get):
        role = Role.objects.get_or_create(role_name='Cashier')[0]
        existing = Staff.objects.create_user(
            username='existing_cashier', password='password123', full_name='Existing', role=role, email='existing@example.com',
        )

        def fake_get(url, params=None, headers=None, timeout=None):
            if 'tokeninfo' in url:
                return self._mock_response(200, {'aud': 'test-client-id'})
            return self._mock_response(200, {'email': 'existing@example.com', 'email_verified': True, 'name': 'Existing'})
        mock_get.side_effect = fake_get

        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['username'], existing.username)
        self.assertEqual(Staff.objects.filter(email='existing@example.com').count(), 1)

    @patch('core.views.requests.get')
    def test_disabled_account_rejected(self, mock_get):
        role = Role.objects.get_or_create(role_name='Cashier')[0]
        Staff.objects.create_user(
            username='disabled_staff', password='password123', full_name='Disabled', role=role,
            email='disabled@example.com', is_active=False,
        )

        def fake_get(url, params=None, headers=None, timeout=None):
            if 'tokeninfo' in url:
                return self._mock_response(200, {'aud': 'test-client-id'})
            return self._mock_response(200, {'email': 'disabled@example.com', 'email_verified': True, 'name': 'Disabled'})
        mock_get.side_effect = fake_get

        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data['error_code'], 'account_disabled')


@override_settings(FACEBOOK_APP_ID='test-app-id', FACEBOOK_APP_SECRET='test-app-secret')
class FacebookLoginTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse('auth-facebook')

    def _mock_response(self, json_data):
        class _Resp:
            def json(_self):
                return json_data
        return _Resp()

    def test_missing_token_rejected(self):
        res = self.client.post(self.url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data['error_code'], 'access_token_missing')

    @override_settings(FACEBOOK_APP_ID='', FACEBOOK_APP_SECRET='')
    def test_not_configured(self):
        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(res.data['error_code'], 'oauth_not_configured')

    @patch('core.views.requests.get')
    def test_invalid_token_rejected(self, mock_get):
        mock_get.return_value = self._mock_response({'data': {'is_valid': False}})
        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res.data['error_code'], 'facebook_token_invalid')

    @patch('core.views.requests.get')
    def test_wrong_app_id_rejected(self, mock_get):
        mock_get.return_value = self._mock_response({'data': {'is_valid': True, 'app_id': 'someone-elses-app'}})
        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res.data['error_code'], 'facebook_token_invalid')

    @patch('core.views.requests.get')
    def test_missing_email_rejected(self, mock_get):
        def fake_get(url, params=None, timeout=None):
            if 'debug_token' in url:
                return self._mock_response({'data': {'is_valid': True, 'app_id': 'test-app-id'}})
            return self._mock_response({'id': '123', 'name': 'No Email'})
        mock_get.side_effect = fake_get

        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data['error_code'], 'facebook_email_missing')

    @patch('core.views.requests.get')
    def test_new_email_creates_chain_manager(self, mock_get):
        def fake_get(url, params=None, timeout=None):
            if 'debug_token' in url:
                return self._mock_response({'data': {'is_valid': True, 'app_id': 'test-app-id'}})
            return self._mock_response({'id': '123', 'name': 'FB Person', 'email': 'fb.person@example.com'})
        mock_get.side_effect = fake_get

        res = self.client.post(self.url, {'access_token': 'abc'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertIn('access', res.data)

        staff = Staff.objects.get(email='fb.person@example.com')
        self.assertEqual(staff.role.role_name, 'Chain Manager')
        self.assertFalse(staff.has_usable_password())
