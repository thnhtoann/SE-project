"""Tests that StoreInventoryViewSet locks Store Manager/Cashier to their own
store, while Chain Manager/Admin can browse any store (core/views.py)."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Batch, Category, Product, Role, Staff, Store, StoreInventory


class StoreInventoryScopingTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='HCMC')

        category = Category.objects.create(category_name='Snacks')
        product = Product.objects.create(barcode='SCOPE-1', product_name='Chips', base_price='10000.00', min_threshold=5, category=category)
        batch = Batch.objects.create(product=product, manufacture_date='2026-01-01', expiration_date='2026-12-31')

        self.inv_a = StoreInventory.objects.create(store=self.store_a, batch=batch, quantity=10)
        self.inv_b = StoreInventory.objects.create(store=self.store_b, batch=batch, quantity=20)

        chain_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]

        self.chain_manager = Staff.objects.create_user(
            username='scope_chain_manager', password='password123', full_name='Chain Manager', role=chain_role, store=None,
        )
        self.store_manager_a = Staff.objects.create_user(
            username='scope_store_manager_a', password='password123', full_name='Manager A', role=manager_role, store=self.store_a,
        )

    def test_store_manager_only_sees_own_store(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('storeinventory-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([row['id'] for row in res.data], [self.inv_a.id])

    def test_store_manager_cannot_use_store_param_to_see_another_store(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('storeinventory-list'), {'store': self.store_b.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([row['id'] for row in res.data], [self.inv_a.id])

    def test_chain_manager_sees_all_stores_by_default(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.get(reverse('storeinventory-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertCountEqual([row['id'] for row in res.data], [self.inv_a.id, self.inv_b.id])

    def test_chain_manager_can_filter_by_store(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.get(reverse('storeinventory-list'), {'store': self.store_b.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([row['id'] for row in res.data], [self.inv_b.id])

    def test_store_manager_cannot_create_inventory_for_another_store(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.post(reverse('storeinventory-list'), {'store': self.store_b.store_id, 'batch': self.inv_b.batch_id, 'quantity': 5}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
