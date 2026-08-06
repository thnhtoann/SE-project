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