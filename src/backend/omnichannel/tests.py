from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from core.models import Batch, Category, Order, OrderDetail, Product, Store, StoreInventory, Role

from .services import save_normalized_order


class OmnichannelWebhookNormalizationTests(APITestCase):
    """OMNI-2: normalization of GrabMart/ShopeeFood/BeMart payloads into
    ORDER/ORDER_DETAIL."""

    def setUp(self):
        self.client = APIClient()
        self.store = Store.objects.create(store_name="Test Store", location="HCMC")
        category = Category.objects.create(category_name="Beverages")
        self.product = Product.objects.create(
            barcode="8934673125456",
            product_name="Sparkling Water",
            base_price=Decimal("0.90"),
            min_threshold=10,
            category=category,
        )
        # OMNI-3 routes every webhook order through deduct_stock(), so these
        # tests need real stock on hand
        batch = Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=10),
            expiration_date=date.today() + timedelta(days=30),
        )
        StoreInventory.objects.create(store=self.store, batch=batch, quantity=1000)

    def test_grabmart_webhook_creates_order_and_details(self):
        payload = {
            "orderId": "GM-1001",
            "storeId": self.store.store_id,
            "orderTime": "2026-08-14T09:30:00Z",
            "paymentMethod": "GrabPay",
            "items": [{"barcode": self.product.barcode, "qty": 2, "price": "0.90"}],
        }
        response = self.client.post(
            "/api/webhooks/grabmart/", payload, format="json",
            HTTP_X_GRAB_SIGNATURE="dev-grabmart-secret",
        )
        self.assertEqual(response.status_code, 200)
        order = Order.objects.get(pk=response.data["order_id"])
        self.assertEqual(order.order_type, "GrabMart")
        self.assertEqual(order.external_order_id, "GM-1001")
        self.assertEqual(order.status, "Pending")
        self.assertEqual(order.total_amount, Decimal("1.80"))
        self.assertEqual(OrderDetail.objects.filter(order=order).count(), 1)

    def test_duplicate_webhook_delivery_is_idempotent(self):
        payload = {
            "orderId": "GM-1002",
            "storeId": self.store.store_id,
            "orderTime": "2026-08-14T09:30:00Z",
            "paymentMethod": "GrabPay",
            "items": [{"barcode": self.product.barcode, "qty": 1, "price": "0.90"}],
        }
        headers = {"HTTP_X_GRAB_SIGNATURE": "dev-grabmart-secret"}
        r1 = self.client.post("/api/webhooks/grabmart/", payload, format="json", **headers)
        r2 = self.client.post("/api/webhooks/grabmart/", payload, format="json", **headers)
        self.assertEqual(r1.data["order_id"], r2.data["order_id"])
        self.assertEqual(Order.objects.filter(external_order_id="GM-1002").count(), 1)

    def test_unknown_product_barcode_returns_400(self):
        payload = {
            "orderId": "GM-1003",
            "storeId": self.store.store_id,
            "orderTime": "2026-08-14T09:30:00Z",
            "paymentMethod": "GrabPay",
            "items": [{"barcode": "0000000000000", "qty": 1, "price": "0.90"}],
        }
        response = self.client.post(
            "/api/webhooks/grabmart/", payload, format="json",
            HTTP_X_GRAB_SIGNATURE="dev-grabmart-secret",
        )
        self.assertEqual(response.status_code, 400)

class OrderRollbackOnFailureTests(APITestCase):
    """OMNI-4/OMNI-6 TC3: a DB failure partway through order creation must
    roll back the ENTIRE transaction -- no orphaned Order, no orphaned
    OrderDetail, and no partial inventory deduction left behind."""

    def setUp(self):
        # Store + product + one real StoreInventory row with plenty of stock,
        # so deduct_stock() actually reaches the row.save() step we'll fail.
        self.store = Store.objects.create(store_name="Test Store", location="HCMC")
        category = Category.objects.create(category_name="Beverages")
        self.product = Product.objects.create(
            barcode="8934673125999",
            product_name="Iced Tea",
            base_price=Decimal("1.00"),
            min_threshold=5,
            category=category,
        )
        today = date.today()
        batch = Batch.objects.create(
            product=self.product,
            manufacture_date=today - timedelta(days=10),
            expiration_date=today + timedelta(days=30),
        )
        self.inventory = StoreInventory.objects.create(store=self.store, batch=batch, quantity=10)

    def test_failure_during_inventory_deduction_rolls_back_order(self):
        # Simulate a DB failure at the exact moment core.inventory.deduct_stock()
        # tries to persist the reduced quantity -- i.e. AFTER Order and
        # OrderDetail have already been tentatively written inside the same
        # transaction.atomic() block in services.save_normalized_order().
        normalized_call_args = {
            "external_order_id": "GM-ROLLBACK-1",
            "store_id": self.store.store_id,
            "order_date": datetime(2026, 8, 14, 9, 30, 0),
            "payment_method": "GrabPay",
            "items": [{"barcode": self.product.barcode, "quantity": 1, "unit_price": Decimal("1.00")}],
        }

        with patch(
            "core.inventory.StoreInventory.save",
            side_effect=Exception("simulated DB failure"),
        ):
            with self.assertRaises(Exception):
                save_normalized_order("GrabMart", normalized_call_args)

        # Nothing from the failed transaction should have survived the rollback.
        self.assertEqual(Order.objects.filter(external_order_id="GM-ROLLBACK-1").count(), 0)
        self.assertEqual(OrderDetail.objects.count(), 0)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 10) 

class OrderChannelFilterTests(APITestCase):
    """OMNI-5: aggregated order list filtering by ?channel="""

    def setUp(self):
        self.client = APIClient()
        self.store = Store.objects.create(store_name="Test Store", location="HCMC")

        # 1. Create a Role to satisfy the not-null constraint
        self.role = Role.objects.create(role_name="Store Manager") 
        
        # 2. Get the active user model
        User = get_user_model()
        
        # 3. Create a test user AND pass the role
        self.user = User.objects.create_user(
            username="testuser", 
            password="testpassword",
            role=self.role 
        )
        
        # 4. Force authenticate the client
        self.client.force_authenticate(user=self.user)

    def test_no_channel_param_returns_all_orders(self):
        Order.objects.create(
            store=self.store, order_date="2026-08-12T09:00:00Z",
            order_type="GrabMart", payment_method="GrabPay",
            total_amount="1.00", status="Pending",
        )
        Order.objects.create(
            store=self.store, order_date="2026-08-12T09:05:00Z",
            order_type="POS", payment_method="Cash",
            total_amount="2.00", status="Completed",
        )
        response = self.client.get("/api/orders/")
        print(response.status_code, response.data)
        self.assertEqual(len(response.data), 2)

    def test_channel_param_filters_to_one_source(self):
        Order.objects.create(
            store=self.store, order_date="2026-08-12T09:00:00Z",
            order_type="GrabMart", payment_method="GrabPay",
            total_amount="1.00", status="Pending",
        )
        Order.objects.create(
            store=self.store, order_date="2026-08-12T09:05:00Z",
            order_type="BeMart", payment_method="BeMartPay",
            total_amount="2.00", status="Pending",
        )
        response = self.client.get("/api/orders/?channel=GrabMart")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["order_type"], "GrabMart")

class OmnichannelMultiPlatformAggregationTests(APITestCase):
    """TC1: orders from all 3 delivery platforms (GrabMart, ShopeeFood, BeMart)
    must aggregate onto the single dashboard feed (GET /api/orders/), each
    correctly identified by its source platform, with no duplicates and no
    missing orders. Covers U007 (Manage Omnichannel Orders), closing the gap
    OMNI-6's TC1 previously only covered via separate single-platform tests.
    """

    def setUp(self):
        # Sets up one shared store and one distinct product per platform, so
        # each order's line items are unambiguous when checking the
        # aggregated response later.
        self.client = APIClient()
        self.store = Store.objects.create(store_name="Test Store", location="HCMC")
        category = Category.objects.create(category_name="Beverages")

        self.grabmart_product = Product.objects.create(
            barcode="GRAB-0001", product_name="GrabMart Item",
            base_price=Decimal("1.00"), min_threshold=5, category=category,
        )
        self.shopeefood_product = Product.objects.create(
            barcode="SHOP-0001", product_name="ShopeeFood Item",
            base_price=Decimal("2.00"), min_threshold=5, category=category,
        )
        self.bemart_product = Product.objects.create(
            barcode="BEMA-0001", product_name="BeMart Item",
            base_price=Decimal("3.00"), min_threshold=5, category=category,
        )

        # Seed StoreInventory (via a Batch) for each product so deduct_stock()
        # inside the webhook flow has real stock to deduct from -- without
        # this, every webhook is correctly rejected as insufficient stock.
        today = date.today()
        for product in (self.grabmart_product, self.shopeefood_product, self.bemart_product):
            batch = Batch.objects.create(
                product=product,
                manufacture_date=today - timedelta(days=10),
                expiration_date=today + timedelta(days=30),
            )
            StoreInventory.objects.create(store=self.store, batch=batch, quantity=10)

        # Dashboard reads require an authenticated Store Manager (RBAC, see
        # core/permissions.py) -- webhook ingestion itself stays
        # unauthenticated / signature-based (see BaseWebhookView).
        role = Role.objects.create(role_name="Store Manager")
        User = get_user_model()
        self.manager = User.objects.create_user(
            username="dashboard_manager", password="testpassword", role=role,
        )

    def _fire_all_platform_webhooks(self):
        """Sends one webhook delivery per platform back-to-back, simulating
        near-simultaneous arrival from 3 independent external systems.
        NOTE: true multi-threaded concurrency for the SAME resource is
        already covered by TC2's race-condition test -- TC1's acceptance
        criteria is aggregation correctness across channels, not locking
        behavior, so sequential calls are sufficient here."""

        grabmart_payload = {
            "orderId": "GM-AGG-1",
            "storeId": self.store.store_id,
            "orderTime": "2026-08-15T09:00:00Z",
            "paymentMethod": "GrabPay",
            "items": [{"barcode": self.grabmart_product.barcode, "qty": 2, "price": "1.00"}],
        }
        shopeefood_payload = {
            "order_id": "SF-AGG-1",
            "store_id": self.store.store_id,
            "created_at": "2026-08-15T09:00:05Z",
            "payment_method": "ShopeePay",
            "order_items": [{"product_barcode": self.shopeefood_product.barcode, "quantity": 1, "unit_price": "2.00"}],
        }
        bemart_payload = {
            "id": "BM-AGG-1",
            "branch_id": self.store.store_id,
            "timestamp": "2026-08-15T09:00:10Z",
            "payment": "BeMartWallet",
            "products": [{"sku": self.bemart_product.barcode, "amount": 3, "price": "3.00"}],
        }

        return {
            "GrabMart": self.client.post(
                "/api/webhooks/grabmart/", grabmart_payload, format="json",
                HTTP_X_GRAB_SIGNATURE="dev-grabmart-secret",
            ),
            "ShopeeFood": self.client.post(
                "/api/webhooks/shopeefood/", shopeefood_payload, format="json",
                HTTP_X_SHOPEE_SIGNATURE="dev-shopeefood-secret",
            ),
            "BeMart": self.client.post(
                "/api/webhooks/bemart/", bemart_payload, format="json",
                HTTP_X_BEMART_SIGNATURE="dev-bemart-secret",
            ),
        }

    def test_orders_from_all_three_platforms_appear_on_unified_dashboard(self):
        # This is TC1's actual body: fire all 3, then check the dashboard sees
        # exactly 3 orders, correctly attributed, with correct totals -- and
        # that the ?channel= filter (OMNI-5) isolates each one correctly.
        responses = self._fire_all_platform_webhooks()

        for platform, response in responses.items():
            self.assertEqual(response.status_code, 200, f"{platform} webhook was rejected: {response.data}")

        self.client.force_authenticate(user=self.manager)
        dashboard_response = self.client.get("/api/orders/")
        self.assertEqual(dashboard_response.status_code, 200)

        orders_by_type = {order["order_type"]: order for order in dashboard_response.data}

        self.assertEqual(set(orders_by_type.keys()), {"GrabMart", "ShopeeFood", "BeMart"})
        self.assertEqual(len(dashboard_response.data), 3)  # no duplicates, none missing

        self.assertEqual(Decimal(orders_by_type["GrabMart"]["total_amount"]), Decimal("2.00"))    # 2 x 1.00
        self.assertEqual(Decimal(orders_by_type["ShopeeFood"]["total_amount"]), Decimal("2.00"))  # 1 x 2.00
        self.assertEqual(Decimal(orders_by_type["BeMart"]["total_amount"]), Decimal("9.00"))      # 3 x 3.00

        for platform in ("GrabMart", "ShopeeFood", "BeMart"):
            filtered = self.client.get(f"/api/orders/?channel={platform}")
            self.assertEqual(len(filtered.data), 1)
            self.assertEqual(filtered.data[0]["order_type"], platform)

    def test_duplicate_delivery_across_all_platforms_does_not_create_duplicate_orders(self):
        """Edge case named in specs/002-omnichannel-hub/spec.md: a platform
        resending the same webhook event must not double-count on the
        dashboard, for ANY of the three platforms -- not just one."""
        self._fire_all_platform_webhooks()
        self._fire_all_platform_webhooks()  # simulate a retried/duplicate delivery from all 3

        self.client.force_authenticate(user=self.manager)
        dashboard_response = self.client.get("/api/orders/")
        self.assertEqual(len(dashboard_response.data), 3)  # still exactly one order per platform