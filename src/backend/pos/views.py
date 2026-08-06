from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    CreateOrderSerializer,
    AddItemSerializer,
    RemoveItemSerializer,
)
from .services import OrderService


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