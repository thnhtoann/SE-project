"""FCST-6: Regression suite for the forecasting app, per testing.md (never delete these).

evaluate_reorder is tested directly since it's pure and dependency-free. Prophet-dependent
paths (services.DemandForecastService) are intentionally NOT unit-tested here with real Prophet
fits - that would make this suite slow and flaky in CI. If/when we add tests for the fit path,
mock Prophet.fit/predict rather than running a real training job in the test suite.
"""
from django.test import TestCase
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Batch, Category, Product, Role, Staff, Store, StoreInventory

from .po_logic import evaluate_reorder
from .models import DailySalesRecord, DemandForecast

class EvaluateReorderTests(TestCase):
    """FCST-4: reorder-point logic."""

    def test_no_action_when_stock_covers_demand_and_safety_stock(self):
        result = evaluate_reorder(current_stock=200, expected_demand=50, safety_stock_level=69)
        self.assertFalse(result['action_required'])
        self.assertEqual(result['recommended_order_quantity'], 0)
        self.assertEqual(result['stockout_risk'], 'Low')

    def test_orders_the_shortfall_when_below_reorder_point(self):
        result = evaluate_reorder(current_stock=30, expected_demand=50, safety_stock_level=69)
        self.assertTrue(result['action_required'])
        self.assertEqual(result['recommended_order_quantity'], 89)  # (50 + 69) - 30
        self.assertEqual(result['stockout_risk'], 'High')

    def test_zero_stock_is_always_high_risk(self):
        result = evaluate_reorder(current_stock=0, expected_demand=5, safety_stock_level=10)
        self.assertEqual(result['stockout_risk'], 'High')
        self.assertTrue(result['action_required'])

    def test_medium_risk_when_covers_demand_but_not_safety_stock(self):
        result = evaluate_reorder(current_stock=55, expected_demand=50, safety_stock_level=69)
        self.assertEqual(result['stockout_risk'], 'Medium')
        self.assertTrue(result['action_required'])

    def test_recommended_quantity_never_negative(self):
        result = evaluate_reorder(current_stock=1000, expected_demand=1, safety_stock_level=1)
        self.assertEqual(result['recommended_order_quantity'], 0)

class GenerateSalesDataCommandTests(TestCase):
    """PROC-6: smoke test only. Real usage is --days 730 --products 20, but
    that's too slow for the test suite, so this runs against a tiny synthetic
    dataset just to check the DB-write path works."""

    def test_command_bulk_creates_daily_sales_records(self):
        call_command('generate_sales_data', days=5, products=2)
        self.assertTrue(DailySalesRecord.objects.exists())
        # 2 channel rows (In-store + Online) per product per day
        self.assertEqual(DailySalesRecord.objects.count(), 5 * 2 * 2)


class ForecastOverviewStoreScopingTests(APITestCase):
    """FCST-5 store scoping: current_stock (and therefore the risk evaluation) must match
    whichever store is being viewed, not silently fall back to a chain-wide total -- this
    is what made the Inventory page's tooltip cite a different "current stock" than the
    Quantity column when a specific store was selected."""

    def setUp(self):
        self.client = APIClient()

        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='HCMC')

        category = Category.objects.create(category_name='Snacks')
        self.product = Product.objects.create(barcode='FCST-1', product_name='Chips', base_price='10000.00', min_threshold=5, category=category)
        batch = Batch.objects.create(product=self.product, manufacture_date='2026-01-01', expiration_date='2026-12-31')
        StoreInventory.objects.create(store=self.store_a, batch=batch, quantity=15)
        StoreInventory.objects.create(store=self.store_b, batch=batch, quantity=70)

        DemandForecast.objects.create(
            product=self.product, forecast_horizon_days=7,
            expected_demand='57.06', expected_demand_lower='32.87', expected_demand_upper='81.88',
            safety_stock_level=50,
        )

        chain_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        self.chain_manager = Staff.objects.create_user(
            username='fcst_chain_manager', password='password123', full_name='Chain Manager', role=chain_role, store=None,
        )
        self.store_manager_a = Staff.objects.create_user(
            username='fcst_store_manager_a', password='password123', full_name='Manager A', role=manager_role, store=self.store_a,
        )

    def test_store_manager_gets_own_store_current_stock(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('demand-forecast'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['products'][0]['current_stock'], 15)

    def test_store_manager_cannot_use_store_param_to_see_another_store(self):
        self.client.force_authenticate(user=self.store_manager_a)
        res = self.client.get(reverse('demand-forecast'), {'store': self.store_b.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['products'][0]['current_stock'], 15)

    def test_chain_manager_gets_chain_wide_total_by_default(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.get(reverse('demand-forecast'))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['products'][0]['current_stock'], 85)

    def test_chain_manager_can_scope_to_one_store(self):
        self.client.force_authenticate(user=self.chain_manager)
        res = self.client.get(reverse('demand-forecast'), {'store': self.store_b.store_id})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['products'][0]['current_stock'], 70)