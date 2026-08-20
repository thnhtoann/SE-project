"""
PROC-6: Django management command that generates synthetic sales history and
writes it directly into DailySalesRecord.

Reuses the pure numpy/pandas generation logic in
forecasting/generate_synthetic_sales_data.py (no Django dependency there, so
it stays fast/testable on its own) -- this command's job is only the DB-write
step: get/create the demo Category/Product rows for the synthetic catalog,
then bulk_create the DailySalesRecord rows.

Run:
    docker compose exec backend python manage.py generate_sales_data

Optional flags (default to the spec's 730 days / 20 products):
    --days N       number of days of history to generate
    --products N   number of synthetic products to generate
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Category, Product

from forecasting.generate_synthetic_sales_data import (
    generate_calendar, generate_product_catalog, simulate_demand_and_inventory,
)
from forecasting.models import DailySalesRecord


class Command(BaseCommand):
    help = "Generates synthetic sales history (pandas/numpy) and bulk-creates it into DailySalesRecord."

    def add_arguments(self, parser):
        # Defaults match the spec (730 days / 20 products); overridable so
        # tests can run this against a tiny dataset instead of the real one.
        parser.add_argument('--days', type=int, default=730, help='Days of history to generate.')
        parser.add_argument('--products', type=int, default=20, help='Number of synthetic products to generate.')

    def handle(self, *args, **options):
        # 1. Run the pure generation logic: weekend seasonality, per-product
        # trend, promo-day spikes, demand capped by simulated stock-on-hand.
        catalog = generate_product_catalog(options['products'])
        calendar = generate_calendar(options['days'])
        sales = simulate_demand_and_inventory(catalog, calendar)

        # 2. Get/create one Category + Product per synthetic catalog entry.
        # Uses the same "DEMO-<product_id>" barcode convention as
        # load_sales_history.py so both commands share the same demo
        # products instead of creating duplicates.
        product_by_id = {}
        for _, row in catalog.iterrows():
            category, _ = Category.objects.get_or_create(category_name=row['category'])
            product, _ = Product.objects.get_or_create(
                barcode=f"DEMO-{row['product_id']}",
                defaults={
                    'product_name': row['product_name'],
                    'base_price': Decimal('1.00'),
                    'min_threshold': int(row['safety_stock_level']),
                    'category': category,
                },
            )
            product_by_id[row['product_id']] = product

        # 3. Bulk-create DailySalesRecord rows. ignore_conflicts=True so a
        # re-run doesn't fail on the (product, store, sale_date, channel)
        # unique constraint -- it just skips rows that already exist.
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

        self.stdout.write(self.style.SUCCESS(
            f"Generated {len(records)} synthetic DailySalesRecord rows across "
            f"{len(product_by_id)} products."
        ))