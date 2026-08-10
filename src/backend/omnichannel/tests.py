from decimal import Decimal

from rest_framework.test import APIClient, APITestCase

from core.models import Category, Order, OrderDetail, Product, Store


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