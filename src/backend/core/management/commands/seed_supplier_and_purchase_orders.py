"""One-time backfill for a business that has zero real Supplier/PurchaseOrder
data yet, so the Order Supply / Purchase Orders / Shipment tracking pages and
the Income vs. Expenses chart have real data instead of an empty state.
Suppliers are matched to the real products they'd actually make/distribute;
each PurchaseOrder only orders that supplier's own products. Refuses to run
if any Supplier already exists."""
import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Product, PurchaseOrder, PurchaseOrderDetail, Store, Supplier

# (supplier name, contact phone, email, address, [exact product_name values it supplies])
SUPPLIERS = [
    ('Vinamilk Supplier Co.', '02839363636', 'sales@vinamilk.com.vn', '10 Tan Trao, District 7, HCMC', ['Vinamilk Fresh Milk 1L', 'Vinamilk Yogurt 4-pack']),
    ('Coca-Cola Vietnam Beverages', '02838256000', 'orders@coca-cola.com.vn', '485 Xa Lo Ha Noi, Thu Duc, HCMC', ['Coca-Cola 330ml', 'Mineral Water 500ml']),
    ('Mondelez Kinh Do Vietnam', '02837845555', 'procurement@mondelezkinhdo.vn', '141 Nguyen Du, District 1, HCMC', ['Oreo Cookies 137g']),
    ('PepsiCo Foods Vietnam', '02838234321', 'sales@pepsico.com.vn', 'Quarter 4, Binh Duong', ['Lays Chips 52g']),
    ('Acecook Vietnam', '02838140970', 'orders@acecookvietnam.vn', 'Tan Binh Industrial Park, HCMC', ['Hao Hao Instant Noodles']),
    ('Unilever Vietnam', '02838236688', 'procurement@unilever.com', 'A2-3 Tay Bac Cu Chi IP, Cu Chi, HCMC', ['Comfort Fabric Softener 800ml']),
    ('Procter & Gamble Vietnam', '02839105555', 'orders@pg.com', 'Etown, District 3, HCMC', ['Tide Detergent 3kg']),
    ('Ha Long Canned Food JSC', '02253836667', 'sales@halongcanfood.vn', 'Hong Bang, Hai Phong', ['Canned Tuna 185g']),
]

STATUS_PREPARING = PurchaseOrder.STATUS_PREPARING
STATUS_DELIVERED = PurchaseOrder.STATUS_DELIVERED
STATUS_DELAYED = PurchaseOrder.STATUS_DELAYED


class Command(BaseCommand):
    help = 'Backfills realistic Supplier + PurchaseOrder/PurchaseOrderDetail history across every existing store, matched to the real products each supplier makes. Refuses to run if any Supplier already exists.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=60, help='How many days of history to backfill, ending today.')
        parser.add_argument('--min-per-store', type=int, default=10, help='Minimum purchase orders per store.')
        parser.add_argument('--max-per-store', type=int, default=18, help='Maximum purchase orders per store.')

    def handle(self, *args, **options):
        days = options['days']
        min_per_store = options['min_per_store']
        max_per_store = options['max_per_store']

        if Supplier.objects.exists():
            self.stdout.write(self.style.WARNING('Suppliers already exist -- refusing to reseed (this command is a one-time empty-history backfill).'))
            return

        stores = list(Store.objects.all())
        if not stores:
            self.stdout.write(self.style.ERROR('No stores found -- nothing to seed.'))
            return

        suppliers = []
        for name, phone, email, address, product_names in SUPPLIERS:
            supplier = Supplier.objects.create(supplier_name=name, contact_phone=phone, email=email, address=address)
            products = list(Product.objects.filter(product_name__in=product_names))
            if products:
                suppliers.append((supplier, products))

        if not suppliers:
            self.stdout.write(self.style.WARNING('None of the seeded suppliers matched a real product barcode -- created suppliers with no purchase orders.'))
            return

        today = date.today()
        created_pos = 0
        created_details = 0

        for store in stores:
            n_orders = random.randint(min_per_store, max_per_store)
            for _ in range(n_orders):
                supplier, products = random.choice(suppliers)
                days_ago = random.randint(0, days)
                order_date = today - timedelta(days=days_ago)
                expected_delivery_date = order_date + timedelta(days=random.randint(3, 10))

                # Recently-placed orders can't have arrived yet; only orders old enough
                # to plausibly have shipped get marked Delivered.
                if days_ago < 7:
                    order_status = random.choices([STATUS_PREPARING, STATUS_DELAYED], weights=[85, 15], k=1)[0]
                else:
                    order_status = random.choices([STATUS_DELIVERED, STATUS_PREPARING, STATUS_DELAYED], weights=[80, 10, 10], k=1)[0]

                with transaction.atomic():
                    po = PurchaseOrder.objects.create(
                        supplier=supplier, store=store, order_date=order_date,
                        expected_delivery_date=expected_delivery_date, status=order_status,
                    )
                    line_items = random.sample(products, k=random.randint(1, len(products)))
                    for product in line_items:
                        order_qty = random.randint(20, 100)
                        # Wholesale cost below retail base_price, so Expenses reads as a
                        # plausible margin against Income on the same chart.
                        unit_cost = (product.base_price * Decimal(random.uniform(0.55, 0.75))).quantize(Decimal('0.01'))
                        PurchaseOrderDetail.objects.create(po=po, product=product, order_qty=order_qty, unit_cost=unit_cost)
                        created_details += 1
                    created_pos += 1

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(suppliers)} suppliers, {created_pos} purchase orders / {created_details} order lines across {len(stores)} store(s) over the last {days} days.'
        ))
