from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Category, Product, Batch, Store, StoreInventory


class Command(BaseCommand):
    help = "Create test data for Postman cart discount cases."

    @transaction.atomic
    def handle(self, *args, **options):
        category, _ = Category.objects.get_or_create(
            category_name="Postman Test"
        )

        store, _ = Store.objects.get_or_create(
            store_name="Postman Test Store",
            location="Postman Test"
        )

        test_products = [
            {
                "barcode": "POSTMAN-NEAR-001",
                "name": "Postman Near Expiry Drink",
                "days": 3,
            },
            {
                "barcode": "POSTMAN-NORMAL-001",
                "name": "Postman Normal Drink",
                "days": 30,
            },
            {
                "barcode": "POSTMAN-EXPIRED-001",
                "name": "Postman Expired Drink",
                "days": -1,
            },
        ]

        for data in test_products:
            product, _ = Product.objects.update_or_create(
                barcode=data["barcode"],
                defaults={
                    "product_name": data["name"],
                    "base_price": Decimal("100000.00"),
                    "min_threshold": 1,
                    "category": category,
                },
            )

            batch, _ = Batch.objects.update_or_create(
                product=product,
                defaults={
                    "manufacture_date": date.today() - timedelta(days=30),
                    "expiration_date": date.today()
                    + timedelta(days=data["days"]),
                },
            )

            StoreInventory.objects.update_or_create(
                store=store,
                batch=batch,
                defaults={"quantity": 100},
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f"{data['name']}: "
                    f"product_id={product.product_id}, "
                    f"batch_id={batch.batch_id}, "
                    f"expires={batch.expiration_date}"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                "\nPostman discount test data created successfully."
            )
        )