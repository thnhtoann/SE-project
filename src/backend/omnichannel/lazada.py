"""
Lazada Open Platform integration: OAuth connect + on-demand order pull for a
real (sandbox or production) seller account.

Deliberately NOT the spec-005 pattern (BaseWebhookView + shared-secret
signature) — that pattern is for *simulated* platform payloads pushed at us.
A real Lazada seller account is connected via OAuth and orders are pulled
via Lazada's REST API (`/orders/get`, `/order/items/get`), signed with the
vendored `omnichannel.lazop` SDK. This is a polling design, which is a
deliberate, explicit deviation from this project's "webhooks, not polling"
principle (see specs/005-marketplace-integration/plan.md) — kept isolated in
this module rather than folded into views.py so the two integration styles
don't get confused.

Field-name caveat: the exact JSON shape of Lazada's `/orders/get` and
`/order/items/get` responses below is written from the documented Open
Platform API contract, but hasn't been exercised against a live sandbox
response (no outbound network access from this dev environment to a real
authorized account). If a field is missing/renamed in your sandbox's actual
response, LazadaSyncOrdersView reports the raw error per order in its
`errors` list so it's a quick fix, not a silent failure.
"""
import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from urllib.parse import urlencode

from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Store
from core.permissions import IsChainManager, IsStoreManager
from .lazop import LazopClient, LazopRequest
from .models import LazadaCredential
from .services import OrderSaveError, save_normalized_order

logger = logging.getLogger(__name__)

# Lazada's date-range params are documented as "+07:00" (Vietnam) local time,
# not UTC -- used to format created_after/created_before below.
VN_TZ = dt_timezone(timedelta(hours=7))


def _auth_client():
    return LazopClient(settings.LAZADA_AUTH_URL, settings.LAZADA_APP_KEY, settings.LAZADA_APP_SECRET)


def _api_client():
    return LazopClient(settings.LAZADA_API_URL, settings.LAZADA_APP_KEY, settings.LAZADA_APP_SECRET)


def _parse_lazada_datetime(value: str) -> datetime:
    # Lazada's timestamps look like "2018-11-19 09:23:07 +0800".
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S %z")


class LazadaAuthorizeView(APIView):
    """ Bước 1: Trả về URL để Chain/Store Manager mở và đăng nhập tài khoản
    Lazada (sandbox hoặc thật), cấp quyền cho app này. """
    permission_classes = [IsChainManager]

    def get(self, request):
        store_id = request.query_params.get('store')
        if not store_id or not Store.objects.filter(pk=store_id).exists():
            return Response(
                {"error": "Vui lòng chọn cửa hàng (store) hợp lệ để gắn với tài khoản Lazada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not settings.LAZADA_APP_KEY:
            return Response(
                {"error": "Chưa cấu hình LAZADA_APP_KEY/LAZADA_APP_SECRET trên server."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        params = {
            'response_type': 'code',
            'force_auth': 'true',
            'client_id': settings.LAZADA_APP_KEY,
            'redirect_uri': settings.LAZADA_REDIRECT_URI,
            # Round-tripped by Lazada back to LazadaCallbackView so we know
            # which Store this authorization is for.
            'state': store_id,
        }
        return Response({"authorize_url": f"{settings.LAZADA_AUTHORIZE_PAGE_URL}?{urlencode(params)}"})


class LazadaCallbackView(APIView):
    """ Bước 2: Lazada redirect trình duyệt của seller về đây kèm ?code=...
    -> Đổi code lấy access/refresh token -> Lưu LazadaCredential. """
    permission_classes = []

    def get(self, request):
        code = request.query_params.get('code')
        store_id = request.query_params.get('state')

        if not code or not store_id:
            return redirect(f"{settings.FRONTEND_BASE_URL}/settings/store?lazada=error")

        try:
            store = Store.objects.get(pk=store_id)
        except Store.DoesNotExist:
            return redirect(f"{settings.FRONTEND_BASE_URL}/settings/store?lazada=error")

        req = LazopRequest('/auth/token/create')
        req.add_api_param('code', code)

        try:
            response = _auth_client().execute(req)
        except Exception:
            logger.exception("Lazada token exchange request failed")
            return redirect(f"{settings.FRONTEND_BASE_URL}/settings/store?lazada=error")

        body = response.body or {}
        if response.code and response.code != '0':
            logger.warning("Lazada token exchange rejected: %s", body)
            return redirect(f"{settings.FRONTEND_BASE_URL}/settings/store?lazada=error")

        now = timezone.now()
        LazadaCredential.objects.update_or_create(
            store=store,
            defaults={
                'account': body.get('account', ''),
                'access_token': body['access_token'],
                'refresh_token': body['refresh_token'],
                'access_token_expires_at': now + timedelta(seconds=int(body.get('expires_in', 3600))),
                'refresh_token_expires_at': now + timedelta(seconds=int(body.get('refresh_expires_in', 2592000))),
            },
        )

        return redirect(f"{settings.FRONTEND_BASE_URL}/settings/store?lazada=connected")


class LazadaManualConnectView(APIView):
    """ Kết nối thủ công bằng access token lấy trực tiếp từ App Console
    (Sandbox Test -> Test Case -> Get Token), bỏ qua luồng redirect OAuth
    qua trình duyệt -- hữu ích khi tài khoản test sandbox không có mật khẩu
    để đăng nhập Seller Center. """
    permission_classes = [IsChainManager]

    def post(self, request):
        store_id = request.data.get('store')
        access_token = request.data.get('access_token')

        if not store_id or not Store.objects.filter(pk=store_id).exists():
            return Response(
                {"error": "Vui lòng chọn cửa hàng (store) hợp lệ để gắn với tài khoản Lazada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not access_token:
            return Response({"error": "Thiếu access_token."}, status=status.HTTP_400_BAD_REQUEST)

        store = Store.objects.get(pk=store_id)
        now = timezone.now()
        LazadaCredential.objects.update_or_create(
            store=store,
            defaults={
                'account': request.data.get('account', ''),
                'access_token': access_token,
                'refresh_token': request.data.get('refresh_token', ''),
                'access_token_expires_at': now + timedelta(seconds=int(request.data.get('expires_in', 3600))),
                'refresh_token_expires_at': now + timedelta(seconds=int(request.data.get('refresh_expires_in', 2592000))),
            },
        )
        return Response({"status": "connected"})


class LazadaStatusView(APIView):
    """ Trạng thái kết nối hiện tại (cho UI hiển thị) """
    permission_classes = [IsChainManager | IsStoreManager]

    def get(self, request):
        credential = LazadaCredential.objects.select_related('store').first()
        if not credential:
            return Response({"connected": False})

        return Response({
            "connected": True,
            "store": credential.store.store_name,
            "store_id": credential.store_id,
            "account": credential.account,
            "last_synced_at": credential.last_synced_at,
            "refresh_token_expires_at": credential.refresh_token_expires_at,
        })


def _refresh_token_if_needed(credential: LazadaCredential) -> LazadaCredential:
    now = timezone.now()
    if credential.access_token_expires_at > now + timedelta(minutes=2):
        return credential

    if credential.refresh_token_expires_at <= now:
        raise ValueError("Refresh token đã hết hạn — vui lòng kết nối lại tài khoản Lazada.")

    req = LazopRequest('/auth/token/refresh')
    req.add_api_param('refresh_token', credential.refresh_token)
    response = _auth_client().execute(req)

    body = response.body or {}
    if response.code and response.code != '0':
        raise ValueError(f"Làm mới token Lazada thất bại: {response.message}")

    credential.access_token = body['access_token']
    credential.refresh_token = body['refresh_token']
    credential.access_token_expires_at = now + timedelta(seconds=int(body.get('expires_in', 3600)))
    credential.refresh_token_expires_at = now + timedelta(seconds=int(body.get('refresh_expires_in', 2592000)))
    credential.save(update_fields=['access_token', 'refresh_token', 'access_token_expires_at', 'refresh_token_expires_at'])
    return credential


def _fetch_order_items(access_token: str, order_id) -> list:
    req = LazopRequest('/order/items/get', http_method='GET')
    req.add_api_param('order_id', order_id)
    response = _api_client().execute(req, access_token)
    body = response.body or {}
    if response.code and response.code != '0':
        raise ValueError(f"{response.code}: {response.message}")
    return body.get('data') or []


def _normalize_lazada_order(order: dict, raw_items: list, store_id: int) -> dict:
    # Aggregate item rows by seller SKU — Lazada's per-order item list can
    # return either one row per line (with its own quantity) or one row per
    # unit, depending on API version; summing handles both.
    items_by_sku = {}
    for item in raw_items:
        sku = str(item.get('shop_sku') or item.get('sku') or item.get('SellerSku') or '')
        if not sku:
            raise OrderSaveError("Lazada order item missing shop_sku/sku")
        quantity = int(item.get('quantity') or 1)
        unit_price = item.get('item_price') or item.get('paid_price') or '0'
        entry = items_by_sku.setdefault(sku, {'barcode': sku, 'quantity': 0, 'unit_price': unit_price})
        entry['quantity'] += quantity

    return {
        'external_order_id': str(order['order_id']),
        'store_id': store_id,
        'order_date': _parse_lazada_datetime(order['created_at']),
        'payment_method': order.get('payment_method', 'Lazada'),
        'items': list(items_by_sku.values()),
    }


class LazadaSyncOrdersView(APIView):
    """ Kéo đơn hàng mới từ tài khoản Lazada đã kết nối -> lưu vào
    Order/OrderDetail (dùng chung logic trừ kho với các kênh webhook khác). """
    permission_classes = [IsChainManager | IsStoreManager]

    def post(self, request):
        credential = LazadaCredential.objects.select_related('store').first()
        if not credential:
            return Response(
                {"error": "Chưa kết nối tài khoản Lazada nào."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            credential = _refresh_token_if_needed(credential)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if 'days' in request.data:
            # Explicit lookback overrides incremental sync -- e.g. a manual
            # "resync the last N days" rather than "since last sync".
            created_after = now - timedelta(days=int(request.data['days']))
        else:
            created_after = credential.last_synced_at or (now - timedelta(days=30))

        req = LazopRequest('/orders/get', http_method='GET')
        req.add_api_param('created_after', created_after.astimezone(VN_TZ).strftime('%Y-%m-%dT%H:%M:%S+07:00'))
        req.add_api_param('created_before', now.astimezone(VN_TZ).strftime('%Y-%m-%dT%H:%M:%S+07:00'))
        req.add_api_param('sort_direction', 'DESC')
        req.add_api_param('offset', '0')
        req.add_api_param('limit', '100')

        try:
            response = _api_client().execute(req, credential.access_token)
        except Exception:
            logger.exception("Lazada /orders/get request failed")
            return Response({"error": "Không gọi được API Lazada /orders/get."}, status=status.HTTP_502_BAD_GATEWAY)

        body = response.body or {}
        if response.code and response.code != '0':
            return Response({"error": f"{response.code}: {response.message}"}, status=status.HTTP_502_BAD_GATEWAY)

        orders = (body.get('data') or {}).get('orders') or []

        synced, skipped, errors = [], [], []
        for order in orders:
            order_id = order.get('order_id')
            try:
                raw_items = _fetch_order_items(credential.access_token, order_id)
                normalized = _normalize_lazada_order(order, raw_items, credential.store_id)
                result_order = save_normalized_order('Lazada', normalized)
                synced.append(result_order.order_id)
            except OrderSaveError as exc:
                skipped.append({"order_id": order_id, "reason": str(exc)})
            except Exception as exc:  # keep going — one bad order shouldn't abort the batch
                logger.exception("Failed to sync Lazada order %s", order_id)
                errors.append({"order_id": order_id, "reason": str(exc)})

        credential.last_synced_at = timezone.now()
        credential.save(update_fields=['last_synced_at'])

        return Response({
            "fetched": len(orders),
            "synced": synced,
            "skipped": skipped,
            "errors": errors,
        })
