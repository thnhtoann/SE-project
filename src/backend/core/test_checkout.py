"""Tests for the atomic POS checkout endpoint (POST /api/orders/checkout/)."""
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Batch, Category, Notification, Order, Product, Role, Shift, Staff, Store, StoreInventory


class PosCheckoutApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store = Store.objects.create(store_name='Checkout Store', location='HCMC')
        self.other_store = Store.objects.create(store_name='Other Store', location='HCMC')

        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        self.cashier = Staff.objects.create_user(
            username='checkout_cashier', password='password123',
            full_name='Checkout Cashier', role=cashier_role, store=self.store,
        )
        self.client.force_authenticate(user=self.cashier)

        category = Category.objects.create(category_name='Snacks')
        self.product = Product.objects.create(
            barcode='CHK-1', product_name='Chips', base_price='15000.00',
            min_threshold=5, category=category,
        )
        batch = Batch.objects.create(
            product=self.product, manufacture_date='2026-01-01', expiration_date='2026-12-31',
        )
        self.inventory = StoreInventory.objects.create(store=self.store, batch=batch, quantity=10)

        self.shift = Shift.objects.create(store=self.store, staff=self.cashier, opening_cash='100000.00')

    def _checkout(self, **overrides):
        payload = {
            'store': self.store.store_id,
            'shift': self.shift.shift_id,
            'payment_method': 'Cash',
            'discount_percent': 0,
            'items': [{'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00'}],
        }
        payload.update(overrides)
        return self.client.post(reverse('order-checkout'), payload, format='json')

    def test_happy_path_creates_order_details_and_deducts_stock(self):
        res = self._checkout()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['status'], 'Completed')
        self.assertEqual(res.data['order_type'], 'POS')
        self.assertEqual(len(res.data['details']), 1)
        self.assertEqual(Decimal(res.data['total_amount']), Decimal('30000.00'))

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 8)
        self.assertEqual(Order.objects.filter(shift=self.shift).count(), 1)

    def test_discount_percent_applied_to_total(self):
        res = self._checkout(discount_percent=10)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(Decimal(res.data['total_amount']), Decimal('27000.00'))

    def test_per_item_percent_discount(self):
        res = self._checkout(items=[{
            'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00',
            'discount_type': 'percent', 'discount_value': '10',
        }])
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        # (15000*2) - 10% = 27000
        self.assertEqual(Decimal(res.data['details'][0]['sub_total']), Decimal('27000.00'))
        self.assertEqual(Decimal(res.data['total_amount']), Decimal('27000.00'))

    def test_per_item_amount_discount(self):
        res = self._checkout(items=[{
            'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00',
            'discount_type': 'amount', 'discount_value': '5000',
        }])
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        # (15000*2) - 5000 = 25000
        self.assertEqual(Decimal(res.data['details'][0]['sub_total']), Decimal('25000.00'))
        self.assertEqual(Decimal(res.data['total_amount']), Decimal('25000.00'))

    def test_per_item_amount_discount_capped_at_line_total(self):
        res = self._checkout(items=[{
            'product': self.product.product_id, 'quantity': 1, 'unit_price': '15000.00',
            'discount_type': 'amount', 'discount_value': '999999',
        }])
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(Decimal(res.data['details'][0]['sub_total']), Decimal('0.00'))

    def test_per_item_discount_stacks_with_cart_level_discount(self):
        res = self._checkout(discount_percent=10, items=[{
            'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00',
            'discount_type': 'amount', 'discount_value': '5000',
        }])
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        # Line: 30000 - 5000 = 25000, then -10% cart-level = 22500
        self.assertEqual(Decimal(res.data['total_amount']), Decimal('22500.00'))

    def test_insufficient_stock_rolls_back_whole_order(self):
        res = self._checkout(items=[{'product': self.product.product_id, 'quantity': 999, 'unit_price': '15000.00'}])
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 10)
        self.assertEqual(Order.objects.count(), 0)

    def test_closed_shift_rejected(self):
        self.shift.status = Shift.STATUS_CLOSED
        self.shift.save(update_fields=['status'])

        res = self._checkout()
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)

    def test_shift_from_different_store_rejected(self):
        other_shift = Shift.objects.create(store=self.other_store, staff=self.cashier, opening_cash='0')

        res = self._checkout(shift=other_shift.shift_id)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Order.objects.count(), 0)

    def test_cash_checkout_notifies_cashier_own_store_manager_and_all_chain_managers_only(self):
        store_manager = Staff.objects.create_user(
            username='checkout_store_mgr', password='password123', full_name='Checkout Store Mgr',
            role=Role.objects.get_or_create(role_name='Store Manager')[0], store=self.store,
        )
        chain_manager = Staff.objects.create_user(
            username='checkout_chain_mgr', password='password123', full_name='Checkout Chain Mgr',
            role=Role.objects.get_or_create(role_name='Chain Manager')[0],
        )
        other_store_manager = Staff.objects.create_user(
            username='checkout_other_store_mgr', password='password123', full_name='Other Store Mgr',
            role=Role.objects.get_or_create(role_name='Store Manager')[0], store=self.other_store,
        )

        res = self._checkout()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        notified_ids = set(Notification.objects.values_list('recipient_id', flat=True))
        self.assertEqual(notified_ids, {self.cashier.pk, store_manager.pk, chain_manager.pk})
        self.assertNotIn(other_store_manager.pk, notified_ids)

        note = Notification.objects.get(recipient=chain_manager)
        self.assertEqual(note.notification_type, Notification.TYPE_CASH_PAYMENT_SUCCESS)
        self.assertEqual(note.order.order_id, res.data['order_id'])
