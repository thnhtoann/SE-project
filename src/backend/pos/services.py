from decimal import Decimal
from datetime import date
from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import TruncDate, TruncHour, TruncMonth
from django.utils import timezone

from core.models import Order, OrderDetail, Product, Store, Staff, Batch
from pos.constants import (
    NEAR_EXPIRY_DAYS,
    NEAR_EXPIRY_DISCOUNT,
)

class OrderService:
    TAX_RATE = Decimal("0.10")

    @transaction.atomic
    def create_order(self, store_id, staff_id):
        """Create a new order with Pending status."""

        store = Store.objects.get(store_id=store_id)
        staff = Staff.objects.get(staff_id=staff_id)

        order = Order.objects.create(
            store=store,
            staff=staff,
            order_date=timezone.now(),
            order_type="POS",
            payment_method="",
            total_amount=Decimal("0.00"),
            status="Pending",
        )

        return order

    @transaction.atomic
    def add_item(self, order_id, product_id, quantity):
        """Add product to current order."""

        if quantity <= 0:
            raise ValueError("Quantity must be greater than zero.")

        order = Order.objects.get(order_id=order_id)
        product = Product.objects.get(product_id=product_id)

        # Lấy giá sau khi áp dụng giảm giá (nếu có)
        price_info = self.get_discounted_price(product_id)
        unit_price = price_info["final_price"]

        detail, created = OrderDetail.objects.get_or_create(
            order=order,
            product=product,
            defaults={
                "quantity": quantity,
                "unit_price": unit_price,
                "sub_total": unit_price * quantity,
            },
        )

        if not created:
            detail.quantity += quantity
            detail.sub_total = detail.quantity * detail.unit_price
            detail.save()

        self.calculate_total(order_id)

        return detail

    @transaction.atomic
    def remove_item(self, order_id, product_id, quantity):
        """
        Remove quantity of a product.
        Delete the row if quantity becomes 0.
        """

        if quantity <= 0:
            raise ValueError("Quantity must be greater than zero.")

        order = Order.objects.get(order_id=order_id)
        product = Product.objects.get(product_id=product_id)

        detail = OrderDetail.objects.get(
            order=order,
            product=product,
        )

        if quantity > detail.quantity:
            raise ValueError("Cannot remove more than existing quantity.")

        if quantity == detail.quantity:
            detail.delete()
        else:
            detail.quantity -= quantity
            detail.sub_total = detail.quantity * detail.unit_price
            detail.save()

        self.calculate_total(order_id)

        return True

    def calculate_subtotal(self, order_id):
        """Calculate subtotal."""

        order = Order.objects.get(order_id=order_id)

        subtotal = Decimal("0.00")

        details = OrderDetail.objects.filter(order=order)

        for item in details:
            subtotal += item.sub_total

        return subtotal

    def calculate_tax(self, subtotal):
        """Calculate tax."""

        return subtotal * self.TAX_RATE

    @transaction.atomic
    def calculate_total(self, order_id):
        """Update total amount."""

        order = Order.objects.get(order_id=order_id)

        subtotal = self.calculate_subtotal(order_id)
        tax = self.calculate_tax(subtotal)
        total = subtotal + tax

        order.total_amount = total
        order.save(update_fields=["total_amount"])

        return {
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
        }
    
    def get_order(self, order_id):
        """
        Get current order with all items and total information.
        """

        order = Order.objects.get(order_id=order_id)

        details = OrderDetail.objects.filter(order=order)

        items = []

        for detail in details:
            items.append({
                "product_id": detail.product.product_id,
                "product_name": detail.product.product_name,
                "quantity": detail.quantity,
                "unit_price": detail.unit_price,
                "sub_total": detail.sub_total,
            })

        subtotal = self.calculate_subtotal(order_id)
        tax = self.calculate_tax(subtotal)
        total = subtotal + tax

        return {
            "order_id": order.order_id,
            "status": order.status,
            "items": items,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
        }

    def get_discounted_price(self, product_id):
        """
        Calculate selling price after applying near-expiry discount.
        """

        product = Product.objects.get(product_id=product_id)

        today = date.today()

        batch = (
            Batch.objects
            .filter(product=product)
            .order_by("expiration_date")
            .first()
        )

        if batch is None:
            raise ValueError("Product has no batch.")

        if batch.expiration_date < today:
            raise ValueError("Product has expired.")

        days_left = (batch.expiration_date - today).days

        original_price = product.base_price

        discount = Decimal("0.00")

        if days_left <= NEAR_EXPIRY_DAYS:
            discount = original_price * NEAR_EXPIRY_DISCOUNT

        final_price = original_price - discount

        return {
            "product_id": product.product_id,
            "product_name": product.product_name,
            "original_price": original_price,
            "discount": discount,
            "final_price": final_price,
            "days_left": days_left,
        }

    @transaction.atomic
    def handle_payment_webhook(self, payload):
        """
        Update order status from a payment provider webhook payload.
        """

        order_id = payload.get("order_id")
        status = payload.get("status", "")
        payment_method = payload.get("payment_method", "")

        order = Order.objects.get(order_id=order_id)

        if status.lower() in {"paid", "success", "completed"}:
            order.status = "Paid"
        elif status.lower() in {"failed", "cancelled", "expired"}:
            order.status = "Failed"
        else:
            order.status = "Pending"

        order.payment_method = payment_method
        order.save(update_fields=["status", "payment_method"])

        return order

    def get_sales_analytics(self):
        """
        Return grouped sales insights for best/worst sellers and revenue trends.
        """

        paid_orders = Order.objects.filter(status="Paid")
        details = OrderDetail.objects.filter(order__in=paid_orders).select_related("product")

        best_sellers = (
            details.values("product__product_id", "product__product_name")
            .annotate(total_quantity=Sum("quantity"))
            .order_by("-total_quantity")[:5]
        )

        worst_sellers = (
            details.values("product__product_id", "product__product_name")
            .annotate(total_quantity=Sum("quantity"))
            .order_by("total_quantity")[:5]
        )

        revenue_by_hour = (
            paid_orders.annotate(hour=TruncHour("order_date"))
            .values("hour")
            .annotate(total_revenue=Sum("total_amount"))
            .order_by("hour")
        )

        revenue_by_day = (
            paid_orders.annotate(day=TruncDate("order_date"))
            .values("day")
            .annotate(total_revenue=Sum("total_amount"))
            .order_by("day")
        )

        revenue_by_month = (
            paid_orders.annotate(month=TruncMonth("order_date"))
            .values("month")
            .annotate(total_revenue=Sum("total_amount"))
            .order_by("month")
        )

        sales_trend = revenue_by_day

        return {
            "best_sellers": list(best_sellers),
            "worst_sellers": list(worst_sellers),
            "revenue_by_hour": list(revenue_by_hour),
            "revenue_by_day": list(revenue_by_day),
            "revenue_by_month": list(revenue_by_month),
            "sales_trend": list(sales_trend),
        }

    @transaction.atomic
    def checkout(self, order_id, payment_method):
        """
        Perform checkout for an order.
        Validates order exists and has items. Moves order to Processing state.
        Stock deduction happens later when payment webhook confirms (Webhook Paid).
         
        Raises:
            ValueError: If order cannot be checked out
        """
 
        order = Order.objects.get(order_id=order_id)
 
        if order.status != "Pending":
            raise ValueError(f"Cannot checkout order with status: {order.status}")
 
        details = OrderDetail.objects.filter(order=order)
 
        if not details.exists():
            raise ValueError("Cannot checkout order with no items.")
 
        order.status = "Processing"
        order.payment_method = payment_method
        order.save(update_fields=["status", "payment_method"])
 
        return order