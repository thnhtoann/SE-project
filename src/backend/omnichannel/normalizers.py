"""
OMNI-2: Normalize incoming webhook payloads from GrabMart, ShopeeFood, and
BeMart into one common shape that `omnichannel.services.save_normalized_order`
can persist into ORDER/ORDER_DETAIL.

Goal: take a platform's raw payload and return a dict with the same keys no matter which platform it came from:
"""

from datetime import datetime
from decimal import Decimal, InvalidOperation

class PayloadValidationError(ValueError):
    """Raised when a webhook payload is missing a required field or has a
    value that can't be parsed into the normalized shape."""

# Pulls a key out of the payload dict, and raises an error immediately if it's missing or empty
def _require(payload: dict, key: str):
    if key not in payload or payload[key] in (None, ''):
        raise PayloadValidationError(f"Missing required field: {key}")
    return payload[key]

# Safely converts a price string/number into Python's Decimal type
def _parse_decimal(value, field_name: str) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise PayloadValidationError(f"Invalid decimal for {field_name}: {value!r}")

# Parses an ISO 8601 timestamp string
def _parse_datetime(value, field_name: str) -> datetime:
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except ValueError:
        raise PayloadValidationError(f"Invalid ISO 8601 datetime for {field_name}: {value!r}")

def normalize_grabmart(payload: dict) -> dict:
    """GrabMart payload shape (camelCase)."""
    raw_items = _require(payload, 'items')
    items = [
        {
            'barcode': str(_require(item, 'barcode')),
            'quantity': int(_require(item, 'qty')),
            'unit_price': _parse_decimal(_require(item, 'price'), 'items[].price'),
        }
        for item in raw_items
    ]
    return {
        'external_order_id': str(_require(payload, 'orderId')),
        'store_id': int(_require(payload, 'storeId')),
        'order_date': _parse_datetime(_require(payload, 'orderTime'), 'orderTime'),
        'payment_method': str(_require(payload, 'paymentMethod')),
        'items': items,
    }


def normalize_shopeefood(payload: dict) -> dict:
    """ShopeeFood payload shape (snake_case, nested order_items)."""
    raw_items = _require(payload, 'order_items')
    items = [
        {
            'barcode': str(_require(item, 'product_barcode')),
            'quantity': int(_require(item, 'quantity')),
            'unit_price': _parse_decimal(_require(item, 'unit_price'), 'order_items[].unit_price'),
        }
        for item in raw_items
    ]
    return {
        'external_order_id': str(_require(payload, 'order_id')),
        'store_id': int(_require(payload, 'store_id')),
        'order_date': _parse_datetime(_require(payload, 'created_at'), 'created_at'),
        'payment_method': str(_require(payload, 'payment_method')),
        'items': items,
    }


def normalize_bemart(payload: dict) -> dict:
    """BeMart payload shape (flat, short key names)."""
    raw_items = _require(payload, 'products')
    items = [
        {
            'barcode': str(_require(item, 'sku')),
            'quantity': int(_require(item, 'amount')),
            'unit_price': _parse_decimal(_require(item, 'price'), 'products[].price'),
        }
        for item in raw_items
    ]
    return {
        'external_order_id': str(_require(payload, 'id')),
        'store_id': int(_require(payload, 'branch_id')),
        'order_date': _parse_datetime(_require(payload, 'timestamp'), 'timestamp'),
        'payment_method': str(_require(payload, 'payment')),
        'items': items,
    }