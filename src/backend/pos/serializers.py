from rest_framework import serializers


class CreateOrderSerializer(serializers.Serializer):
    """
    Request:
    {
        "store_id": 1,
        "staff_id": 2
    }
    """

    store_id = serializers.IntegerField(min_value=1)
    staff_id = serializers.IntegerField(min_value=1)


class AddItemSerializer(serializers.Serializer):
    """
    Request:
    {
        "product_id": 10,
        "quantity": 2
    }
    """

    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than 0."
            )
        return value


class RemoveItemSerializer(serializers.Serializer):
    """
    Request:
    {
        "product_id": 10,
        "quantity": 1
    }
    """

    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than 0."
            )
        return value

class ProductPriceSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()

    original_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    discount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    final_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    days_left = serializers.IntegerField()


class CheckoutSerializer(serializers.Serializer):
    """
    Request:
    {
        "payment_method": "Cash" or "Bank QR" or "Card"
    }
    """

    payment_method = serializers.CharField(max_length=50)

    def validate_payment_method(self, value):
        valid_methods = ["Cash", "Bank QR", "Card", "Online Banking"]
        if value not in valid_methods:
            raise serializers.ValidationError(
                f"Payment method must be one of: {', '.join(valid_methods)}"
            )
        return value


class BankQRWebhookSerializer(serializers.Serializer):
    """
    Bank QR Payment Webhook Request:
    {
        "order_id": 1,
        "external_order_id": "BANK_TXN_123456",
        "status": "paid" or "pending" or "failed",
        "payment_method": "Bank QR",
        "amount": 1000.00,
        "signature": "hmac_signature_here"
    }
    """

    order_id = serializers.IntegerField(min_value=1)
    external_order_id = serializers.CharField(max_length=100)
    status = serializers.CharField(max_length=50)
    payment_method = serializers.CharField(max_length=50, default="Bank QR")
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    signature = serializers.CharField(max_length=256)

    def validate_status(self, value):
        valid_statuses = ["paid", "pending", "failed", "success", "completed", "cancelled", "expired"]
        if value.lower() not in valid_statuses:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(valid_statuses)}"
            )
        return value.lower()



class DiscountSettingSerializer(serializers.Serializer):
    near_expiry_days = serializers.IntegerField(min_value=0)
    near_expiry_discount = serializers.DecimalField(
        max_digits=5,
        decimal_places=4,
        min_value=0,
        max_value=1,
    )