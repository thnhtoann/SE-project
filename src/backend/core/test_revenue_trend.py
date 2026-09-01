"""Tests for GET /api/reports/revenue-trend/ (core/views.py RevenueTrendView)."""
from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Order, Role, Staff, Store


class RevenueTrendApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='Hanoi')

        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.chain_manager = Staff.objects.create_user(
            username='trend_chain_mgr', password='password123', full_name='Trend Chain Mgr', role=chain_manager_role,
        )
        self.client.force_authenticate(user=self.chain_manager)

        self.today = timezone.localdate()

        def make_order(store, days_ago, amount, status_='Completed'):
            order_date = timezone.now() - timedelta(days=days_ago)
            Order.objects.create(
                store=store, staff=None, order_date=order_date, order_type='POS',
                payment_method='Cash', total_amount=Decimal(amount), status=status_,
            )

        # Store A: 100 today, 200 three days ago, 50 last month (outside the week/month window).
        make_order(self.store_a, 0, '100.00')
        make_order(self.store_a, 3, '200.00')
        make_order(self.store_a, 35, '50.00')
        # Store B: 300 today -- must not leak into Store A's filtered totals.
        make_order(self.store_b, 0, '300.00')
        # A pending order today must not count.
        make_order(self.store_a, 0, '9999.00', status_='Pending')

    def test_week_period_chain_wide_has_seven_points(self):
        res = self.client.get(reverse('revenue-trend-report'), {'period': 'week'})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['period'], 'week')
        self.assertIsNone(res.data['store'])
        self.assertEqual(len(res.data['points']), 7)

        today_point = res.data['points'][-1]
        self.assertEqual(today_point['date'], self.today.isoformat())
        # Chain-wide: store A's 100 (Completed) + store B's 300, Pending excluded.
        self.assertEqual(Decimal(today_point['total']), Decimal('400.00'))
        self.assertEqual(today_point['order_count'], 2)

    def test_week_period_filtered_by_store(self):
        res = self.client.get(reverse('revenue-trend-report'), {'period': 'week', 'store': self.store_a.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['store'], self.store_a.store_id)

        today_point = res.data['points'][-1]
        self.assertEqual(Decimal(today_point['total']), Decimal('100.00'))
        self.assertEqual(today_point['order_count'], 1)

        three_days_ago_point = res.data['points'][-4]
        self.assertEqual(Decimal(three_days_ago_point['total']), Decimal('200.00'))

    def test_month_period_excludes_orders_outside_current_month(self):
        res = self.client.get(reverse('revenue-trend-report'), {'period': 'month', 'store': self.store_a.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        total = sum(Decimal(p['total']) for p in res.data['points'])
        # The 35-day-old order falls outside "this calendar month" whenever this test runs.
        self.assertIn(total, (Decimal('100.00'), Decimal('300.00')))  # 100 (today only) or 300 (today+3 days ago) depending on month boundary

    def test_quarter_period_has_three_monthly_points(self):
        res = self.client.get(reverse('revenue-trend-report'), {'period': 'quarter'})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(len(res.data['points']), 3)

    def test_invalid_period_rejected(self):
        res = self.client.get(reverse('revenue-trend-report'), {'period': 'year'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cashier_forbidden(self):
        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        cashier = Staff.objects.create_user(username='trend_cashier', password='password123', full_name='Cashier', role=cashier_role)
        self.client.force_authenticate(user=cashier)
        res = self.client.get(reverse('revenue-trend-report'), {'period': 'week'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
