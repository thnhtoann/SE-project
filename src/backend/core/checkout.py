"""
Atomic POS checkout (Constitution Principle III): payment confirmation,
inventory deduction, and order/order-detail creation must happen as one
all-or-nothing unit, mirroring omnichannel/services.py::save_normalized_order.
"""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .inventory import deduct_stock
from .models import Order, OrderDetail, Shift


def calculate_line_subtotal(unit_price, quantity, discount_type=None, discount_value=None):
    """ Line total after the cashier's per-item discount (see
    PosCheckoutItemSerializer) -- shared by create_pos_order (what actually
    gets billed) and pos/views.py's PayOS amount estimate, so the QR amount
    the customer scans always matches what create_pos_order will later
    charge for the same cart. Never goes negative. """
    line_total = unit_price * quantity
    discount_value = discount_value or Decimal('0')
    if discount_type == OrderDetail.DISCOUNT_PERCENT:
        line_discount = line_total * discount_value / Decimal('100')
    elif discount_type == OrderDetail.DISCOUNT_AMOUNT:
        line_discount = discount_value
    else:
        line_discount = Decimal('0')
    return (line_total - min(line_discount, line_total)).quantize(Decimal('0.01'))


def create_pos_order(*, store, shift, payment_method, items, staff,
                      discount_percent=0, external_order_id=None):
    """
    Create a completed POS Order + its OrderDetails and deduct stock for
    each item, all inside a single transaction. Raises ValidationError if
    the shift isn't open for this store, or InsufficientStockError (from
    core.inventory) if any item can't be fulfilled — either way nothing is
    left committed.
    """
    if shift.status != Shift.STATUS_OPEN:
        raise ValidationError({"shift": ["Shift is not open."]})
    if shift.store_id != store.store_id:
        raise ValidationError({"shift": ["Shift does not belong to the given store."]})

    with transaction.atomic():
        order = Order.objects.create(
            store=store,
            staff=staff,
            shift=shift,
            order_date=timezone.now(),
            order_type='POS',
            payment_method=payment_method,
            total_amount=Decimal('0'),
            status='Completed',
            external_order_id=external_order_id or None,
        )

        subtotal = Decimal('0')
        for item in items:
            product = item['product']
            quantity = item['quantity']
            unit_price = item['unit_price']
            discount_type = item.get('discount_type')
            discount_value = item.get('discount_value') or Decimal('0')
            sub_total = calculate_line_subtotal(unit_price, quantity, discount_type, discount_value)

            OrderDetail.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                discount_type=discount_type,
                discount_value=discount_value,
                sub_total=sub_total,
            )
            deduct_stock(store, product, quantity)
            subtotal += sub_total

        order.total_amount = (subtotal * (Decimal('1') - Decimal(discount_percent) / Decimal('100'))).quantize(Decimal('0.01'))
        order.save(update_fields=['total_amount'])

    return order
