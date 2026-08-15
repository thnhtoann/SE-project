"""FCST-6: Regression suite for the forecasting app, per testing.md (never delete these).

evaluate_reorder is tested directly since it's pure and dependency-free. Prophet-dependent
paths (services.DemandForecastService) are intentionally NOT unit-tested here with real Prophet
fits - that would make this suite slow and flaky in CI. If/when we add tests for the fit path,
mock Prophet.fit/predict rather than running a real training job in the test suite.
"""
from django.test import TestCase

from .po_logic import evaluate_reorder


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
