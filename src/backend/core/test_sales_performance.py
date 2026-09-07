"""Tests for GET /api/reports/sales-performance/ (core/views.py BestWorstSellerView)."""
from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Category, Order, OrderDetail, Product, Role, Staff, Store


class SalesPerformanceApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store = Store.objects.create(store_name='Store A', location='HCMC')

        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.chain_manager = Staff.objects.create_user(
            username='perf_chain_mgr', password='password123', full_name='Perf Chain Mgr', role=chain_manager_role,
        )
        self.client.force_authenticate(user=self.chain_manager)

        category = Category.objects.create(category_name='Snacks')
        self.chips = Product.objects.create(barcode='PERF-1', product_name='Chips', base_price='10000.00', min_threshold=5, category=category)
        self.soda = Product.objects.create(barcode='PERF-2', product_name='Soda', base_price='8000.00', min_threshold=5, category=category)

        def make_order_detail(product, quantity, days_ago=0, status_='Completed'):
            order = Order.objects.create(
                store=self.store, staff=None, order_date=timezone.now() - timedelta(days=days_ago), order_type='POS',
                payment_method='Cash', total_amount=Decimal('1.00'), status=status_,
            )
            OrderDetail.objects.create(order=order, product=product, quantity=quantity, unit_price=Decimal('1.00'), sub_total=Decimal('1.00'))

        # This week: 5 Chips, 2 Soda.
        make_order_detail(self.chips, 5)
        make_order_detail(self.soda, 2)
        # A pending order today must not count.
        make_order_detail(self.chips, 999, status_='Pending')
        # Outside the week window -- must not count when period=week.
        make_order_detail(self.soda, 500, days_ago=35)

    def test_all_time_by_default_ignores_pending(self):
        # No period/date params -- matches this view's original default
        # (also what advisor.tools.fetch_sales_performance relies on).
        res = self.client.get(reverse('sales-performance-report'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        totals = {row['product__product_name']: row['total_sold'] for row in res.data['best_sellers']}
        self.assertEqual(totals['Chips'], 5)  # not 1004 -- the Pending order must be excluded
        self.assertEqual(totals['Soda'], 502)  # includes the 35-days-ago sale since no period filter

    def test_filtered_by_period(self):
        res = self.client.get(reverse('sales-performance-report'), {'period': 'week'})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        totals = {row['product__product_name']: row['total_sold'] for row in res.data['best_sellers']}
        self.assertEqual(totals['Chips'], 5)
        self.assertEqual(totals['Soda'], 2)  # the 35-days-ago sale is outside the week window

    def test_invalid_period_rejected(self):
        res = self.client.get(reverse('sales-performance-report'), {'period': 'year'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cashier_forbidden(self):
        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        cashier = Staff.objects.create_user(username='perf_cashier', password='password123', full_name='Cashier', role=cashier_role)
        self.client.force_authenticate(user=cashier)
        res = self.client.get(reverse('sales-performance-report'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
