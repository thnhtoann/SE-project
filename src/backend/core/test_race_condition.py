"""OMNI-4/OMNI-6 TC2: race-condition test for deduct_stock().

Uses TransactionTestCase instead of TestCase because TestCase wraps the whole
test in one outer transaction and rolls it back at the end -- two threads
would never see two real, independently-committing transactions, so
select_for_update() locking could never actually be exercised. Must be run
against Postgres (not SQLite) for row-level locking to be meaningful.
"""

import threading

from django.db import connections, transaction
from django.test import TransactionTestCase

from core.inventory import InsufficientStockError, deduct_stock
from core.models import Batch, Category, Product, Store, StoreInventory


class StockDeductionRaceConditionTests(TransactionTestCase):
    def setUp(self):
        # One product with exactly 1 unit of stock -- the minimum needed to
        # force two concurrent buyers to compete for the same last unit.
        self.store = Store.objects.create(store_name='Test Store', location='HCMC')
        category = Category.objects.create(category_name='Beverages')
        self.product = Product.objects.create(
            barcode='RACE-TEST-1',
            product_name='Water',
            base_price='0.90',
            min_threshold=5,
            category=category,
        )
        batch = Batch.objects.create(
            product=self.product,
            manufacture_date='2026-01-01',
            expiration_date='2026-12-31',
        )
        self.inventory = StoreInventory.objects.create(store=self.store, batch=batch, quantity=1)

    def test_two_concurrent_sales_of_last_unit_only_one_succeeds(self):
        """Fire two deduct_stock() calls at the exact same instant for the
        same last unit of stock. Exactly one must succeed and one must be
        rejected with InsufficientStockError; inventory must never go
        negative and must never be double-deducted."""

        # Barrier forces both threads to call deduct_stock() at the same
        # instant instead of one finishing before the other even starts.
        barrier = threading.Barrier(2)
        results = []

        def attempt_purchase():
            # What each simulated "buyer" thread does: wait for its sibling,
            # then try to deduct 1 unit inside its own real transaction.
            barrier.wait()
            try:
                with transaction.atomic():
                    deduct_stock(self.store, self.product, 1)
                results.append('success')
            except InsufficientStockError:
                results.append('rejected')
            finally:
                # Each thread opens its own DB connection; must close it
                # explicitly or Django leaks connections across threads.
                connections.close_all()

        threads = [threading.Thread(target=attempt_purchase) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(sorted(results), ['rejected', 'success'])
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 0)  # never negative, never double-sold