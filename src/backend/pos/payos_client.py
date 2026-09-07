"""
Thin PayOS REST client (https://payos.vn) -- no official Python SDK exists
(PayOS ships Node/PHP/Java SDKs only), so this talks to the documented REST
API directly with `requests` + manual HMAC-SHA256 signing.

Field-shape caveat, same spirit as omnichannel/lazada.py: the request/response
shapes below are written from PayOS's published API docs but haven't been
exercised against a live merchant account in this environment. If a field is
missing/renamed against your real account, PayOSError.args will carry PayOS's
own `desc` message, which should make it a quick fix rather than a silent
failure.
"""
import hashlib
import hmac

import requests
from django.conf import settings


class PayOSError(Exception):
    pass


def _sign(data: dict) -> str:
    """PayOS's documented signing algorithm: HMAC-SHA256 (checksum key as
    secret) over `key=value` pairs joined with '&', keys sorted
    alphabetically -- used both for outgoing payment-link requests and for
    verifying incoming webhook payloads."""
    raw = "&".join(f"{key}={'' if data[key] is None else data[key]}" for key in sorted(data.keys()))
    return hmac.new(settings.PAYOS_CHECKSUM_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()


def create_payment_link(*, order_code: int, amount: int, description: str, return_url: str, cancel_url: str) -> dict:
    """ Returns PayOS's `data` object: {checkoutUrl, qrCode, paymentLinkId, ...}. """
    body = {
        "orderCode": order_code,
        "amount": amount,
        "description": description[:25],  # PayOS caps description at 25 chars
        "cancelUrl": cancel_url,
        "returnUrl": return_url,
    }
    body["signature"] = _sign(body)

    try:
        response = requests.post(
            f"{settings.PAYOS_API_URL}/v2/payment-requests",
            json=body,
            headers={"x-client-id": settings.PAYOS_CLIENT_ID, "x-api-key": settings.PAYOS_API_KEY},
            timeout=15,
        )
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise PayOSError(f"Could not reach PayOS: {exc}") from exc

    if response.status_code != 200 or payload.get("code") != "00":
        raise PayOSError(payload.get("desc", "PayOS payment link creation failed"))

    return payload["data"]


def verify_webhook_signature(payload: dict) -> bool:
    data = payload.get("data")
    signature = payload.get("signature")
    if not signature or not isinstance(data, dict):
        return False
    return hmac.compare_digest(_sign(data), signature)
