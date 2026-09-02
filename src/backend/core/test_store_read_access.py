"""Tests that StoreViewSet allows read access to any role above Cashier
(previously Chain-Manager-only even for GET, which silently broke every
screen -- Inventory, Staff, dashboards -- that needs to resolve store names
for a Store Manager/Cashier), and that LowStockAlertViewSet scopes alerts by
store the same way StoreInventoryViewSet/StaffViewSet do (core/views.py)."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Batch, Category, InventoryAlert, Product, Role, Staff, Store


class StoreReadAccessTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.store = Store.objects.create(store_name='Store A', location='HCMC')
        manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        self.store_manager = Staff.objects.create_user(
            username='readaccess_store_manager', password='password123', full_name='Manager', role=manager_role, store=self.store,
        )

    def test_store_manager_can_list_stores(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.get(reverse('store-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

    def test_store_manager_cannot_create_store(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.post(reverse('store-list'), {'store_name': 'New Store', 'location': 'HCMC'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class LowStockAlertScopingTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='HCMC')

        category = Category.objects.create(category_name='Snacks')
        self.product = Product.objects.create(barcode='ALERT-1', product_name='Chips', base_price='10000.00', min_threshold=100, category=category)

        self.alert_a = InventoryAlert.objects.create(product=self.product, store=self.store_a, current_stock=0, min_threshold=100, is_resolved=False)
        self.alert_b = InventoryAlert.objects.create(product=self.product, store=self.store_b, current_stock=0, min_threshold=100, is_resolved=False)

        manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        chain_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.store_manager_a = Staff.objects.create_user(
            username='alertscope_store_manager_a', password='password123', full_name='Manager A', role=manager_role, store=self.store_a,
        )
        self.chain_manager = Staff.objects.create_user(
            username='alertscope_chain_manager', password='password123', full_name='Chain Manager', role=chain_role, store=None,
        )

    def test_store_manager_only_sees_own_store_alerts(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('low-stock-alert-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([row['alert_id'] for row in res.data], [self.alert_a.alert_id])

    def test_chain_manager_sees_all_stores_alerts(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.get(reverse('low-stock-alert-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertCountEqual([row['alert_id'] for row in res.data], [self.alert_a.alert_id, self.alert_b.alert_id])
