"""
FCST-5: GET /api/forecasting/forecast/

Serves cached DemandForecast rows (produced out-of-band by the `run_demand_forecast`
management command - see forecasting/services.py) plus reorder-point recommendations computed
live from po_logic.py against current StoreInventory. Does NOT train Prophet inline, and does
NOT create real PurchaseOrder rows - this is a read-only recommendation feed. Turning a
recommendation into an actual PurchaseOrder is Smart Procurement's (Member 2's) write path.

Query params (all optional):
  - category: filter to one Product.category.category_name
  - risk: filter to one of Low / Medium / High
  - action_required: 'true' to only return products that need a PO

Example response:
{
  "overview": {
    "total_products_analyzed": 42,
    "products_at_risk": 7,
    "high_risk_count": 3,
    "medium_risk_count": 4,
    "low_risk_count": 35
  },
  "products": [
    {
      "product_id": 1,
      "product_name": "Sparkling Water",
      "barcode": "8934673125456",
      "current_stock": 12,
      "safety_stock_level": 69,
      "forecast_horizon_days": 7,
      "expected_demand": 84.3,
      "expected_demand_lower": 70.1,
      "expected_demand_upper": 98.6,
      "stockout_risk": "High",
      "action_required": true,
      "recommended_order_quantity": 141,
      "reasoning": "Forecasted demand over the lead time is 84.3 units. Current stock is 12, safety stock target is 69. Stock falls short of the 153.3-unit reorder point by 141.3 units, so ordering 141 units is recommended.",
      "forecast_generated_at": "2026-08-13T02:00:00Z"
    }
  ]
}
"""
from django.db.models import Sum
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import StoreInventory
from core.permissions import IsChainManager, IsStoreManager

from .models import DailySalesRecord, DemandForecast
from .po_logic import evaluate_reorder
from .serializers import ForecastResponseSerializer


class ForecastOverviewView(APIView):
    """Chain/Store Manager-facing forecast + PO recommendation feed."""
    permission_classes = [IsStoreManager | IsChainManager]

    def get(self, request):
        category = request.query_params.get('category')
        risk_filter = request.query_params.get('risk')
        action_required_only = request.query_params.get('action_required') == 'true'

        forecasts = DemandForecast.objects.select_related('product', 'product__category')
        if category:
            forecasts = forecasts.filter(product__category__category_name=category)

        total_analyzed = forecasts.count()
        products_payload = []
        risk_counts = {'Low': 0, 'Medium': 0, 'High': 0}

        for forecast in forecasts:
            product = forecast.product
            current_stock = self._current_stock(product)

            evaluation = evaluate_reorder(
                current_stock=current_stock,
                expected_demand=forecast.expected_demand,
                safety_stock_level=forecast.safety_stock_level,
            )
            risk_counts[evaluation['stockout_risk']] += 1

            if risk_filter and evaluation['stockout_risk'] != risk_filter:
                continue
            if action_required_only and not evaluation['action_required']:
                continue

            products_payload.append({
                'product_id': product.product_id,
                'product_name': product.product_name,
                'barcode': product.barcode,
                'current_stock': current_stock,
                'safety_stock_level': forecast.safety_stock_level,
                'forecast_horizon_days': forecast.forecast_horizon_days,
                'expected_demand': float(forecast.expected_demand),
                'expected_demand_lower': float(forecast.expected_demand_lower),
                'expected_demand_upper': float(forecast.expected_demand_upper),
                'stockout_risk': evaluation['stockout_risk'],
                'action_required': evaluation['action_required'],
                'recommended_order_quantity': evaluation['recommended_order_quantity'],
                'reasoning': evaluation['reasoning'],
                'forecast_generated_at': forecast.generated_at,
            })

        overview = {
            'total_products_analyzed': total_analyzed,
            'products_at_risk': risk_counts['Medium'] + risk_counts['High'],
            'high_risk_count': risk_counts['High'],
            'medium_risk_count': risk_counts['Medium'],
            'low_risk_count': risk_counts['Low'],
        }

        serializer = ForecastResponseSerializer({'overview': overview, 'products': products_payload})
        return Response(serializer.data)

    def _current_stock(self, product):
        """Real-time stock summed across StoreInventory. Falls back to the most recent
        DailySalesRecord snapshot when no StoreInventory exists yet for this product (e.g.
        products created by the load_sales_history demo loader, which doesn't seed inventory)."""
        total = (
            StoreInventory.objects
            .filter(batch__product=product)
            .aggregate(total=Sum('quantity'))['total']
        )
        if total is not None:
            return total

        latest = (
            DailySalesRecord.objects
            .filter(product=product)
            .order_by('-sale_date')
            .first()
        )
        return latest.current_stock if latest else 0
