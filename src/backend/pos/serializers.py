from rest_framework import serializers

from core.models import Shift, Store
from core.serializers import PosCheckoutItemSerializer


class CreateQrPaymentSerializer(serializers.Serializer):
    store = serializers.PrimaryKeyRelatedField(queryset=Store.objects.all())
    shift = serializers.PrimaryKeyRelatedField(queryset=Shift.objects.all())
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100, default=0,
    )
    items = PosCheckoutItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value
