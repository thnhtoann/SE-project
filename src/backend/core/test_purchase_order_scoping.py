"""Tests that PurchaseOrderViewSet/ShipmentViewSet lock Store Manager to their own
store, while Chain Manager/Admin can browse any store (core/views.py)."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import PurchaseOrder, Role, Staff, Store, Supplier


class PurchaseOrderScopingTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='HCMC')
        self.supplier = Supplier.objects.create(supplier_name='ACME Foods', contact_phone='0900000000')

        self.po_a = PurchaseOrder.objects.create(supplier=self.supplier, store=self.store_a, order_date='2026-01-01')
        self.po_b = PurchaseOrder.objects.create(supplier=self.supplier, store=self.store_b, order_date='2026-01-01')

        chain_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]

        self.chain_manager = Staff.objects.create_user(
            username='po_scope_chain_manager', password='password123', full_name='Chain Manager', role=chain_role, store=None,
        )
        self.store_manager_a = Staff.objects.create_user(
            username='po_scope_store_manager_a', password='password123', full_name='Manager A', role=manager_role, store=self.store_a,
        )

    def test_store_manager_only_sees_own_store(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('purchaseorder-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([row['po_id'] for row in res.data], [self.po_a.po_id])

    def test_store_manager_cannot_use_store_param_to_see_another_store(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('purchaseorder-list'), {'store': self.store_b.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([row['po_id'] for row in res.data], [self.po_a.po_id])

    def test_chain_manager_sees_all_stores_by_default(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.get(reverse('purchaseorder-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertCountEqual([row['po_id'] for row in res.data], [self.po_a.po_id, self.po_b.po_id])

    def test_chain_manager_can_filter_by_store(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.get(reverse('purchaseorder-list'), {'store': self.store_b.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([row['po_id'] for row in res.data], [self.po_b.po_id])

    def test_store_manager_cannot_create_po_for_another_store(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.post(
            reverse('purchaseorder-list'),
            {'supplier': self.supplier.supplier_id, 'store': self.store_b.store_id, 'order_date': '2026-02-01'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_store_manager_can_create_po_for_own_store(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.post(
            reverse('purchaseorder-list'),
            {'supplier': self.supplier.supplier_id, 'store': self.store_a.store_id, 'order_date': '2026-02-01'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['store'], self.store_a.store_id)

    def test_create_without_store_rejected(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.post(
            reverse('purchaseorder-list'),
            {'supplier': self.supplier.supplier_id, 'order_date': '2026-02-01'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('store', res.data)


class ShipmentScopingTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='HCMC')
        supplier = Supplier.objects.create(supplier_name='ACME Foods', contact_phone='0900000000')

        self.po_a = PurchaseOrder.objects.create(supplier=supplier, store=self.store_a, order_date='2026-01-01')
        self.po_b = PurchaseOrder.objects.create(supplier=supplier, store=self.store_b, order_date='2026-01-01')

        manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        self.store_manager_a = Staff.objects.create_user(
            username='shipment_scope_manager_a', password='password123', full_name='Manager A', role=manager_role, store=self.store_a,
        )

    def test_store_manager_only_sees_own_store_shipments(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('shipment-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([row['po_id'] for row in res.data], [self.po_a.po_id])
