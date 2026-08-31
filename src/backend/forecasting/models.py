"""
FCST-2: Data models for Smart Procurement & Demand Forecasting.

Deliberately does NOT add any fields to core.models.Product/StoreInventory - those are owned by
Member 2 (shared schema owner per the team constitution). Everything this feature needs
(safety_stock_level, supplier_lead_time_days) is kept on DailySalesRecord instead, which is a
new, self-contained table this app owns outright.
"""
from django.db import models

from core.models import Product, Store


class DailySalesRecord(models.Model):
    """One day's aggregated sales for a product on one channel (and optionally one store).

    This is a read-optimized feed for ML training - it's populated by the
    `load_sales_history` management command (from a CSV export) or, in production, by a
    future daily ETL job that reads completed Orders. It is NOT written to by the checkout
    or omnichannel webhook paths directly.
    """
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='daily_sales_records',
    )
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, null=True, blank=True,
        help_text='Null when the record is a chain-wide aggregate rather than one branch.',
    )
    sale_date = models.DateField()
    channel = models.CharField(max_length=50)  # e.g. In-store, GrabMart, ShopeeFood, BeMart
    units_sold = models.IntegerField()
    current_stock = models.IntegerField(
        help_text='Historical stock snapshot on this date, kept for reference/backtesting.',
    )
    safety_stock_level = models.IntegerField(
        help_text='Buffer stock target for this product at the time of this record.',
    )
    supplier_lead_time_days = models.IntegerField(
        help_text='Days between placing a PO and delivery, at the time of this record.',
    )
    is_promo_day = models.BooleanField(default=False)

    class Meta:
        unique_together = (('product', 'store', 'sale_date', 'channel'),)
        indexes = [models.Index(fields=['product', 'sale_date'])]

    def __str__(self):
        return f"{self.product.product_name} - {self.sale_date} ({self.channel}): {self.units_sold}"


class DemandForecast(models.Model):
    """Cached output of the most recent Prophet run for one product (see
    forecasting.services.DemandForecastService). The API endpoint (views.py) reads this
    table instead of training Prophet inline, since a fit takes seconds per product and
    would make the endpoint unusably slow under live request load.

    Reorder decisions (recommended_order_quantity, stockout_risk) are NOT cached here -
    they're computed live in the view against current stock, since stock changes far more
    often than the demand forecast does.
    """
    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, related_name='demand_forecast',
    )
    generated_at = models.DateTimeField(auto_now=True)
    forecast_horizon_days = models.IntegerField()
    expected_demand = models.DecimalField(max_digits=10, decimal_places=2)
    expected_demand_lower = models.DecimalField(max_digits=10, decimal_places=2)
    expected_demand_upper = models.DecimalField(max_digits=10, decimal_places=2)
    safety_stock_level = models.IntegerField()

    def __str__(self):
        return f"Forecast for {self.product.product_name} ({self.forecast_horizon_days}d)"
