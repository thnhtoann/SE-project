from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .models import (
    Batch, Category, Product, Store, StoreInventory, Supplier,
    Role, Staff, PurchaseOrder, PurchaseOrderDetail, InventoryAlert,
    Order, StaffReview, StaffDocument, StaffCertificate,
)

from core.inventory import deduct_stock, InsufficientStockError

class SupplierApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.user = Staff.objects.create_user(
            username='supplier_mgr', password='password123', full_name='Supplier Mgr', role=self.role
        )
        self.client.force_authenticate(user=self.user)

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


class PurchaseOrderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Setup role and user with Chain Manager permissions
        self.role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.user = Staff.objects.create_user(
            username='manager1',
            password='password123',
            full_name='Manager Test',
            role=self.role
        )
        self.client.force_authenticate(user=self.user)

        # Setup Supplier, Category, and Products
        self.supplier = Supplier.objects.create(
            supplier_name='Global Trade Co',
            contact_phone='0988776655',
            email='info@globaltrade.com',
            address='100 Logistics Way'
        )
        self.category = Category.objects.create(category_name='Electronics')
        self.product1 = Product.objects.create(
            barcode='SKU-PROD-1',
            product_name='USB Cable',
            base_price=Decimal('5.00'),
            min_threshold=10,
            category=self.category
        )
        self.product2 = Product.objects.create(
            barcode='SKU-PROD-2',
            product_name='Power Bank',
            base_price=Decimal('25.00'),
            min_threshold=5,
            category=self.category
        )

    def test_create_purchase_order_with_line_items_success(self):
        url = reverse('purchaseorder-list')
        payload = {
            'supplier': self.supplier.pk,
            'order_date': '2026-08-14',
            'expected_delivery_date': '2026-08-20',
            'status': 'Preparing',
            'details': [
                {'product': self.product1.pk, 'order_qty': 20, 'unit_cost': '3.50'},
                {'product': self.product2.pk, 'order_qty': 5, 'unit_cost': '18.00'}
            ]
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PurchaseOrder.objects.count(), 1)
        self.assertEqual(PurchaseOrderDetail.objects.count(), 2)

        po = PurchaseOrder.objects.first()
        self.assertEqual(po.supplier, self.supplier)
        self.assertEqual(po.status, 'Preparing')
        # Total: (20 * 3.50) + (5 * 18.00) = 70.00 + 90.00 = 160.00
        self.assertEqual(Decimal(str(po.total_amount)), Decimal('160.00'))

    def test_create_purchase_order_invalid_quantity_or_cost_fails(self):
        url = reverse('purchaseorder-list')

        # Negative / Zero quantity
        payload_invalid_qty = {
            'supplier': self.supplier.pk,
            'order_date': '2026-08-14',
            'status': 'Preparing',
            'details': [
                {'product': self.product1.pk, 'order_qty': 0, 'unit_cost': '3.50'}
            ]
        }
        res_qty = self.client.post(url, payload_invalid_qty, format='json')
        self.assertEqual(res_qty.status_code, status.HTTP_400_BAD_REQUEST)

        # Negative unit cost
        payload_invalid_cost = {
            'supplier': self.supplier.pk,
            'order_date': '2026-08-14',
            'status': 'Preparing',
            'details': [
                {'product': self.product1.pk, 'order_qty': 10, 'unit_cost': '-5.00'}
            ]
        }
        res_cost = self.client.post(url, payload_invalid_cost, format='json')
        self.assertEqual(res_cost.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_purchase_order_nonexistent_product_fails(self):
        url = reverse('purchaseorder-list')
        payload = {
            'supplier': self.supplier.pk,
            'order_date': '2026-08-14',
            'status': 'Preparing',
            'details': [
                {'product': 99999, 'order_qty': 10, 'unit_cost': '5.00'}
            ]
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PurchaseOrder.objects.count(), 0)

    def test_update_purchase_order_status_success(self):
        po = PurchaseOrder.objects.create(
            supplier=self.supplier,
            order_date='2026-08-14',
            status='Preparing'
        )

        status_url = reverse('purchaseorder-status', kwargs={'pk': po.pk})
        
        # Update to Delivered
        res = self.client.patch(status_url, {'status': 'Delivered'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        po.refresh_from_db()
        self.assertEqual(po.status, 'Delivered')

        # Update to Delayed
        res_delayed = self.client.patch(status_url, {'status': 'Delayed'}, format='json')
        self.assertEqual(res_delayed.status_code, status.HTTP_200_OK)
        po.refresh_from_db()
        self.assertEqual(po.status, 'Delayed')

    def test_update_purchase_order_invalid_status_fails(self):
        po = PurchaseOrder.objects.create(
            supplier=self.supplier,
            order_date='2026-08-14',
            status='Preparing'
        )

        status_url = reverse('purchaseorder-status', kwargs={'pk': po.pk})
        res = self.client.patch(status_url, {'status': 'InvalidStatus'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        po.refresh_from_db()
        self.assertEqual(po.status, 'Preparing')

    def test_filter_purchase_orders_by_status_and_supplier(self):
        supplier2 = Supplier.objects.create(
            supplier_name='Alt Supplier',
            contact_phone='0911223344'
        )
        po1 = PurchaseOrder.objects.create(
            supplier=self.supplier,
            order_date='2026-08-10',
            status='Preparing'
        )
        po2 = PurchaseOrder.objects.create(
            supplier=supplier2,
            order_date='2026-08-12',
            status='Delivered'
        )

        url = reverse('purchaseorder-list')

        # Filter status=Preparing
        res_status = self.client.get(url, {'status': 'Preparing'})
        self.assertEqual(res_status.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_status.json()), 1)
        self.assertEqual(res_status.json()[0]['po_id'], po1.pk)

        # Filter supplier=supplier2.pk
        res_sup = self.client.get(url, {'supplier': supplier2.pk})
        self.assertEqual(res_sup.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_sup.json()), 1)
        self.assertEqual(res_sup.json()[0]['po_id'], po2.pk)


class ShipmentApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Auth user
        self.role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.user = Staff.objects.create_user(
            username='manager_shipment',
            password='password123',
            full_name='Shipment Manager',
            role=self.role
        )
        self.client.force_authenticate(user=self.user)

        # Supplier & Product
        self.supplier = Supplier.objects.create(
            supplier_name='Logistics Hub Inc',
            contact_phone='0912345678',
            email='logistics@hub.com'
        )
        self.category = Category.objects.create(category_name='Beverages')
        self.product = Product.objects.create(
            barcode='BEV-001',
            product_name='Mineral Water',
            base_price=Decimal('1.00'),
            min_threshold=50,
            category=self.category
        )

        # Shipments
        today = date.today()
        yesterday = today - timedelta(days=2)
        next_week = today + timedelta(days=7)

        self.on_time_shipment = PurchaseOrder.objects.create(
            supplier=self.supplier,
            order_date=today,
            expected_delivery_date=next_week,
            status='Preparing'
        )
        PurchaseOrderDetail.objects.create(
            po=self.on_time_shipment,
            product=self.product,
            order_qty=100,
            unit_cost=Decimal('0.50')
        )

        self.past_due_shipment = PurchaseOrder.objects.create(
            supplier=self.supplier,
            order_date=yesterday - timedelta(days=5),
            expected_delivery_date=yesterday,
            status='Preparing'
        )

    def test_list_shipments_includes_supplier_details_and_overdue_flag(self):
        url = reverse('shipment-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Checking that past_due_shipment was auto-updated to Delayed
        self.past_due_shipment.refresh_from_db()
        self.assertEqual(self.past_due_shipment.status, 'Delayed')

        data = response.json()
        self.assertEqual(len(data), 2)

        # Check structure of on_time_shipment
        shipment_data = next(item for item in data if item['po_id'] == self.on_time_shipment.pk)
        self.assertEqual(shipment_data['supplier_name'], 'Logistics Hub Inc')
        self.assertEqual(shipment_data['contact_phone'], '0912345678')
        self.assertEqual(shipment_data['is_overdue'], False)
        self.assertEqual(len(shipment_data['details']), 1)
        self.assertEqual(shipment_data['details'][0]['product_name'], 'Mineral Water')

    def test_retrieve_shipment_detail_success_and_not_found(self):
        detail_url = reverse('shipment-detail', kwargs={'pk': self.on_time_shipment.pk})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['po_id'], self.on_time_shipment.pk)

        # 404 for non-existent shipment ID
        invalid_url = reverse('shipment-detail', kwargs={'pk': 99999})
        response_404 = self.client.get(invalid_url)
        self.assertEqual(response_404.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_shipment_status_success(self):
        status_url = reverse('shipment-status', kwargs={'pk': self.on_time_shipment.pk})
        response = self.client.patch(status_url, {'status': 'Delivered'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['status'], 'Delivered')

        self.on_time_shipment.refresh_from_db()
        self.assertEqual(self.on_time_shipment.status, 'Delivered')

        self.past_due_shipment.refresh_from_db()
        self.assertEqual(self.past_due_shipment.status, 'Delayed')


class LowStockAlertApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Role & User
        self.role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.user = Staff.objects.create_user(
            username='manager_alert',
            password='password123',
            full_name='Alert Manager',
            role=self.role
        )
        self.client.force_authenticate(user=self.user)

        self.store = Store.objects.create(store_name='Central Store', location='District 1')
        self.category = Category.objects.create(category_name='Groceries')

        # Product with min_threshold = 10
        self.product = Product.objects.create(
            barcode='SKU-ALERT-1',
            product_name='Cooking Oil',
            base_price=Decimal('15.00'),
            min_threshold=10,
            category=self.category
        )

    def _set_stock(self, quantity):
        StoreInventory.objects.filter(store=self.store, batch__product=self.product).delete()
        if quantity > 0:
            batch = Batch.objects.create(
                product=self.product,
                manufacture_date=date.today() - timedelta(days=10),
                expiration_date=date.today() + timedelta(days=90)
            )
            StoreInventory.objects.create(store=self.store, batch=batch, quantity=quantity)

    def test_bva_above_threshold_generates_no_alert(self):
        """BVA: quantity (11) > min_threshold (10) -> No alert generated."""
        self._set_stock(11)
        url = reverse('inventory-low-stock-alert-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alerts = response.json()
        self.assertEqual(len(alerts), 0)

    def test_bva_at_threshold_generates_alert(self):
        """BVA: quantity (10) == min_threshold (10) -> Alert generated."""
        self._set_stock(10)
        url = reverse('inventory-low-stock-alert-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alerts = response.json()
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]['current_stock'], 10)
        self.assertEqual(alerts[0]['min_threshold'], 10)
        self.assertEqual(alerts[0]['product_name'], 'Cooking Oil')

    def test_bva_below_threshold_generates_alert(self):
        """BVA: quantity (9) < min_threshold (10) -> Alert generated."""
        self._set_stock(9)
        url = reverse('inventory-low-stock-alert-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        alerts = response.json()
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]['current_stock'], 9)

    def test_resolve_alert_success(self):
        self._set_stock(5)
        url = reverse('inventory-low-stock-alert-list')
        response = self.client.get(url)
        alert_id = response.json()[0]['alert_id']

        resolve_url = reverse('inventory-low-stock-alert-resolve', kwargs={'pk': alert_id})
        res = self.client.patch(resolve_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.json()['is_resolved'])


class RbacProcurementApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Roles
        self.chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.store_manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        self.cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]

        # Users
        self.chain_manager = Staff.objects.create_user(
            username='chain_mgr', password='password123', full_name='Chain Mgr', role=self.chain_manager_role
        )
        self.store_manager = Staff.objects.create_user(
            username='store_mgr', password='password123', full_name='Store Mgr', role=self.store_manager_role
        )
        self.cashier = Staff.objects.create_user(
            username='cashier_user', password='password123', full_name='Cashier User', role=self.cashier_role
        )

        # Supplier & Purchase Order
        self.supplier = Supplier.objects.create(
            supplier_name='RBAC Supplier', contact_phone='0900000000'
        )
        self.po = PurchaseOrder.objects.create(
            supplier=self.supplier, order_date=date.today(), status='Preparing'
        )

    def test_unauthenticated_request_returns_401(self):
        url = reverse('supplier-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cashier_cannot_access_supplier_or_procurement_apis(self):
        self.client.force_authenticate(user=self.cashier)

        res_sup = self.client.get(reverse('supplier-list'))
        self.assertEqual(res_sup.status_code, status.HTTP_403_FORBIDDEN)

        res_po = self.client.get(reverse('purchaseorder-list'))
        self.assertEqual(res_po.status_code, status.HTTP_403_FORBIDDEN)

        res_shipment = self.client.get(reverse('shipment-list'))
        self.assertEqual(res_shipment.status_code, status.HTTP_403_FORBIDDEN)

        res_alert = self.client.get(reverse('inventory-low-stock-alert-list'))
        self.assertEqual(res_alert.status_code, status.HTTP_403_FORBIDDEN)

    def test_store_manager_can_view_supplier_but_cannot_modify(self):
        self.client.force_authenticate(user=self.store_manager)

        # GET Supplier allowed
        res_get = self.client.get(reverse('supplier-list'))
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)

        # POST Supplier forbidden
        res_post = self.client.post(
            reverse('supplier-list'),
            {'supplier_name': 'New Sup', 'contact_phone': '0911'},
            format='json'
        )
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)

        # DELETE Supplier forbidden
        res_del = self.client.delete(reverse('supplier-detail', kwargs={'pk': self.supplier.pk}))
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

    def test_store_manager_cannot_delete_purchase_order(self):
        self.client.force_authenticate(user=self.store_manager)

        res_del = self.client.delete(reverse('purchaseorder-detail', kwargs={'pk': self.po.pk}))
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

    def test_chain_manager_has_full_access(self):
        self.client.force_authenticate(user=self.chain_manager)

        # POST Supplier allowed
        res_post = self.client.post(
            reverse('supplier-list'),
            {'supplier_name': 'Chain Sup', 'contact_phone': '0922222222'},
            format='json'
        )
        self.assertEqual(res_post.status_code, status.HTTP_201_CREATED)

        # DELETE PO allowed
        res_del = self.client.delete(reverse('purchaseorder-detail', kwargs={'pk': self.po.pk}))
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)


class StaffProfileApiTests(TestCase):
    """Covers the Staff HR-profile fields/sub-resources added alongside the
    frontend-backend routing work: monthly_sales/performance_status
    (computed live from Order data) and the reviews/documents/certificates
    sub-resources, plus their shared Chain-Manager-only RBAC gate."""

    def setUp(self):
        self.client = APIClient()
        self.chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        self.chain_manager = Staff.objects.create_user(
            username='profile_mgr', password='password123', full_name='Profile Mgr', role=self.chain_manager_role
        )
        self.cashier = Staff.objects.create_user(
            username='profile_cashier', password='password123', full_name='Profile Cashier', role=self.cashier_role
        )
        self.store = Store.objects.create(store_name='Main Store', location='HCMC')

    def test_monthly_sales_sums_current_month_orders_for_staff(self):
        Order.objects.create(
            store=self.store, staff=self.cashier, order_date=timezone.now(),
            order_type='POS', payment_method='cash', total_amount=Decimal('1500000.00'), status='Completed'
        )
        Order.objects.create(
            store=self.store, staff=self.cashier, order_date=timezone.now(),
            order_type='POS', payment_method='cash', total_amount=Decimal('4000000.00'), status='Completed'
        )
        # Different staff member's order must not be counted
        Order.objects.create(
            store=self.store, staff=self.chain_manager, order_date=timezone.now(),
            order_type='POS', payment_method='cash', total_amount=Decimal('9000000.00'), status='Completed'
        )

        self.client.force_authenticate(user=self.chain_manager)
        response = self.client.get(reverse('staff-detail', kwargs={'pk': self.cashier.pk}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['monthly_sales'], 5500000.0)
        self.assertEqual(response.data['performance_status'], 'Good')

    def test_reviews_documents_certificates_nested_on_staff_detail(self):
        StaffReview.objects.create(staff=self.cashier, reviewer='Ops Lead', rating=5, comment='Great work')
        StaffCertificate.objects.create(staff=self.cashier, name='Food Safety', issued_by='Board', issued_at=date.today())
        StaffDocument.objects.create(staff=self.cashier, name='Contract', file='staff_documents/test.txt')

        self.client.force_authenticate(user=self.chain_manager)
        response = self.client.get(reverse('staff-detail', kwargs={'pk': self.cashier.pk}))

        self.assertEqual(len(response.data['reviews']), 1)
        self.assertEqual(len(response.data['certificates']), 1)
        self.assertEqual(len(response.data['documents']), 1)

    def test_cashier_cannot_create_staff_review(self):
        self.client.force_authenticate(user=self.cashier)
        response = self.client.post(
            reverse('staffreview-list'),
            {'staff': self.cashier.pk, 'reviewer': 'Self', 'rating': 5, 'comment': 'n/a'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_review_rating_out_of_range_rejected(self):
        self.client.force_authenticate(user=self.chain_manager)
        response = self.client.post(
            reverse('staffreview-list'),
            {'staff': self.cashier.pk, 'reviewer': 'Ops Lead', 'rating': 6, 'comment': 'n/a'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_reviews_filterable_by_staff_query_param(self):
        StaffReview.objects.create(staff=self.cashier, reviewer='Ops Lead', rating=4, comment='Good')
        StaffReview.objects.create(staff=self.chain_manager, reviewer='Board', rating=5, comment='Excellent')

        self.client.force_authenticate(user=self.chain_manager)
        response = self.client.get(reverse('staffreview-list'), {'staff': self.cashier.pk})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['reviewer'], 'Ops Lead')