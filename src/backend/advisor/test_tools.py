"""Tests for advisor/tools.py.

resolve_store_scope is pure/deterministic. The fetch_* functions call real
DRF views in-process -- covered here too (unlike market.py/graph.py's LLM
calls, which need a live GOOGLE_API_KEY and aren't exercised by this suite).
"""
from rest_framework.test import APITestCase

from advisor import tools
from advisor.tools import resolve_store_scope
from core.models import Role, Staff, Store


class ResolveStoreScopeTests(APITestCase):
    def setUp(self):
        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='Hanoi')

        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        store_manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]

        self.chain_manager = Staff.objects.create_user(
            username='advisor_chain_mgr', password='password123', full_name='Advisor Chain Mgr', role=chain_manager_role,
        )
        self.store_manager = Staff.objects.create_user(
            username='advisor_store_mgr', password='password123', full_name='Advisor Store Mgr',
            role=store_manager_role, store=self.store_a,
        )

    def test_chain_manager_can_pass_any_store(self):
        self.assertEqual(resolve_store_scope(self.chain_manager, self.store_b.store_id), self.store_b.store_id)

    def test_chain_manager_omitting_store_stays_chain_wide(self):
        self.assertIsNone(resolve_store_scope(self.chain_manager, None))

    def test_store_manager_locked_to_own_store_even_if_another_requested(self):
        self.assertEqual(resolve_store_scope(self.store_manager, self.store_b.store_id), self.store_a.store_id)

    def test_store_manager_with_no_store_param_gets_own_store(self):
        self.assertEqual(resolve_store_scope(self.store_manager, None), self.store_a.store_id)


class FetchToolsTests(APITestCase):
    """Regression coverage for the tools.py rewrite: an earlier version
    called views via rest_framework.test.APIClient, which sends a
    Host: testserver header -- allowed under `manage.py test` (Django's
    test runner patches ALLOWED_HOSTS for the run) but rejected by
    production's real ALLOWED_HOSTS, so it 500'd there despite every test
    passing. These call the real fetch_* functions (no APIClient involved
    now) and assert on the actual payload shape, which would have caught
    that regardless of ALLOWED_HOSTS.
    """
    def setUp(self):
        self.store = Store.objects.create(store_name='Store A', location='HCMC')
        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.chain_manager = Staff.objects.create_user(
            username='advisor_fetch_chain_mgr', password='password123', full_name='Advisor Fetch Chain Mgr', role=chain_manager_role,
        )

    def test_fetch_revenue_trend_returns_real_payload(self):
        data = tools.fetch_revenue_trend(self.chain_manager, self.store.store_id, 'week')
        self.assertEqual(data['period'], 'week')
        self.assertIn('points', data)
        self.assertIn('previous_total', data)

    def test_fetch_sales_by_category_returns_real_payload(self):
        data = tools.fetch_sales_by_category(self.chain_manager, self.store.store_id, 'week')
        self.assertIn('categories', data)

    def test_fetch_revenue_by_channel_returns_real_payload(self):
        data = tools.fetch_revenue_by_channel(self.chain_manager, self.store.store_id, 'week')
        self.assertIn('channels', data)

    def test_fetch_sales_performance_returns_real_payload(self):
        data = tools.fetch_sales_performance(self.chain_manager)
        self.assertIn('best_sellers', data)

    def test_fetch_forecast_returns_real_payload(self):
        data = tools.fetch_forecast(self.chain_manager, self.store.store_id)
        self.assertIn('overview', data)

    def test_fetch_low_stock_alerts_returns_real_payload(self):
        data = tools.fetch_low_stock_alerts(self.chain_manager, self.store.store_id)
        self.assertIsInstance(data, list)
