from datetime import date, timedelta

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .models import Batch, Category, Product, Store, StoreInventory, Supplier

from core.inventory import deduct_stock, InsufficientStockError

class SupplierApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.supplier = Supplier.objects.create(
            supplier_name='Alpha Supplies',
            contact_phone='0901234567',
            email='alpha@example.com',
            address='123 Main St'
        )

    def test_list_suppliers(self):
        response = self.client.get(reverse('supplier-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['supplier_name'], 'Alpha Supplies')

    def test_create_supplier(self):
        payload = {
            'supplier_name': 'Beta Supplies',
            'contact_phone': '0907654321',
            'email': 'beta@example.com',
            'address': '456 Side Rd',
        }

        response = self.client.post(reverse('supplier-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Supplier.objects.count(), 2)
        self.assertEqual(response.json()['supplier_name'], 'Beta Supplies')

    def test_update_supplier(self):
        payload = {
            'supplier_name': 'Alpha Supplies Updated',
            'contact_phone': '0901234567',
            'email': 'alpha.updated@example.com',
            'address': '789 New St',
        }

        response = self.client.put(
            reverse('supplier-detail', kwargs={'pk': self.supplier.pk}),
            payload,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['supplier_name'], 'Alpha Supplies Updated')
        self.supplier.refresh_from_db()
        self.assertEqual(self.supplier.supplier_name, 'Alpha Supplies Updated')

    def test_delete_supplier(self):
        response = self.client.delete(reverse('supplier-detail', kwargs={'pk': self.supplier.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Supplier.objects.filter(pk=self.supplier.pk).exists())

    def test_create_supplier_requires_name_and_phone(self):
        payload = {
            'email': 'invalid@example.com',
            'address': 'No data',
        }

        response = self.client.post(reverse('supplier-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('supplier_name', response.json())
        self.assertIn('contact_phone', response.json())

    def test_create_supplier_rejects_invalid_email_format(self):
        payload = {
            'supplier_name': 'Gamma Supplies',
            'contact_phone': '0901111111',
            'email': 'not-an-email',
        }

        response = self.client.post(reverse('supplier-list'), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.json())


class ProcurementTestingTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(category_name='Food')
        self.product = Product.objects.create(
            barcode='SKU-001',
            product_name='Instant Milk',
            base_price='20.00',
            min_threshold=5,
            category=self.category,
        )
        self.store = Store.objects.create(store_name='Downtown Store', location='District 1')

    def test_low_stock_alert_triggers_at_boundary_values(self):
        self.assertFalse(self.product.is_low_stock(6))
        self.assertTrue(self.product.is_low_stock(5))
        self.assertTrue(self.product.is_low_stock(4))

    def test_batch_expiration_is_detected_for_soon_to_expire_items(self):
        today = date.today()
        soon_expiring_batch = Batch.objects.create(
            product=self.product,
            manufacture_date=today - timedelta(days=30),
            expiration_date=today + timedelta(days=7),
        )
        far_future_batch = Batch.objects.create(
            product=self.product,
            manufacture_date=today - timedelta(days=30),
            expiration_date=today + timedelta(days=10),
        )

        self.assertTrue(soon_expiring_batch.is_expiring_soon(days=7, as_of_date=today))
        self.assertFalse(far_future_batch.is_expiring_soon(days=7, as_of_date=today))

    def test_inventory_quantity_is_tracked_against_product_threshold(self):
        batch = Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=10),
            expiration_date=date.today() + timedelta(days=30),
        )
        StoreInventory.objects.create(store=self.store, batch=batch, quantity=4)

        inventory = StoreInventory.objects.get(store=self.store, batch=batch)

        self.assertEqual(inventory.quantity, 4)
        self.assertTrue(self.product.is_low_stock(inventory.quantity))

class DeductStockTests(TestCase):
    """OMNI-3: real-time stock deduction (FEFO across StoreInventory batches)."""

    def setUp(self):
        self.category = Category.objects.create(category_name='Beverages')
        self.product = Product.objects.create(
            barcode='8934673125456',
            product_name='Sparkling Water',
            base_price=Decimal('0.90'),
            min_threshold=5,
            category=self.category,
        )
        self.store = Store.objects.create(store_name='Test Store', location='HCMC')

    def _make_inventory(self, expiration_offset_days, quantity):
        """Helper: create a Batch + matching StoreInventory row for self.product
        at self.store, expiring `expiration_offset_days` from today, with the
        given starting quantity."""
        today = date.today()
        batch = Batch.objects.create(
            product=self.product,
            manufacture_date=today - timedelta(days=30),
            expiration_date=today + timedelta(days=expiration_offset_days),
        )
        return StoreInventory.objects.create(store=self.store, batch=batch, quantity=quantity)

    def test_exact_boundary_deduction(self):
        """Requesting exactly the available quantity should succeed and leave
        the batch at exactly zero (not negative, not left over)."""
        inventory = self._make_inventory(expiration_offset_days=7, quantity=5)

        deduct_stock(self.store, self.product, 5)

        inventory.refresh_from_db()
        self.assertEqual(inventory.quantity, 0)

    def test_insufficient_stock_raises_and_does_not_modify_inventory(self):
        """Requesting more than total available stock across all batches must
        raise InsufficientStockError and must NOT partially deduct anything —
        the inventory should be completely unchanged after the failed call."""
        inventory = self._make_inventory(expiration_offset_days=7, quantity=3)

        with self.assertRaises(InsufficientStockError):
            deduct_stock(self.store, self.product, 10)

        inventory.refresh_from_db()
        self.assertEqual(inventory.quantity, 3)  # untouched, no partial deduction

    def test_multibatch_fefo_split(self):
        """When a deduction spans multiple batches, the soonest-to-expire batch
        (FEFO) must be drained first, then the remainder taken from the next
        soonest-expiring batch — never touching a later batch until an earlier
        one is empty."""
        soon = self._make_inventory(expiration_offset_days=3, quantity=4)   # expires soonest
        later = self._make_inventory(expiration_offset_days=30, quantity=10)  # expires later

        # Request 6: should fully drain `soon` (4) then take 2 from `later`
        deduct_stock(self.store, self.product, 6)

        soon.refresh_from_db()
        later.refresh_from_db()
        self.assertEqual(soon.quantity, 0)
        self.assertEqual(later.quantity, 8)

    def test_multibatch_fefo_exact_boundary_across_two_batches(self):
        """Requesting a quantity that exactly matches the sum of two batches
        should drain both to zero, still respecting expiration order."""
        soon = self._make_inventory(expiration_offset_days=1, quantity=2)
        later = self._make_inventory(expiration_offset_days=15, quantity=3)

        deduct_stock(self.store, self.product, 5)  # exactly 2 + 3

        soon.refresh_from_db()
        later.refresh_from_db()
        self.assertEqual(soon.quantity, 0)
        self.assertEqual(later.quantity, 0)