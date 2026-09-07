import logging
import random
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.checkout import calculate_line_subtotal, create_pos_order
from core.inventory import InsufficientStockError
from core.models import Product
from core.permissions import IsCashier, IsChainManager, IsStoreManager
from core.serializers import OrderDetailSerializer, OrderSerializer

from . import payos_client
from .models import DiscountSetting, QrPaymentIntent
from .serializers import (
    AddItemSerializer,
    BankQRWebhookSerializer,
    CheckoutSerializer,
    CreateOrderSerializer,
    CreateQrPaymentSerializer,
    DiscountSettingSerializer,
    ProductPriceSerializer,
    RemoveItemSerializer,
)
from .services import OrderService

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    def get(self, request):
        return Response({
            "message": "POS module is running"
        })


class CreateOrderView(APIView):
    """
    POST /api/pos/orders/create/
    """
    permission_classes = [
        IsAuthenticated,
        IsCashier | IsStoreManager | IsChainManager,
        ]
    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = OrderService()

        order = service.create_order(
            serializer.validated_data["store_id"],
            serializer.validated_data["staff_id"],
        )

        return Response(
            {
                "message": "Order created successfully.",
                "order_id": order.order_id,
                "status": order.status,
            },
            status=status.HTTP_201_CREATED,
        )


class AddItemView(APIView):
    """
    POST /api/pos/orders/<order_id>/add-item/
    """
    permission_classes = [
        IsAuthenticated,
        IsCashier | IsStoreManager | IsChainManager,
        ]
    def post(self, request, order_id):
        serializer = AddItemSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = OrderService()

        try:
            detail = service.add_item(
            order_id=order_id,
            product_id=serializer.validated_data["product_id"],
            quantity=serializer.validated_data["quantity"],
        )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "message": "Item added successfully.",
                "product_id": detail.product.product_id,
                "quantity": detail.quantity,
            },
            status=status.HTTP_200_OK,
        )


class RemoveItemView(APIView):
    """
    POST /api/pos/orders/<order_id>/remove-item/
    """
    permission_classes = [
        IsAuthenticated,
        IsCashier | IsStoreManager | IsChainManager,
        ]
    def post(self, request, order_id):
        serializer = RemoveItemSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = OrderService()

        service.remove_item(
            order_id=order_id,
            product_id=serializer.validated_data["product_id"],
            quantity=serializer.validated_data["quantity"],
        )

        return Response(
            {
                "message": "Item removed successfully."
            },
            status=status.HTTP_200_OK,
        )


class CheckoutView(APIView):
    """
    POST /api/pos/orders/<order_id>/checkout/
    Perform checkout for an order with real-time stock deduction.
    """
    permission_classes = [
        IsAuthenticated,
        IsCashier | IsStoreManager | IsChainManager,
        ]
    def post(self, request, order_id):
        serializer = CheckoutSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service = OrderService()

            order = service.checkout(
                order_id=order_id,
                payment_method=serializer.validated_data["payment_method"],
            )

            return Response(
                {
                    "message": "Order checked out successfully.",
                    "order_id": order.order_id,
                    "status": order.status,
                    "payment_method": order.payment_method,
                },
                status=status.HTTP_200_OK,
            )
        except InsufficientStockError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": "Checkout failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GetOrderView(APIView):
    """
    GET /api/pos/orders/<order_id>/
    """
    permission_classes = [
        IsAuthenticated,
        IsCashier | IsStoreManager | IsChainManager,
        ]
    def get(self, request, order_id):

        service = OrderService()

        order = service.get_order(order_id)

        return Response(
            order,
            status=status.HTTP_200_OK,
        )

class ProductPriceView(APIView):
    """
    GET /api/pos/products/<product_id>/price/
    Retrieve product price with near-expiry discount if applicable.
    """
    permission_classes = [
        IsAuthenticated,
        IsCashier | IsStoreManager | IsChainManager,
        ]
    def get(self, request, product_id):
        try:
            service = OrderService()
            data = service.get_discounted_price(product_id)
            serializer = ProductPriceSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": "Failed to retrieve product price."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(csrf_exempt, name="dispatch")
class PaymentWebhookView(APIView):
    """
    POST /api/pos/webhooks/payment/
    Handle payment webhooks from Bank QR and other payment providers.
    On payment confirmation, deduct stock in real-time (FEFO).
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = BankQRWebhookSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service = OrderService()
            order = service.handle_payment_webhook(serializer.validated_data)

            return Response(
                {
                    "message": "Payment webhook processed successfully.",
                    "order_id": order.order_id,
                    "status": order.status,
                },
                status=status.HTTP_200_OK,
            )
        except InsufficientStockError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": "Failed to process webhook."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SalesAnalyticsView(APIView):
    """
    GET /api/pos/analytics/sales/
    """

    def get(self, request):
        service = OrderService()
        analytics = service.get_sales_analytics()

        return Response(analytics, status=status.HTTP_200_OK)


class DiscountSettingView(APIView):
    """
    GET/PUT /api/pos/discount-settings/
    """

    permission_classes = [
        IsAuthenticated,
        IsStoreManager | IsChainManager,
    ]

    def get(self, request):
        setting, _ = DiscountSetting.objects.get_or_create(
            pk=1,
        )

        serializer = DiscountSettingSerializer(setting)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        serializer = DiscountSettingSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        setting, _ = DiscountSetting.objects.get_or_create(
            pk=1,
        )

        setting.near_expiry_days = serializer.validated_data[
            "near_expiry_days"
        ]

        setting.near_expiry_discount = serializer.validated_data[
            "near_expiry_discount"
        ]

        setting.save()

        return Response(
            {
                "message": "Discount setting updated successfully.",
                "near_expiry_days": setting.near_expiry_days,
                "near_expiry_discount": setting.near_expiry_discount,
            },
            status=status.HTTP_200_OK,
        )


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
        subtotal = sum(
            calculate_line_subtotal(item['unit_price'], item['quantity'], item.get('discount_type'), item.get('discount_value'))
            for item in items
        )
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
            {
                "product": item['product'].product_id,
                "quantity": item['quantity'],
                "unit_price": str(item['unit_price']),
                "discount_type": item.get('discount_type'),
                "discount_value": str(item.get('discount_value') or Decimal('0')),
            }
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
                # .get() with defaults: intents created before per-item
                # discounts existed have snapshots without these keys.
                'discount_type': entry.get('discount_type'),
                'discount_value': Decimal(entry.get('discount_value') or '0'),
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
                # create_pos_order already sent the payment-success notification.
        except InsufficientStockError as e:
            # Money has already moved on PayOS's side at this point -- this is
            # a real fulfillment problem, not something to silently retry.
            # Left STATUS_PENDING (not PAID) so it's visible for manual
            # reconciliation in the admin; no automatic refund is issued
            # (would need a PayOS refund API call, out of scope here).
            logger.error("PayOS payment %s confirmed but stock is insufficient: %s", order_code, e)
            return Response({"message": "insufficient stock, needs manual reconciliation"}, status=status.HTTP_200_OK)

        return Response({"message": "ok"}, status=status.HTTP_200_OK)
