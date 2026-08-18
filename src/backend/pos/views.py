from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .serializers import (
    CreateOrderSerializer,
    AddItemSerializer,
    RemoveItemSerializer,
    CheckoutSerializer,
    BankQRWebhookSerializer,
)
from .services import OrderService
from .serializers import ProductPriceSerializer
from core.inventory import InsufficientStockError

class CreateOrderView(APIView):
    """
    POST /api/pos/orders/create/
    """

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

    def post(self, request, order_id):
        serializer = AddItemSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = OrderService()

        detail = service.add_item(
            order_id=order_id,
            product_id=serializer.validated_data["product_id"],
            quantity=serializer.validated_data["quantity"],
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