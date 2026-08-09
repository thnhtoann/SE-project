"""
OMNI-2: Persist a normalized omnichannel order into ORDER/ORDER_DETAIL.

Goal: take the normalized dict and actually write it to the database as Order + OrderDetail rows.
"""

import logging

from django.db import transaction

from core.models import Order, OrderDetail, Product, Store

logger = logging.getLogger(__name__)

class OrderSaveError(ValueError):
    """Raised when a normalized order references a store/product that
    doesn't exist, or otherwise can't be saved."""

def save_normalized_order(platform_name: str, normalized: dict) -> Order:
    """
    Create an Order + OrderDetail rows from a normalized payload (see
    `omnichannel.normalizers`). Idempotent per (platform, external order
    id): a duplicate webhook delivery for the same order returns the
    existing Order instead of creating a second one.
    """
    # Idempotency check
    external_order_id = normalized['external_order_id']

    existing = Order.objects.filter(
        order_type=platform_name,
        external_order_id=external_order_id,
    ).first()
    if existing is not None:
        logger.info(
            "Duplicate webhook ignored (%s): external_order_id=%s -> order_id=%s",
            platform_name, external_order_id, existing.order_id,
        )
        return existing

    # The payload only has a store_id number. If the store doesn't exist, it raises OrderSaveError (→ 400 response).
    try:
        store = Store.objects.get(pk=normalized['store_id'])
    except Store.DoesNotExist:
        raise OrderSaveError(f"Unknown store_id: {normalized['store_id']}")

    # Create the Order row (status 'Pending', total starts at 0), then loop through each item — look up the Product 
    # by barcode, create an OrderDetail row, and accumulate the running total. After the loop, 
    # save the final total_amount onto the order.
    with transaction.atomic():
        order = Order.objects.create(
            store=store,
            staff=None,  # external orders have no cashier
            order_date=normalized['order_date'],
            order_type=platform_name,
            payment_method=normalized['payment_method'],
            total_amount=0,
            status='Pending',
            external_order_id=external_order_id,
        )

        total = 0
        for item in normalized['items']:
            try:
                product = Product.objects.get(barcode=item['barcode'])
            except Product.DoesNotExist:
                raise OrderSaveError(f"Unknown product barcode: {item['barcode']}")

            sub_total = item['quantity'] * item['unit_price']
            OrderDetail.objects.create(
                order=order,
                product=product,
                quantity=item['quantity'],
                unit_price=item['unit_price'],
                sub_total=sub_total,
            )
            total += sub_total

        order.total_amount = total
        order.save(update_fields=['total_amount'])

    logger.info(
        "Order normalized and saved (%s): order_id=%s, external_order_id=%s, items=%d",
        platform_name, order.order_id, external_order_id, len(normalized['items']),
    )
    return order