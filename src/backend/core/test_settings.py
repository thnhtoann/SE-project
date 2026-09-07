"""Tests for the Settings > Store backend (BusinessProfile, PaymentMethodSetting,
MarketplaceChannelSetting -- core/views.py)."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import MarketplaceChannelSetting, PaymentMethodSetting, Role, Staff


class SettingsApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        store_manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.store_manager = Staff.objects.create_user(username='settings_store_mgr', password='password123', full_name='Store Mgr', role=store_manager_role)
        self.chain_manager = Staff.objects.create_user(username='settings_chain_mgr', password='password123', full_name='Chain Mgr', role=chain_manager_role)

    def test_business_profile_seeded_and_readable_by_store_manager(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.get(reverse('business-profile'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['currency'], 'VND')

    def test_business_profile_store_manager_cannot_write(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.put(reverse('business-profile'), {'store_name': 'Hacked'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_business_profile_chain_manager_can_write(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.put(reverse('business-profile'), {'store_name': 'Mart+ Central', 'tax_id': '0312345678'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['store_name'], 'Mart+ Central')

        # Idempotent -- always the same pk=1 row, not a new one each time.
        res2 = self.client.get(reverse('business-profile'))
        self.assertEqual(res2.data['store_name'], 'Mart+ Central')
        self.assertEqual(res2.data['id'], res.data['id'])

    def test_payment_method_settings_seeded(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.get(reverse('paymentmethodsetting-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        methods = {row['method'] for row in res.data}
        self.assertEqual(methods, {'Cash', 'Card', 'MoMo', 'Online Banking'})

    def test_payment_method_toggle_requires_chain_manager(self):
        cash = PaymentMethodSetting.objects.get(method='Cash')

        self.client.force_authenticate(user=self.store_manager)
        res = self.client.patch(reverse('paymentmethodsetting-detail', kwargs={'pk': cash.pk}), {'enabled': False}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.patch(reverse('paymentmethodsetting-detail', kwargs={'pk': cash.pk}), {'enabled': False}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertFalse(PaymentMethodSetting.objects.get(pk=cash.pk).enabled)

    def test_marketplace_channel_settings_seeded_and_excludes_lazada(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.get(reverse('marketplacechannelsetting-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        channels = {row['channel'] for row in res.data}
        self.assertEqual(channels, {'GrabMart', 'ShopeeFood', 'BeMart', 'Shopee', 'TikTok Shop'})
        self.assertNotIn('Lazada', channels)

    def test_marketplace_channel_connect_requires_chain_manager(self):
        grabmart = MarketplaceChannelSetting.objects.get(channel='GrabMart')

        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.patch(
            reverse('marketplacechannelsetting-detail', kwargs={'pk': grabmart.pk}),
            {'connected': True, 'store_partner_id': 'GM-1'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertTrue(MarketplaceChannelSetting.objects.get(pk=grabmart.pk).connected)
