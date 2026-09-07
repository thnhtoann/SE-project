"""Tests for GET /api/reports/revenue-by-channel/ and GET /api/reports/peak-hours/
(core/views.py RevenueByChannelView, PeakHoursView)."""
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Order, Role, Staff, Store


class RevenueByChannelApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='Hanoi')

        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.chain_manager = Staff.objects.create_user(
            username='channel_chain_mgr', password='password123', full_name='Channel Chain Mgr', role=chain_manager_role,
        )
        self.client.force_authenticate(user=self.chain_manager)

        def make_order(store, order_type, amount, status_='Completed'):
            Order.objects.create(
                store=store, staff=None, order_date=timezone.now(), order_type=order_type,
                payment_method='Cash', total_amount=Decimal(amount), status=status_,
            )

        make_order(self.store_a, 'POS', '100.00')
        make_order(self.store_a, 'POS', '50.00')
        make_order(self.store_a, 'GrabMart', '80.00')
        make_order(self.store_b, 'POS', '300.00')
        make_order(self.store_a, 'POS', '9999.00', status_='Pending')  # excluded

    def test_chain_wide_groups_by_channel(self):
        res = self.client.get(reverse('revenue-by-channel-report'), {'period': 'week'})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertIsNone(res.data['store'])
        totals = {row['channel']: Decimal(row['total']) for row in res.data['channels']}
        self.assertEqual(totals['POS'], Decimal('450.00'))  # 100 + 50 (store A) + 300 (store B)
        self.assertEqual(totals['GrabMart'], Decimal('80.00'))

    def test_filtered_by_store(self):
        res = self.client.get(reverse('revenue-by-channel-report'), {'period': 'week', 'store': self.store_a.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        totals = {row['channel']: Decimal(row['total']) for row in res.data['channels']}
        self.assertEqual(totals['POS'], Decimal('150.00'))
        self.assertEqual(totals['GrabMart'], Decimal('80.00'))

    def test_invalid_period_rejected(self):
        res = self.client.get(reverse('revenue-by-channel-report'), {'period': 'year'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cashier_forbidden(self):
        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        cashier = Staff.objects.create_user(username='channel_cashier', password='password123', full_name='Cashier', role=cashier_role)
        self.client.force_authenticate(user=cashier)
        res = self.client.get(reverse('revenue-by-channel-report'), {'period': 'week'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class PeakHoursApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='Hanoi')

        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.chain_manager = Staff.objects.create_user(
            username='peak_chain_mgr', password='password123', full_name='Peak Chain Mgr', role=chain_manager_role,
        )
        self.client.force_authenticate(user=self.chain_manager)

        today = timezone.localdate()

        def make_order(store, days_ago, hour, status_='Completed'):
            order_dt = timezone.make_aware(datetime.combine(today - timedelta(days=days_ago), time(hour=hour)))
            Order.objects.create(
                store=store, staff=None, order_date=order_dt, order_type='POS',
                payment_method='Cash', total_amount=Decimal('10.00'), status=status_,
            )

        # Current 7-day window (today and back 6 days): two orders at hour 10 for store A.
        make_order(self.store_a, 0, 10)
        make_order(self.store_a, 3, 10)
        # Store B, same current window -- must not leak into store A's filtered totals.
        make_order(self.store_b, 0, 10)
        # Previous 7-day window (7-13 days ago): one order at hour 10 for store A.
        make_order(self.store_a, 9, 10)
        # A pending order in the current window must not count.
        make_order(self.store_a, 0, 10, status_='Pending')

    def test_week_period_chain_wide_current_and_previous(self):
        res = self.client.get(reverse('peak-hours-report'), {'period': 'week'})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(len(res.data['points']), 24)
        hour_10 = next(p for p in res.data['points'] if p['hour'] == 10)
        self.assertEqual(hour_10['current'], 3)  # 2 (store A) + 1 (store B), Pending excluded
        self.assertEqual(hour_10['previous'], 1)

    def test_filtered_by_store(self):
        res = self.client.get(reverse('peak-hours-report'), {'period': 'week', 'store': self.store_a.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        hour_10 = next(p for p in res.data['points'] if p['hour'] == 10)
        self.assertEqual(hour_10['current'], 2)
        self.assertEqual(hour_10['previous'], 1)

    def test_invalid_period_rejected(self):
        res = self.client.get(reverse('peak-hours-report'), {'period': 'year'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cashier_forbidden(self):
        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        cashier = Staff.objects.create_user(username='peak_cashier', password='password123', full_name='Cashier', role=cashier_role)
        self.client.force_authenticate(user=cashier)
        res = self.client.get(reverse('peak-hours-report'), {'period': 'week'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
