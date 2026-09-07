"""
Demo-only command: generates synthetic DailySalesRecord history for the
EXISTING Product catalog (unlike generate_sales_data, which creates its own
unrelated DEMO-* products), then fits and caches a DemandForecast for each
one -- so the Inventory page's Restock Risk column has real Low/Medium/High
values instead of "-" for a fresh demo catalog with no real order history.

Run:
    docker compose exec backend python manage.py seed_forecast_demo_data
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Product

from forecasting.generate_synthetic_sales_data import generate_calendar, simulate_demand_and_inventory
from forecasting.models import DailySalesRecord, DemandForecast
from forecasting.services import DemandForecastService, InsufficientHistoryError

DAYS_OF_HISTORY = 120
FORECAST_HORIZON_DAYS = 7


class Command(BaseCommand):
    help = "Seeds synthetic sales history for the existing product catalog and fits a demand forecast for each."

    def handle(self, *args, **options):
        products = list(Product.objects.all())
        if not products:
            self.stdout.write(self.style.WARNING("No products found -- nothing to seed."))
            return

        import numpy as np
        import pandas as pd

        rng = np.random.default_rng(42)
        catalog = pd.DataFrame({
            "product_id": [p.product_id for p in products],
            "product_name": [p.product_name for p in products],
            "category": [p.category.category_name for p in products],
            "base_demand": rng.uniform(5, 40, size=len(products)).round(1),
            "is_trending": rng.choice([True, False], size=len(products), p=[0.25, 0.75]),
            "safety_stock_level": [max(p.min_threshold, 5) for p in products],
            "supplier_lead_time_days": rng.integers(3, 10, size=len(products)),
        })
        calendar = generate_calendar(DAYS_OF_HISTORY)
        sales = simulate_demand_and_inventory(catalog, calendar)

        product_by_id = {p.product_id: p for p in products}
        records = [
            DailySalesRecord(
                product=product_by_id[row.product_id],
                store=None,
                sale_date=row.date.date(),
                channel=row.channel,
                units_sold=int(row.units_sold),
                current_stock=int(row.current_stock),
                safety_stock_level=int(row.safety_stock_level),
                supplier_lead_time_days=int(row.supplier_lead_time_days),
                is_promo_day=bool(row.is_promo_day),
            )
            for row in sales.itertuples()
        ]
        with transaction.atomic():
            DailySalesRecord.objects.bulk_create(records, batch_size=1000, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"Generated {len(records)} synthetic DailySalesRecord rows for {len(products)} products."))

        fitted, skipped = 0, 0
        for product in products:
            try:
                result = DemandForecastService(product).forecast(FORECAST_HORIZON_DAYS)
            except InsufficientHistoryError as exc:
                self.stdout.write(self.style.WARNING(str(exc)))
                skipped += 1
                continue
            except Exception:
                self.stdout.write(self.style.ERROR(f"Forecast failed for product_id={product.product_id}"))
                skipped += 1
                continue

            safety_stock_level = int(catalog.loc[catalog['product_id'] == product.product_id, 'safety_stock_level'].iloc[0])
            DemandForecast.objects.update_or_create(
                product=product,
                defaults={
                    'forecast_horizon_days': FORECAST_HORIZON_DAYS,
                    'expected_demand': result['expected_demand'],
                    'expected_demand_lower': result['expected_demand_lower'],
                    'expected_demand_upper': result['expected_demand_upper'],
                    'safety_stock_level': safety_stock_level,
                },
            )
            fitted += 1

        self.stdout.write(self.style.SUCCESS(f"Forecasts fitted: {fitted}, skipped: {skipped}"))
