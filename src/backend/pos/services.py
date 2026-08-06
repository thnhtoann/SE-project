from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from core.models import Order, OrderDetail, Product, Store, Staff


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

        detail, created = OrderDetail.objects.get_or_create(
            order=order,
            product=product,
            defaults={
                "quantity": quantity,
                "unit_price": product.base_price,
                "sub_total": product.base_price * quantity,
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