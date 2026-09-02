"""Tests for GET /api/reports/sales-by-category/ (core/views.py SalesByCategoryView)."""
from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Category, Order, OrderDetail, Product, Role, Staff, Store


class SalesByCategoryApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='Hanoi')

        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.chain_manager = Staff.objects.create_user(
            username='cat_chain_mgr', password='password123', full_name='Cat Chain Mgr', role=chain_manager_role,
        )
        self.client.force_authenticate(user=self.chain_manager)

        snacks = Category.objects.create(category_name='Snacks')
        drinks = Category.objects.create(category_name='Drinks')
        chips = Product.objects.create(barcode='CAT-1', product_name='Chips', base_price='10000.00', min_threshold=5, category=snacks)
        soda = Product.objects.create(barcode='CAT-2', product_name='Soda', base_price='8000.00', min_threshold=5, category=drinks)

        def make_order_detail(store, product, sub_total, days_ago=0, status_='Completed'):
            order = Order.objects.create(
                store=store, staff=None, order_date=timezone.now() - timedelta(days=days_ago), order_type='POS',
                payment_method='Cash', total_amount=Decimal(sub_total), status=status_,
            )
            OrderDetail.objects.create(order=order, product=product, quantity=1, unit_price=Decimal(sub_total), sub_total=Decimal(sub_total))

        # Store A: 100 Snacks + 40 Drinks today.
        make_order_detail(self.store_a, chips, '100.00')
        make_order_detail(self.store_a, soda, '40.00')
        # Store B: 300 Snacks today -- must not leak into Store A's filtered totals.
        make_order_detail(self.store_b, chips, '300.00')
        # A pending order today must not count.
        make_order_detail(self.store_a, chips, '9999.00', status_='Pending')
        # Outside the week/month window.
        make_order_detail(self.store_a, chips, '50.00', days_ago=35)

    def test_chain_wide_groups_by_category(self):
        res = self.client.get(reverse('sales-by-category-report'), {'period': 'week'})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertIsNone(res.data['store'])
        totals = {row['category']: Decimal(row['total']) for row in res.data['categories']}
        self.assertEqual(totals['Snacks'], Decimal('400.00'))  # 100 (store A) + 300 (store B)
        self.assertEqual(totals['Drinks'], Decimal('40.00'))

    def test_filtered_by_store(self):
        res = self.client.get(reverse('sales-by-category-report'), {'period': 'week', 'store': self.store_a.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['store'], self.store_a.store_id)
        totals = {row['category']: Decimal(row['total']) for row in res.data['categories']}
        self.assertEqual(totals['Snacks'], Decimal('100.00'))
        self.assertEqual(totals['Drinks'], Decimal('40.00'))

    def test_invalid_period_rejected(self):
        res = self.client.get(reverse('sales-by-category-report'), {'period': 'year'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cashier_forbidden(self):
        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        cashier = Staff.objects.create_user(username='cat_cashier', password='password123', full_name='Cashier', role=cashier_role)
        self.client.force_authenticate(user=cashier)
        res = self.client.get(reverse('sales-by-category-report'), {'period': 'week'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
