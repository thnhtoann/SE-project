from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Order, OrderDetail, Product, Batch, StoreInventory


class Command(BaseCommand):
    help = "Delete all Products and Orders (and their dependent rows: OrderDetail, Batch, StoreInventory)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes', action='store_true',
            help="Required to actually run the deletion; omit to do a dry-run count only.",
        )

    def handle(self, *args, **options):
        counts = {
            'Order': Order.objects.count(),
            'OrderDetail': OrderDetail.objects.count(),
            'Product': Product.objects.count(),
            'Batch': Batch.objects.count(),
            'StoreInventory': StoreInventory.objects.count(),
        }
        self.stdout.write("Rows to delete:")
        for name, count in counts.items():
            self.stdout.write(f"  {name}: {count}")

        if not options['yes']:
            self.stdout.write(self.style.WARNING("Dry run only -- re-run with --yes to actually delete."))
            return

        with transaction.atomic():
            Order.objects.all().delete()  # cascades OrderDetail
            Product.objects.all().delete()  # cascades Batch -> StoreInventory

        self.stdout.write(self.style.SUCCESS("Deleted all Products and Orders."))
