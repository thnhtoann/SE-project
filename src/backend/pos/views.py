import logging
import random
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.checkout import create_pos_order
from core.inventory import InsufficientStockError
from core.models import Product
from core.permissions import IsCashier, IsChainManager, IsStoreManager
from core.serializers import OrderDetailSerializer, OrderSerializer

from . import payos_client
from .models import QrPaymentIntent
from .serializers import CreateQrPaymentSerializer

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    def get(self, request):
        return Response({
            "message": "POS module is running"
        })


def _generate_order_code() -> int:
    for _ in range(5):
        code = random.randint(1, 2_000_000_000)
        if not QrPaymentIntent.objects.filter(order_code=code).exists():
            return code
    raise RuntimeError("Could not generate a unique PayOS order code")


class CreateQrPaymentView(APIView):
    """ Bắt đầu một lượt thanh toán VietQR (PayOS) cho giỏ hàng POS hiện tại.
    KHÔNG tạo Order hay trừ kho ở bước này -- một mã QR bị bỏ dở (khách
    không quét) sẽ không giữ hàng tồn kho. Order thật chỉ được tạo trong
    PayOSWebhookView khi PayOS xác nhận đã thanh toán. """
    permission_classes = [IsCashier | IsStoreManager | IsChainManager]

    def post(self, request):
        serializer = CreateQrPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        items = data['items']
        discount_percent = data['discount_percent']
        subtotal = sum(item['unit_price'] * item['quantity'] for item in items)
        amount = int((subtotal * (Decimal('1') - discount_percent / Decimal('100'))).to_integral_value())
        if amount <= 0:
            return Response({"detail": "Order amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        order_code = _generate_order_code()

        try:
            payos_data = payos_client.create_payment_link(
                order_code=order_code,
                amount=amount,
                description=f"Don hang {order_code}",
                return_url=f"{settings.FRONTEND_BASE_URL}/apps/pos",
                cancel_url=f"{settings.FRONTEND_BASE_URL}/apps/pos",
            )
        except payos_client.PayOSError as e:
            return Response({"detail": str(e), "error_code": "payos_unavailable"}, status=status.HTTP_502_BAD_GATEWAY)

        cart_snapshot = [
            {"product": item['product'].product_id, "quantity": item['quantity'], "unit_price": str(item['unit_price'])}
            for item in items
        ]

        intent = QrPaymentIntent.objects.create(
            order_code=order_code,
            store=data['store'],
            shift=data['shift'],
            staff=request.user,
            discount_percent=discount_percent,
            cart_snapshot=cart_snapshot,
            amount=amount,
            checkout_url=payos_data.get('checkoutUrl', ''),
            qr_code=payos_data.get('qrCode', ''),
            payos_payment_link_id=payos_data.get('paymentLinkId', ''),
        )

        return Response({
            'order_code': intent.order_code,
            'checkout_url': intent.checkout_url,
            'qr_code': intent.qr_code,
            'amount': intent.amount,
            'status': intent.status,
        }, status=status.HTTP_201_CREATED)


class QrPaymentStatusView(APIView):
    """ GET để cashier poll trạng thái trong lúc chờ khách quét mã. POST để
    hủy một lượt còn đang chờ (chỉ hủy bản ghi nội bộ -- link PayOS tự hết
    hạn phía họ, không có lệnh hủy link ở đây). """
    permission_classes = [IsCashier | IsStoreManager | IsChainManager]

    def _get_intent(self, order_code):
        return QrPaymentIntent.objects.filter(order_code=order_code).first()

    def get(self, request, order_code):
        intent = self._get_intent(order_code)
        if not intent:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        response_data = {'order_code': intent.order_code, 'status': intent.status, 'order': None}
        if intent.status == QrPaymentIntent.STATUS_PAID and intent.order:
            order_data = OrderSerializer(intent.order).data
            order_data['details'] = OrderDetailSerializer(intent.order.orderdetail_set.all(), many=True).data
            response_data['order'] = order_data
        return Response(response_data)

    def post(self, request, order_code):
        intent = self._get_intent(order_code)
        if not intent:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if intent.status == QrPaymentIntent.STATUS_PENDING:
            intent.status = QrPaymentIntent.STATUS_CANCELLED
            intent.save(update_fields=['status'])
        return Response({'order_code': intent.order_code, 'status': intent.status})


class PayOSWebhookView(APIView):
    """ PayOS gọi endpoint này khi trạng thái một link thanh toán thay đổi
    (và một lần với payload mẫu khi bạn đăng ký URL này qua "Confirm
    Webhook" trên PayOS) -- luôn xác thực chữ ký HMAC trước khi tin payload. """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        payload = request.data
        if not isinstance(payload, dict) or not payos_client.verify_webhook_signature(payload):
            logger.warning("PayOS webhook rejected: bad signature")
            return Response({"error": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)

        data = payload.get('data') or {}
        order_code = data.get('orderCode')
        intent = QrPaymentIntent.objects.filter(order_code=order_code).first()
        if not intent:
            # Either PayOS's webhook-registration test ping, or an order_code
            # we don't recognize -- nothing to reconcile, just acknowledge.
            return Response({"message": "ok"}, status=status.HTTP_200_OK)

        if intent.status != QrPaymentIntent.STATUS_PENDING:
            return Response({"message": "already processed"}, status=status.HTTP_200_OK)

        if not payload.get('success') or data.get('code') != '00':
            return Response({"message": "ignored (not a success event)"}, status=status.HTTP_200_OK)

        items = [
            {
                'product': Product.objects.get(pk=entry['product']),
                'quantity': entry['quantity'],
                'unit_price': Decimal(entry['unit_price']),
            }
            for entry in intent.cart_snapshot
        ]

        try:
            with transaction.atomic():
                order = create_pos_order(
                    store=intent.store,
                    shift=intent.shift,
                    payment_method='Bank QR',
                    items=items,
                    staff=intent.staff,
                    discount_percent=intent.discount_percent,
                    external_order_id=str(intent.order_code),
                )
                intent.order = order
                intent.status = QrPaymentIntent.STATUS_PAID
                intent.paid_at = timezone.now()
                intent.save(update_fields=['order', 'status', 'paid_at'])
        except InsufficientStockError as e:
            # Money has already moved on PayOS's side at this point -- this is
            # a real fulfillment problem, not something to silently retry.
            # Left STATUS_PENDING (not PAID) so it's visible for manual
            # reconciliation in the admin; no automatic refund is issued
            # (would need a PayOS refund API call, out of scope here).
            logger.error("PayOS payment %s confirmed but stock is insufficient: %s", order_code, e)
            return Response({"message": "insufficient stock, needs manual reconciliation"}, status=status.HTTP_200_OK)

        return Response({"message": "ok"}, status=status.HTTP_200_OK)
