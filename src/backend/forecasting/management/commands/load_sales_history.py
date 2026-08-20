"""
FCST-2: Loads a retail_sales_history.csv export into DailySalesRecord, for local testing of
the forecasting feature before real POS/omnichannel history is wired up as the training feed.

Expected CSV columns (matches the file used to design this feature):
    date, product_id, product_name, category, channel, units_sold, current_stock,
    safety_stock_level, supplier_lead_time_days, is_promo_day

Usage:
    docker compose exec backend python manage.py load_sales_history forecasting/retail_sales_history.csv

NOTE: this creates demo Product/Category rows (barcode "DEMO-<product_id>") if they don't
already exist by that barcode - it does NOT try to match against real catalog products. Don't
run this against a production database; it's for local/demo forecasting only.
"""
import csv
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError

from core.models import Category, Product

from forecasting.models import DailySalesRecord


class Command(BaseCommand):
    help = "Loads a retail_sales_history.csv export into DailySalesRecord (demo/test data only)."

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str)

    def handle(self, *args, **options):
        path = options['csv_path']

        try:
            f = open(path, newline='', encoding='utf-8')
        except OSError as exc:
            raise CommandError(f"Could not open {path}: {exc}")

        created, updated = 0, 0
        with f:
            reader = csv.DictReader(f)
            for row in reader:
                category, _ = Category.objects.get_or_create(category_name=row['category'])
                # Demo barcode so this loader never collides with a real catalog barcode.
                barcode = f"DEMO-{row['product_id']}"
                product, _ = Product.objects.get_or_create(
                    barcode=barcode,
                    defaults={
                        'product_name': row['product_name'],
                        'base_price': Decimal('1.00'),
                        'min_threshold': int(row['safety_stock_level']),
                        'category': category,
                    },
                )
                _, was_created = DailySalesRecord.objects.update_or_create(
                    product=product,
                    store=None,
                    sale_date=row['date'],
                    channel=row['channel'],
                    defaults={
                        'units_sold': int(row['units_sold']),
                        'current_stock': int(row['current_stock']),
                        'safety_stock_level': int(row['safety_stock_level']),
                        'supplier_lead_time_days': int(row['supplier_lead_time_days']),
                        'is_promo_day': row['is_promo_day'].strip().lower() == 'true',
                    },
                )
                created += was_created
                updated += not was_created

        self.stdout.write(self.style.SUCCESS(f"Loaded sales history: {created} created, {updated} updated."))
