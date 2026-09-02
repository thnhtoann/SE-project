"""One-time backfill for a business that has zero real Order history yet, so
POS/omnichannel-dependent dashboards (revenue-by-channel, peak-hours, KPI
counts, latest transactions) have real data to compute from instead of
static mock numbers. Mirrors the real order-creation shape used by
core.checkout.create_pos_order (POS) and omnichannel.services.save_normalized_order
(marketplace channels) -- does NOT touch StoreInventory, since these are
backdated historical rows, not live checkouts."""
import random
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import Order, OrderDetail, Product, Staff, Store

# Roughly mirrors the old CHANNEL_REVENUE mock's proportions (POS majority,
# long tail of marketplace channels).
CHANNEL_WEIGHTS = [
    ('POS', 50),
    ('GrabMart', 20),
    ('ShopeeFood', 14),
    ('BeMart', 10),
    ('Lazada', 6),
]
PAYMENT_METHODS = {
    'POS': ['Cash', 'Card', 'MoMo'],
    'GrabMart': ['GrabPay'],
    'ShopeeFood': ['ShopeeFood Wallet'],
    'BeMart': ['BeMartPay'],
    'Lazada': ['Lazada Wallet'],
}
STATUS_WEIGHTS = [('Completed', 88), ('Pending', 6), ('Canceled', 6)]

# Store hours 7-22, weighted toward lunch (11-13) and dinner (18-21) so the
# Peak Hours chart has a real signal instead of a flat line.
HOUR_WEIGHTS = {h: 1 for h in range(7, 23)}
for _h in (11, 12, 13):
    HOUR_WEIGHTS[_h] = 5
for _h in (18, 19, 20, 21):
    HOUR_WEIGHTS[_h] = 4


def weighted_choice(pairs):
    items, weights = zip(*pairs)
    return random.choices(items, weights=weights, k=1)[0]


class Command(BaseCommand):
    help = 'Backfills realistic Order/OrderDetail history across every existing Store/Product for dashboards that had zero order data. Refuses to run if any Order already exists.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=45, help='How many days of history to backfill, ending today.')
        parser.add_argument('--min-per-day', type=int, default=4, help='Minimum orders per store per weekday.')
        parser.add_argument('--max-per-day', type=int, default=9, help='Maximum orders per store per weekday.')

    def handle(self, *args, **options):
        days = options['days']
        min_per_day = options['min_per_day']
        max_per_day = options['max_per_day']

        if Order.objects.exists():
            self.stdout.write(self.style.WARNING('Orders already exist -- refusing to reseed (this command is a one-time empty-history backfill).'))
            return

        stores = list(Store.objects.all())
        products = list(Product.objects.all())
        if not stores or not products:
            self.stdout.write(self.style.ERROR('No stores or products found -- nothing to seed.'))
            return

        today = timezone.localdate()
        created_orders = 0
        created_details = 0
        seq = 0

        for store in stores:
            cashiers = list(Staff.objects.filter(store=store))
            for day_offset in range(days):
                day = today - timedelta(days=day_offset)
                weekend_boost = 1.3 if day.weekday() >= 5 else 1.0
                n_orders = int(random.randint(min_per_day, max_per_day) * weekend_boost)

                for _ in range(n_orders):
                    seq += 1
                    channel = weighted_choice(CHANNEL_WEIGHTS)
                    status = weighted_choice(STATUS_WEIGHTS)
                    hour = weighted_choice(list(HOUR_WEIGHTS.items()))
                    order_dt = timezone.make_aware(datetime.combine(day, time(hour=hour, minute=random.randint(0, 59))))

                    staff = random.choice(cashiers) if channel == 'POS' and cashiers else None
                    external_id = None if channel == 'POS' else f'SEED-{store.store_id}-{channel}-{seq}'

                    with transaction.atomic():
                        order = Order.objects.create(
                            store=store, staff=staff, order_date=order_dt, order_type=channel,
                            payment_method=random.choice(PAYMENT_METHODS[channel]),
                            total_amount=Decimal('0'), status=status, external_order_id=external_id,
                        )
                        line_items = random.sample(products, k=random.randint(1, min(4, len(products))))
                        total = Decimal('0')
                        for product in line_items:
                            quantity = random.randint(1, 3)
                            unit_price = product.base_price
                            sub_total = (unit_price * quantity).quantize(Decimal('0.01'))
                            OrderDetail.objects.create(
                                order=order, product=product, quantity=quantity,
                                unit_price=unit_price, sub_total=sub_total,
                            )
                            total += sub_total
                            created_details += 1
                        order.total_amount = total
                        order.save(update_fields=['total_amount'])
                        created_orders += 1

        self.stdout.write(self.style.SUCCESS(f'Seeded {created_orders} orders / {created_details} order lines across {len(stores)} store(s) over the last {days} days.'))
