import re

from rest_framework import serializers

from .models import (
    Role, Store, Staff, Supplier, PurchaseOrder, PurchaseOrderDetail,
    Category, Product, Batch, StoreInventory, Order, OrderDetail, InventoryAlert
)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = '__all__'


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['supplier_id', 'supplier_name', 'contact_phone', 'email', 'address']
        extra_kwargs = {
            'supplier_name': {'required': True, 'allow_blank': False},
            'contact_phone': {'required': True, 'allow_blank': False},
            'email': {'required': False, 'allow_blank': True},
            'address': {'required': False, 'allow_blank': True},
        }

    def validate_email(self, value):
        if value in [None, '']:
            return value

        pattern = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'
        if not re.match(pattern, value):
            raise serializers.ValidationError('Email is not in a valid format.')
        return value


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderDetail
        fields = ['id', 'po', 'product', 'order_qty', 'unit_cost']
        extra_kwargs = {
            'po': {'read_only': True}
        }

    def validate_order_qty(self, value):
        if value <= 0:
            raise serializers.ValidationError("Số lượng đặt hàng (order_qty) phải lớn hơn 0.")
        return value

    def validate_unit_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Giá vốn (unit_cost) không được là số âm.")
        return value


class PurchaseOrderSerializer(serializers.ModelSerializer):
    details = PurchaseOrderDetailSerializer(many=True, required=False)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    supplier_name = serializers.CharField(source='supplier.supplier_name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'po_id', 'supplier', 'supplier_name', 'order_date',
            'expected_delivery_date', 'status', 'total_amount', 'details'
        ]

    def validate_status(self, value):
        valid_statuses = [
            PurchaseOrder.STATUS_PREPARING,
            PurchaseOrder.STATUS_DELIVERED,
            PurchaseOrder.STATUS_DELAYED
        ]
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Trạng thái không hợp lệ. Vui lòng chọn một trong các trạng thái: {', '.join(valid_statuses)}"
            )
        return value

    def create(self, validated_data):
        details_data = validated_data.pop('details', [])
        from django.db import transaction
        with transaction.atomic():
            purchase_order = PurchaseOrder.objects.create(**validated_data)
            for detail_data in details_data:
                PurchaseOrderDetail.objects.create(po=purchase_order, **detail_data)
            return purchase_order

    def update(self, instance, validated_data):
        details_data = validated_data.pop('details', None)
        from django.db import transaction
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if details_data is not None:
                instance.details.all().delete()
                for detail_data in details_data:
                    PurchaseOrderDetail.objects.create(po=instance, **detail_data)
            return instance


class ShipmentItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    barcode = serializers.CharField(source='product.barcode', read_only=True)

    class Meta:
        model = PurchaseOrderDetail
        fields = ['id', 'product', 'product_name', 'barcode', 'order_qty', 'unit_cost']


class ShipmentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.supplier_name', read_only=True)
    contact_phone = serializers.CharField(source='supplier.contact_phone', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    details = ShipmentItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'po_id', 'supplier', 'supplier_name', 'contact_phone',
            'order_date', 'expected_delivery_date', 'status',
            'is_overdue', 'total_amount', 'details'
        ]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class BatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batch
        fields = '__all__'


class StoreInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreInventory
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'


class OrderDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderDetail
        fields = '__all__'


class InventoryAlertSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    barcode = serializers.CharField(source='product.barcode', read_only=True)
    category_name = serializers.CharField(source='product.category.category_name', read_only=True)
    store_name = serializers.CharField(source='store.store_name', read_only=True, default=None)

    class Meta:
        model = InventoryAlert
        fields = [
            'alert_id', 'product', 'product_name', 'barcode', 'category_name',
            'store', 'store_name', 'current_stock', 'min_threshold',
            'created_at', 'is_resolved'
        ]
