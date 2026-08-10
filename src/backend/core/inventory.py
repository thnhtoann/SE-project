"""
Shared real-time stock deduction (OMNI-3).
"""
from core.models import StoreInventory

class InsufficientStockError(Exception):
    """Raised when a store doesn't have enough quantity to fulfill a deduction request."""
    pass

def deduct_stock(store, product, quantity):
    """
    Deduct `quantity` units of `product` from `store`'s inventory, oldest-batch-first
    (FEFO). Must be called inside an existing transaction.atomic() block (the caller's
    order-creation transaction) so a failure rolls back the whole order, not just the
    inventory change.

    Locks the affected StoreInventory rows with select_for_update() so two concurrent
    deductions for the same product/store can't both read stale quantity and oversell.
    Raises InsufficientStockError instead of allowing quantity to go negative.
    """
    # Lock candidate rows, oldest expiration first, skipping empty ones
    inventory_rows = (
        StoreInventory.objects
        .select_for_update()
        .filter(store=store, batch__product=product, quantity__gt=0)
        .order_by('batch__expiration_date')
    )

    remaining = quantity
    rows_to_update = []
    for row in inventory_rows:
        if remaining <= 0:
            break
        take = min(row.quantity, remaining)
        row.quantity -= take
        remaining -= take
        rows_to_update.append(row)

    if remaining > 0:
        # Not enough stock across all batches — abort, caller's transaction rolls back
        raise InsufficientStockError(
            f"Insufficient stock for product_id={product.product_id} at "
            f"store_id={store.store_id}: short by {remaining}"
        )

    for row in rows_to_update:
        row.save(update_fields=['quantity'])