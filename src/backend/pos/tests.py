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
    # TOTAL
    # =====================================================

    def test_calculate_total(self):
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