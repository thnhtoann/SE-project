import json
from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from core.models import Batch, Category, Order, OrderDetail, Product, Role, Staff, Store

from .services import OrderService


class OrderServiceTest(TestCase):
    def setUp(self):
        self.service = OrderService()

        self.role = Role.objects.create(role_name="Cashier")
        self.store = Store.objects.create(store_name="Store 1", location="HCM")
        self.staff = Staff.objects.create(
            username="admin",
            password="123",
            full_name="Nhut",
            role=self.role,
            store=self.store,
        )
        self.category = Category.objects.create(category_name="Drink")
        self.product = Product.objects.create(
            barcode="893123456789",
            product_name="Coca Cola",
            base_price=Decimal("12000.00"),
            min_threshold=5,
            category=self.category,
        )

    def print_json(self, test_name, payload):
        print(f"\n=== {test_name} ===")
        print(json.dumps(payload, ensure_ascii=False, indent=2, default=str))

    # =====================================================
    # CREATE ORDER
    # =====================================================

    def test_create_order(self):
        order = self.service.create_order(
            self.store.store_id,
            self.staff.staff_id,
        )

        self.print_json(
            "test_create_order",
            {
                "order_id": order.order_id,
                "store_id": order.store_id,
                "staff_id": order.staff_id,
                "status": order.status,
                "total_amount": str(order.total_amount),
            },
        )

        self.assertEqual(order.store, self.store)
        self.assertEqual(order.staff, self.staff)
        self.assertEqual(order.status, "Pending")
        self.assertEqual(order.total_amount, Decimal("0.00"))
    # =====================================================
    # PAYMENT WEBHOOK
    # =====================================================

    def test_payment_webhook_updates_order_status(self):
        Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=5),
        )

        order = self.service.create_order(
            self.store.store_id,
            self.staff.staff_id,
        )

        self.service.add_item(
            order.order_id,
            self.product.product_id,
            1,
        )

        updated_order = self.service.handle_payment_webhook(
            {
                "order_id": order.order_id,
                "status": "paid",
                "payment_method": "Bank QR",
                "payment_reference": "qr-001",
            }
        )

        order.refresh_from_db()

        self.print_json(
            "test_payment_webhook_updates_order_status",
            {
                "order_id": order.order_id,
                "status": order.status,
                "payment_method": order.payment_method,
            },
        )

        self.assertEqual(updated_order.status, "Paid")
        self.assertEqual(order.status, "Paid")

    # =====================================================
    # ANALYTICS
    # =====================================================

    def test_sales_analytics_returns_grouped_metrics(self):
        Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=5),
        )

        paid_order = self.service.create_order(
            self.store.store_id,
            self.staff.staff_id,
        )
        self.service.add_item(
            paid_order.order_id,
            self.product.product_id,
            2,
        )
        paid_order.order_date = timezone.now() - timedelta(days=1)
        paid_order.status = "Paid"
        paid_order.save(update_fields=["order_date", "status"])

        analytics = self.service.get_sales_analytics()

        self.print_json("test_sales_analytics_returns_grouped_metrics", analytics)

        self.assertIn("best_sellers", analytics)
        self.assertIn("worst_sellers", analytics)
        self.assertIn("revenue_by_hour", analytics)
        self.assertIn("revenue_by_day", analytics)
        self.assertIn("revenue_by_month", analytics)
        self.assertIn("sales_trend", analytics)
    # =====================================================
    # DISCOUNT
    # =====================================================

    def test_discount_applied_for_near_expiry_product(self):
        Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=5),
        )

        result = self.service.get_discounted_price(self.product.product_id)
        self.print_json("test_discount_applied_for_near_expiry_product", result)

        self.assertEqual(result["final_price"], Decimal("9600.00"))

    def test_no_discount_for_normal_product(self):
        Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=30),
        )

        result = self.service.get_discounted_price(self.product.product_id)
        self.print_json("test_no_discount_for_normal_product", result)

        self.assertEqual(result["final_price"], Decimal("12000.00"))

    def test_expired_product(self):
        Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() - timedelta(days=1),
        )

        with self.assertRaises(ValueError):
            self.service.get_discounted_price(self.product.product_id)

    # =====================================================
    # ADD ITEM
    # =====================================================

    def test_add_item(self):
        Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=5),
        )

        order = self.service.create_order(
            self.store.store_id,
            self.staff.staff_id,
        )

        detail = self.service.add_item(
            order.order_id,
            self.product.product_id,
            2,
        )

        self.print_json(
            "test_add_item",
            {
                "order_id": order.order_id,
                "product_id": self.product.product_id,
                "quantity": detail.quantity,
                "unit_price": str(detail.unit_price),
                "sub_total": str(detail.sub_total),
            },
        )

        self.assertEqual(detail.quantity, 2)
        self.assertEqual(detail.unit_price, Decimal("9600.00"))
        self.assertEqual(detail.sub_total, Decimal("19200.00"))

    # =====================================================
    # REMOVE ITEM
    # =====================================================

    def test_remove_item(self):
        Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=5),
        )

        order = self.service.create_order(
            self.store.store_id,
            self.staff.staff_id,
        )

        self.service.add_item(
            order.order_id,
            self.product.product_id,
            3,
        )

        self.service.remove_item(
            order.order_id,
            self.product.product_id,
            1,
        )

        detail = OrderDetail.objects.get(
            order=order,
            product=self.product,
        )

        self.print_json(
            "test_remove_item",
            {
                "order_id": order.order_id,
                "product_id": self.product.product_id,
                "remaining_quantity": detail.quantity,
            },
        )

        self.assertEqual(detail.quantity, 2)

    # =====================================================
    # CHECKOUT (POS-2)
    # =====================================================

    def test_checkout_success_with_stock_deduction(self):
        """Test checkout API moves order to Processing without deducting stock yet.
        Stock deduction happens when payment webhook confirms (Webhook Paid)."""
        from core.models import StoreInventory
         
        # Create batch with inventory
        batch = Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=10),
        )
         
        # Stock: batch=10
        StoreInventory.objects.create(store=self.store, batch=batch, quantity=10)
         
        # Create order and add 7 items
        order = self.service.create_order(self.store.store_id, self.staff.staff_id)
        self.service.add_item(order.order_id, self.product.product_id, 7)
         
        # Checkout should NOT deduct stock yet
        checked_out_order = self.service.checkout(order.order_id, "Cash")
         
        # Verify stock is NOT deducted during checkout
        batch_inv = StoreInventory.objects.get(store=self.store, batch=batch)
         
        self.print_json(
            "test_checkout_success_with_stock_deduction",
            {
                "order_id": checked_out_order.order_id,
                "status": checked_out_order.status,
                "payment_method": checked_out_order.payment_method,
                "stock_still_reserved": batch_inv.quantity,
            },
        )
         
        self.assertEqual(checked_out_order.status, "Processing")
        self.assertEqual(checked_out_order.payment_method, "Cash")
        self.assertEqual(batch_inv.quantity, 10)  # Stock NOT deducted yet

    def test_checkout_no_items_fails(self):
        """Test checkout fails when order has no items"""
         
        order = self.service.create_order(self.store.store_id, self.staff.staff_id)
         
        with self.assertRaises(ValueError):
            self.service.checkout(order.order_id, "Cash")
         
        self.print_json(
            "test_checkout_no_items_fails",
            {"error": "ValueError raised when order has no items"},
        )

    # =====================================================
    # BANK QR WEBHOOK (POS-3)
    # =====================================================

    def test_bank_qr_webhook_payment_deducts_stock(self):
        """Test Bank QR webhook deducts stock on payment confirmation"""
        from core.models import StoreInventory
        import hmac
        import hashlib
        import os
         
        batch = Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=5),
        )
        StoreInventory.objects.create(store=self.store, batch=batch, quantity=10)
         
        order = self.service.create_order(self.store.store_id, self.staff.staff_id)
        self.service.add_item(order.order_id, self.product.product_id, 3)
         
        # Create Bank QR webhook payload with signature
        webhook_secret = os.getenv("BANK_QR_WEBHOOK_SECRET", "dev-bank-qr-secret")
        payload = {
            "order_id": order.order_id,
            "external_order_id": "BANK_TXN_123456",
            "status": "paid",
            "payment_method": "Bank QR",
            "amount": Decimal("21120.00"),
        }
         
        data_to_sign = f"{payload['order_id']}{payload['external_order_id']}{payload['status']}{payload['amount']}"
        signature = hmac.new(
            webhook_secret.encode(),
            data_to_sign.encode(),
            hashlib.sha256
        ).hexdigest()
        payload["signature"] = signature
         
        # Process webhook
        updated_order = self.service.handle_payment_webhook(payload)
         
        # Verify stock was deducted and order is Paid
        batch_inv = StoreInventory.objects.get(store=self.store, batch=batch)
         
        self.print_json(
            "test_bank_qr_webhook_payment_deducts_stock",
            {
                "order_id": updated_order.order_id,
                "status": updated_order.status,
                "payment_method": updated_order.payment_method,
                "external_order_id": updated_order.external_order_id,
                "stock_remaining": batch_inv.quantity,
            },
        )
         
        self.assertEqual(updated_order.status, "Paid")
        self.assertEqual(batch_inv.quantity, 7)  # 10 - 3

    def test_bank_qr_webhook_idempotency(self):
        """Test Bank QR webhook doesn't deduct stock twice (idempotency)"""
        from core.models import StoreInventory
        import hmac
        import hashlib
        import os
         
        batch = Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=5),
        )
        StoreInventory.objects.create(store=self.store, batch=batch, quantity=10)
         
        order = self.service.create_order(self.store.store_id, self.staff.staff_id)
        self.service.add_item(order.order_id, self.product.product_id, 3)
         
        # Create webhook payload
        webhook_secret = os.getenv("BANK_QR_WEBHOOK_SECRET", "dev-bank-qr-secret")
        payload = {
            "order_id": order.order_id,
            "external_order_id": "BANK_TXN_789",
            "status": "paid",
            "payment_method": "Bank QR",
            "amount": Decimal("21120.00"),
        }
         
        data_to_sign = f"{payload['order_id']}{payload['external_order_id']}{payload['status']}{payload['amount']}"
        signature = hmac.new(
            webhook_secret.encode(),
            data_to_sign.encode(),
            hashlib.sha256
        ).hexdigest()
        payload["signature"] = signature
         
        # Process webhook twice (same external_order_id)
        self.service.handle_payment_webhook(payload)
        updated_order = self.service.handle_payment_webhook(payload)
         
        batch_inv = StoreInventory.objects.get(store=self.store, batch=batch)
         
        self.print_json(
            "test_bank_qr_webhook_idempotency",
            {
                "order_id": updated_order.order_id,
                "status": updated_order.status,
                "stock_remaining": batch_inv.quantity,
                "note": "Should still be 7 (not 4), proving idempotency works",
            },
        )
         
        self.assertEqual(updated_order.status, "Paid")
        self.assertEqual(batch_inv.quantity, 7)  # Should be 7, not 4

    # =====================================================
    # NEAR-EXPIRY DISCOUNT (POS-4)
    # =====================================================

    def test_discount_logic_comprehensive(self):
        """Test comprehensive near-expiry discount logic"""
        # Test 1: Product expiring in 5 days (< 7 days threshold) = 20% discount
        batch1 = Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=5),
        )
        result1 = self.service.get_discounted_price(self.product.product_id)
         
        # Test 2: Product expiring in 10 days (> 7 days threshold) = no discount
        batch1.delete()
        batch2 = Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=10),
        )
        result2 = self.service.get_discounted_price(self.product.product_id)
         
        # Test 3: Product expiring exactly 7 days = 20% discount
        batch2.delete()
        batch3 = Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=7),
        )
        result3 = self.service.get_discounted_price(self.product.product_id)
         
        self.print_json(
            "test_discount_logic_comprehensive",
            {
                "case1_expiry_5_days": {
                    "original_price": str(result1["original_price"]),
                    "discount": str(result1["discount"]),
                    "final_price": str(result1["final_price"]),
                    "discount_percentage": "20%",
                },
                "case2_expiry_10_days": {
                    "original_price": str(result2["original_price"]),
                    "discount": str(result2["discount"]),
                    "final_price": str(result2["final_price"]),
                    "discount_percentage": "0%",
                },
                "case3_expiry_exactly_7_days": {
                    "original_price": str(result3["original_price"]),
                    "discount": str(result3["discount"]),
                    "final_price": str(result3["final_price"]),
                    "discount_percentage": "20%",
                },
            },
        )
         
        # Assertions
        self.assertEqual(result1["discount"], Decimal("2400.00"))  # 20% of 12000
        self.assertEqual(result1["final_price"], Decimal("9600.00"))
         
        self.assertEqual(result2["discount"], Decimal("0.00"))
        self.assertEqual(result2["final_price"], Decimal("12000.00"))
         
        self.assertEqual(result3["discount"], Decimal("2400.00"))
        self.assertEqual(result3["final_price"], Decimal("9600.00"))
        Batch.objects.create(
            product=self.product,
            manufacture_date=date.today() - timedelta(days=30),
            expiration_date=date.today() + timedelta(days=5),
        )

        order = self.service.create_order(
            self.store.store_id,
            self.staff.staff_id,
        )

        self.service.add_item(
            order.order_id,
            self.product.product_id,
            2,
        )

        order.refresh_from_db()

        self.print_json(
            "test_calculate_total",
            {
                "order_id": order.order_id,
                "total_amount": str(order.total_amount),
            },
        )

        self.assertEqual(order.total_amount, Decimal("21120.00"))