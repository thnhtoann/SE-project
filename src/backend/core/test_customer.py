"""Tests for the Customer API (core/views.py CustomerViewSet)."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Customer, Role, Staff


class CustomerApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        store_manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        self.store_manager = Staff.objects.create_user(
            username='customer_store_mgr', password='password123', full_name='Store Mgr', role=store_manager_role,
        )
        self.cashier = Staff.objects.create_user(
            username='customer_cashier', password='password123', full_name='Cashier', role=cashier_role,
        )

        self.customer = Customer.objects.create(name='Tran Thi B', email='tran@example.com', phone='0900000000', tier='Gold')

    def test_unauthenticated_rejected(self):
        res = self.client.get(reverse('customer-list'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cashier_forbidden(self):
        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(reverse('customer-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_store_manager_can_list_and_create(self):
        self.client.force_authenticate(user=self.store_manager)

        res = self.client.get(reverse('customer-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

        res = self.client.post(reverse('customer-list'), {'name': 'Le Van C', 'email': 'le@example.com', 'phone': '0911111111', 'tier': 'Silver'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['tier'], 'Silver')
        self.assertEqual(res.data['status'], 'Active')

    def test_defaults_applied(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.post(reverse('customer-list'), {'name': 'No Tier Given'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['tier'], 'Bronze')
        self.assertEqual(res.data['status'], 'Active')
