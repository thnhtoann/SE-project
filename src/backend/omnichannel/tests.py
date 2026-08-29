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
        # Seed enough stock so webhook-triggered deduct_stock() has something
        # to deduct from -- without this, every test here hits
        # InsufficientStockError (409) instead of a successful order.
        batch = Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=10),
            expiration_date=date.today() + timedelta(days=30),
        )
        StoreInventory.objects.create(store=self.store, batch=batch, quantity=100)

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