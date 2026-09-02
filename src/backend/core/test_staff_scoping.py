"""Tests that StaffViewSet locks Store Manager to their own store's staff
(read-only), while Chain Manager/Admin can browse any store and remain the
only role allowed to create/edit/delete staff (core/views.py)."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Role, Staff, Store


class StaffScopingTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='HCMC')

        chain_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]

        self.chain_manager = Staff.objects.create_user(
            username='staffscope_chain_manager', password='password123', full_name='Chain Manager', role=chain_role, store=None,
        )
        self.store_manager_a = Staff.objects.create_user(
            username='staffscope_store_manager_a', password='password123', full_name='Manager A', role=manager_role, store=self.store_a,
        )
        self.store_manager_b = Staff.objects.create_user(
            username='staffscope_store_manager_b', password='password123', full_name='Manager B', role=manager_role, store=self.store_b,
        )

    def test_store_manager_only_sees_own_store_staff(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('staff-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(
            {row['staff_id'] for row in res.data},
            {self.store_manager_a.staff_id},
        )

    def test_store_manager_cannot_use_store_param_to_see_another_store(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('staff-list'), {'store': self.store_b.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(
            {row['staff_id'] for row in res.data},
            {self.store_manager_a.staff_id},
        )

    def test_chain_manager_sees_all_stores_by_default(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.get(reverse('staff-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(
            {row['staff_id'] for row in res.data},
            {self.chain_manager.staff_id, self.store_manager_a.staff_id, self.store_manager_b.staff_id},
        )

    def test_chain_manager_can_filter_by_store(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.get(reverse('staff-list'), {'store': self.store_b.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(
            {row['staff_id'] for row in res.data},
            {self.store_manager_b.staff_id},
        )

    def test_store_manager_cannot_create_staff(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.post(
            reverse('staff-list'),
            {'username': 'newhire', 'password': 'password123', 'full_name': 'New Hire', 'role': self.store_manager_a.role_id, 'store': self.store_a.store_id},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
