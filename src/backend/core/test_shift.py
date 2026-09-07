"""Tests for ShiftViewSet's close and eod-report actions (core/views.py)."""
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.checkout import create_pos_order
from core.models import Batch, Category, Product, Role, Shift, Staff, Store, StoreInventory


class ShiftCloseAndEodReportTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store = Store.objects.create(store_name='Shift Store', location='HCMC')
        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        self.cashier = Staff.objects.create_user(
            username='shift_cashier', password='password123', full_name='Shift Cashier', role=cashier_role, store=self.store,
        )
        self.client.force_authenticate(user=self.cashier)

        category = Category.objects.create(category_name='Snacks')
        self.product = Product.objects.create(
            barcode='SHIFT-1', product_name='Chips', base_price='10000.00', min_threshold=5, category=category,
        )
        batch = Batch.objects.create(product=self.product, manufacture_date='2026-01-01', expiration_date='2026-12-31')
        StoreInventory.objects.create(store=self.store, batch=batch, quantity=50)

        self.shift = Shift.objects.create(store=self.store, staff=self.cashier, opening_cash='0.00')

    def test_eod_report_on_empty_shift_returns_zeros(self):
        res = self.client.get(reverse('shift-eod-report', kwargs={'pk': self.shift.shift_id}))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['order_count'], 0)
        self.assertEqual(Decimal(res.data['cash_total']), Decimal('0'))
        self.assertEqual(Decimal(res.data['bank_qr_total']), Decimal('0'))
        self.assertEqual(res.data['hourly_breakdown'], [])
        self.assertEqual(res.data['top_products'], [])

    def test_eod_report_with_single_payment_method_only(self):
        create_pos_order(
            store=self.store, shift=self.shift, payment_method='Cash', staff=self.cashier,
            items=[{'product': self.product, 'quantity': 2, 'unit_price': Decimal('10000.00')}],
        )
        res = self.client.get(reverse('shift-eod-report', kwargs={'pk': self.shift.shift_id}))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['order_count'], 1)
        self.assertEqual(Decimal(res.data['cash_total']), Decimal('20000.00'))
        self.assertEqual(Decimal(res.data['bank_qr_total']), Decimal('0'))
        self.assertEqual(Decimal(res.data['grand_total']), Decimal('20000.00'))
        self.assertEqual(len(res.data['top_products']), 1)
        self.assertEqual(res.data['top_products'][0]['total_qty'], 2)

    def test_close_shift_requires_closing_cash(self):
        res = self.client.patch(reverse('shift-close', kwargs={'pk': self.shift.shift_id}), {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_close_shift_success(self):
        res = self.client.patch(reverse('shift-close', kwargs={'pk': self.shift.shift_id}), {'closing_cash': '5000.00'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['status'], 'Closed')
        self.shift.refresh_from_db()
        self.assertEqual(self.shift.status, Shift.STATUS_CLOSED)
        self.assertIsNotNone(self.shift.closed_at)

    def test_closing_an_already_closed_shift_is_rejected(self):
        self.shift.status = Shift.STATUS_CLOSED
        self.shift.save(update_fields=['status'])

        res = self.client.patch(reverse('shift-close', kwargs={'pk': self.shift.shift_id}), {'closing_cash': '1000.00'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_opening_second_shift_for_same_store_rejected(self):
        res = self.client.post(reverse('shift-list'), {'store': self.store.store_id, 'opening_cash': '0'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
