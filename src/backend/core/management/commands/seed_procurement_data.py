from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import (
    Supplier, Category, Product, Store, Batch, StoreInventory,
    PurchaseOrder, PurchaseOrderDetail, InventoryAlert
)


class Command(BaseCommand):
    help = 'Seeds realistic procurement, supplier, inventory, and BVA boundary test data for demo (Member 5 handoff).'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting Procurement & Inventory Data Seeding...'))

        with transaction.atomic():
            # 1. Seed Suppliers
            s1, _ = Supplier.objects.get_or_create(
                supplier_name='Vinamilk Supplier Co.',
                defaults={
                    'contact_phone': '02839363636',
                    'email': 'sales@vinamilk.com.vn',
                    'address': '10 Tan Trao, District 7, HCMC'
                }
            )
            s2, _ = Supplier.objects.get_or_create(
                supplier_name='Unilever Vietnam',
                defaults={
                    'contact_phone': '02838236688',
                    'email': 'procurement@unilever.com',
                    'address': 'A2-3 Tay Bac Cu Chi IP, Cu Chi, HCMC'
                }
            )
            s3, _ = Supplier.objects.get_or_create(
                supplier_name='Masan Consumer Group',
                defaults={
                    'contact_phone': '02838108888',
                    'email': 'orders@masan.com.vn',
                    'address': '23 Le Duan, District 1, HCMC'
                }
            )
            self.stdout.write(self.style.SUCCESS(f'[+] Seeded 3 Suppliers: {s1.supplier_name}, {s2.supplier_name}, {s3.supplier_name}'))

            # 2. Seed Category & Store
            cat, _ = Category.objects.get_or_create(category_name='Beverage & Food')
            store, _ = Store.objects.get_or_create(
                store_name='Store #1 - District 1 POS Branch',
                defaults={'location': '123 Nguyen Hue Street, District 1, HCMC'}
            )
            self.stdout.write(self.style.SUCCESS(f'[+] Seeded Store: {store.store_name}'))

            # 3. Seed Products with min_threshold = 10
            p1, _ = Product.objects.get_or_create(
                barcode='8934567890123',
                defaults={
                    'product_name': 'Vinamilk Fresh Milk 1L',
                    'category': cat,
                    'base_price': '35000.00',
                    'min_threshold': 10
                }
            )
            p2, _ = Product.objects.get_or_create(
                barcode='8934567890124',
                defaults={
                    'product_name': 'Omachi Instant Noodles',
                    'category': cat,
                    'base_price': '12000.00',
                    'min_threshold': 10
                }
            )
            p3, _ = Product.objects.get_or_create(
                barcode='8934567890125',
                defaults={
                    'product_name': 'Neptune Cooking Oil 1L',
                    'category': cat,
                    'base_price': '55000.00',
                    'min_threshold': 10
                }
            )
            self.stdout.write(self.style.SUCCESS('[+] Seeded 3 Products with MinThreshold = 10'))

            # 4. Seed Batches & Inventory (Quantities set at BVA boundary mốc: 11, 10, 5)
            # Product 1: Stock = 11 (Above threshold 10 -> Safe)
            b1, _ = Batch.objects.get_or_create(
                product=p1,
                manufacture_date=date.today() - timedelta(days=30),
                expiration_date=date.today() + timedelta(days=60)
            )
            StoreInventory.objects.update_or_create(
                store=store, batch=b1,
                defaults={'quantity': 11}
            )

            # Product 2: Stock = 10 (Exact Boundary threshold 10 -> Low stock trigger)
            b2, _ = Batch.objects.get_or_create(
                product=p2,
                manufacture_date=date.today() - timedelta(days=30),
                expiration_date=date.today() + timedelta(days=90)
            )
            StoreInventory.objects.update_or_create(
                store=store, batch=b2,
                defaults={'quantity': 10}
            )

            # Product 3: Stock = 5 (Below threshold 10 -> Critical low stock alert)
            b3, _ = Batch.objects.get_or_create(
                product=p3,
                manufacture_date=date.today() - timedelta(days=30),
                expiration_date=date.today() + timedelta(days=45)
            )
            StoreInventory.objects.update_or_create(
                store=store, batch=b3,
                defaults={'quantity': 5}
            )
            self.stdout.write(self.style.SUCCESS('[+] Seeded StoreInventory with BVA Stock levels (Q=11, 10, 5)'))

            # 5. Seed Purchase Orders & Shipments
            po, created = PurchaseOrder.objects.get_or_create(
                supplier=s1,
                status='Preparing',
                defaults={
                    'order_date': date.today() - timedelta(days=2),
                    'expected_delivery_date': date.today() + timedelta(days=3)
                }
            )
            if created:
                PurchaseOrderDetail.objects.create(
                    po=po, product=p1, order_qty=50, unit_cost='30000.00'
                )
            self.stdout.write(self.style.SUCCESS(f'[+] Seeded Purchase Order #{po.po_id} with Supplier {s1.supplier_name}'))

        self.stdout.write(self.style.SUCCESS('======================================================'))
        self.stdout.write(self.style.SUCCESS('SUCCESS: Procurement & Demo Seed Data Population Complete!'))
        self.stdout.write(self.style.SUCCESS('Ready for Member 5 Video Demo & PA4 Testing.'))
        self.stdout.write(self.style.SUCCESS('======================================================'))
