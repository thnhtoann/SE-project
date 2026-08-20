"""FCST-5: Response serializers for GET /api/forecasting/forecast/.

Plain Serializers, not ModelSerializers - the response blends cached DemandForecast fields
with live reorder-logic output (action_required/reasoning/current_stock) computed in the view,
so there's no single model that matches this shape.
"""
from rest_framework import serializers


class ProductForecastSerializer(serializers.Serializer):
    """One product's forecast + purchase-order recommendation row."""
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    barcode = serializers.CharField()
    current_stock = serializers.IntegerField()
    safety_stock_level = serializers.IntegerField()
    forecast_horizon_days = serializers.IntegerField()
    expected_demand = serializers.FloatField()
    expected_demand_lower = serializers.FloatField()
    expected_demand_upper = serializers.FloatField()
    stockout_risk = serializers.CharField()
    action_required = serializers.BooleanField()
    recommended_order_quantity = serializers.IntegerField()
    reasoning = serializers.CharField()
    forecast_generated_at = serializers.DateTimeField()


class ForecastOverviewSerializer(serializers.Serializer):
    """Chain-wide risk summary shown at the top of the dashboard."""
    total_products_analyzed = serializers.IntegerField()
    products_at_risk = serializers.IntegerField()
    high_risk_count = serializers.IntegerField()
    medium_risk_count = serializers.IntegerField()
    low_risk_count = serializers.IntegerField()


class ForecastResponseSerializer(serializers.Serializer):
    overview = ForecastOverviewSerializer()
    products = ProductForecastSerializer(many=True)
