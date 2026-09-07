"""Tests for branch (Store) auto-assignment on account creation and the
role-hierarchy branch transfer (core/views.py StaffViewSet.transfer_store)."""
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Role, Staff, Store


class RegisterDefaultStoreTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.main_store = Store.objects.create(store_name='Main Branch', location='HCMC')
        Store.objects.create(store_name='Second Branch', location='HN')  # higher store_id

    def test_self_registration_assigned_to_main_branch(self):
        with patch('core.views.send_mail'):
            req_res = self.client.post(reverse('register-request-otp'), {
                'username': 'new_manager', 'full_name': 'New Manager',
                'email': 'new.manager@example.com', 'password': 'StrongPass123!',
            }, format='json')
        self.assertEqual(req_res.status_code, status.HTTP_200_OK, req_res.data)

        from django.core.cache import cache
        pending = cache.get('pending_registration_new.manager@example.com')
        verify_res = self.client.post(reverse('register-verify-otp'), {
            'email': 'new.manager@example.com', 'otp': pending['otp'],
        }, format='json')
        self.assertEqual(verify_res.status_code, status.HTTP_201_CREATED, verify_res.data)

        staff = Staff.objects.get(username='new_manager')
        self.assertEqual(staff.store, self.main_store)

    def test_no_stores_leaves_branch_unset(self):
        Store.objects.all().delete()
        with patch('core.views.send_mail'):
            self.client.post(reverse('register-request-otp'), {
                'username': 'no_store_mgr', 'full_name': 'No Store Mgr',
                'email': 'no.store@example.com', 'password': 'StrongPass123!',
            }, format='json')

        from django.core.cache import cache
        pending = cache.get('pending_registration_no.store@example.com')
        self.client.post(reverse('register-verify-otp'), {'email': 'no.store@example.com', 'otp': pending['otp']}, format='json')

        staff = Staff.objects.get(username='no_store_mgr')
        self.assertIsNone(staff.store)


class TransferStoreTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.store_a = Store.objects.create(store_name='Branch A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Branch B', location='HN')

        self.chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.store_manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        self.cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]

        self.chain_manager = Staff.objects.create_user(
            username='cm', password='password123', full_name='Chain Mgr',
            role=self.chain_manager_role, store=self.store_a,
        )
        self.store_manager = Staff.objects.create_user(
            username='sm', password='password123', full_name='Store Mgr',
            role=self.store_manager_role, store=self.store_a,
        )
        self.other_store_manager = Staff.objects.create_user(
            username='sm2', password='password123', full_name='Store Mgr 2',
            role=self.store_manager_role, store=self.store_a,
        )
        self.cashier = Staff.objects.create_user(
            username='cashier', password='password123', full_name='Cashier',
            role=self.cashier_role, store=self.store_a,
        )

    def _transfer(self, actor, target, store_id):
        self.client.force_authenticate(user=actor)
        url = reverse('staff-transfer-store', kwargs={'pk': target.pk})
        return self.client.patch(url, {'store': store_id}, format='json')

    def test_chain_manager_can_transfer_anyone(self):
        res = self._transfer(self.chain_manager, self.cashier, self.store_b.store_id)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.cashier.refresh_from_db()
        self.assertEqual(self.cashier.store, self.store_b)

    def test_chain_manager_can_transfer_self(self):
        res = self._transfer(self.chain_manager, self.chain_manager, self.store_b.store_id)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.chain_manager.refresh_from_db()
        self.assertEqual(self.chain_manager.store, self.store_b)

    def test_store_manager_can_transfer_cashier(self):
        res = self._transfer(self.store_manager, self.cashier, self.store_b.store_id)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.cashier.refresh_from_db()
        self.assertEqual(self.cashier.store, self.store_b)

    def test_store_manager_cannot_transfer_self(self):
        res = self._transfer(self.store_manager, self.store_manager, self.store_b.store_id)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.store_manager.refresh_from_db()
        self.assertEqual(self.store_manager.store, self.store_a)

    def test_store_manager_cannot_transfer_peer_store_manager(self):
        res = self._transfer(self.store_manager, self.other_store_manager, self.store_b.store_id)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_cashier_cannot_transfer_anyone(self):
        res = self._transfer(self.cashier, self.cashier, self.store_b.store_id)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unassign_branch_with_null_store(self):
        res = self._transfer(self.chain_manager, self.cashier, None)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.cashier.refresh_from_db()
        self.assertIsNone(self.cashier.store)

    def test_nonexistent_store_rejected(self):
        res = self._transfer(self.chain_manager, self.cashier, 999999)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
