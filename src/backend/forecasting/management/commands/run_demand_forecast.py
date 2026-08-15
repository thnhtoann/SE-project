"""
FCST-3: Batch job that fits a Prophet model per product and caches the result.

Run manually with:
    docker compose exec backend python manage.py run_demand_forecast

This is NOT yet wired to a scheduler (no Celery/cron configured in this project - see
CLAUDE.md/procurement plan.md's own open note on the same gap). Until it is, re-run this
command manually (e.g. once a day) to keep DemandForecast fresh; the API always serves
whatever was cached by the last run, it never trains live.
"""
import logging

from django.core.management.base import BaseCommand

from core.models import Product

from forecasting.models import DailySalesRecord, DemandForecast
from forecasting.services import DemandForecastService, InsufficientHistoryError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Fits a demand forecast for every product with sales history and caches it in DemandForecast."

    def handle(self, *args, **options):
        product_ids = DailySalesRecord.objects.values_list('product_id', flat=True).distinct()

        fitted, skipped = 0, 0
        for product in Product.objects.filter(product_id__in=product_ids):
            latest_record = (
                DailySalesRecord.objects
                .filter(product=product)
                .order_by('-sale_date')
                .first()
            )
            horizon_days = latest_record.supplier_lead_time_days

            try:
                result = DemandForecastService(product).forecast(horizon_days)
            except InsufficientHistoryError as exc:
                self.stdout.write(self.style.WARNING(str(exc)))
                skipped += 1
                continue
            except Exception:
                logger.exception("Forecast failed for product_id=%s", product.product_id)
                skipped += 1
                continue

            DemandForecast.objects.update_or_create(
                product=product,
                defaults={
                    'forecast_horizon_days': horizon_days,
                    'expected_demand': result['expected_demand'],
                    'expected_demand_lower': result['expected_demand_lower'],
                    'expected_demand_upper': result['expected_demand_upper'],
                    'safety_stock_level': latest_record.safety_stock_level,
                },
            )
            fitted += 1

        self.stdout.write(self.style.SUCCESS(f"Forecasts fitted: {fitted}, skipped: {skipped}"))
