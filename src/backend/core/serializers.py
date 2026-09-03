import re
from decimal import Decimal
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Role, Store, Staff, Supplier, PurchaseOrder, PurchaseOrderDetail,
    Category, Product, Batch, StoreInventory, Order, OrderDetail, InventoryAlert,
    StaffReview, StaffDocument, StaffCertificate, Shift,
    Customer, Discount, BusinessProfile, PaymentMethodSetting, MarketplaceChannelSetting,
    Notification,
)

# Performance thresholds for StaffSerializer.get_performance_status — a
# business rule not sourced from any spec, defined here so it's easy to find
# and adjust. Based on the current calendar month's completed Order total.
PERFORMANCE_EXCELLENT_THRESHOLD = 10_000_000
PERFORMANCE_GOOD_THRESHOLD = 5_000_000


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = '__all__'


class StaffReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffReview
        fields = ['id', 'staff', 'reviewer', 'rating', 'comment', 'created_at']
        extra_kwargs = {
            'staff': {'write_only': True},
        }

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class StaffDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffDocument
        fields = ['id', 'staff', 'name', 'file', 'uploaded_at']
        extra_kwargs = {
            'staff': {'write_only': True},
        }


class StaffCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffCertificate
        fields = ['id', 'staff', 'name', 'issued_by', 'issued_at']
        extra_kwargs = {
            'staff': {'write_only': True},
        }


class StaffSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    store_name = serializers.CharField(source='store.store_name', read_only=True, default=None)
    monthly_sales = serializers.SerializerMethodField()
    performance_status = serializers.SerializerMethodField()
    reviews = StaffReviewSerializer(many=True, read_only=True)
    documents = StaffDocumentSerializer(many=True, read_only=True)
    certificates = StaffCertificateSerializer(many=True, read_only=True)

    class Meta:
        model = Staff
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_monthly_sales(self, obj):
        # Sum of this month's completed Orders attributed to this staff
        # member (Order.staff), per FR: staff "monthly sales" performance
        # figure. Not a stored field — always computed live from real Order
        # data so it can't drift out of sync. Cached on the instance because
        # get_performance_status needs the same figure -- without this, DRF
        # ends up running this query twice per row.
        if not hasattr(obj, '_monthly_sales_cache'):
            now = timezone.now()
            total = Order.objects.filter(
                staff=obj, order_date__year=now.year, order_date__month=now.month
            ).aggregate(total=Sum('total_amount'))['total']
            obj._monthly_sales_cache = float(total or 0)
        return obj._monthly_sales_cache

    def get_performance_status(self, obj):
        sales = self.get_monthly_sales(obj)
        if sales >= PERFORMANCE_EXCELLENT_THRESHOLD:
            return 'Excellent'
        if sales >= PERFORMANCE_GOOD_THRESHOLD:
            return 'Good'
        return 'Needs Improvement'

    def create(self, validated_data):
        # Lấy mật khẩu người dùng nhập và băm nó ra
        password = validated_data.get('password')
        if password:
            validated_data['password'] = make_password(password)

        # Lưu vào Database
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Only hash+set password if the client actually sent one (edit forms
        # typically omit it to mean "leave unchanged").
        password = validated_data.get('password')
        if password:
            validated_data['password'] = make_password(password)
        else:
            validated_data.pop('password', None)
        return super().update(instance, validated_data)


class RegisterSerializer(serializers.ModelSerializer):
    """Public self-registration. Every account created through this endpoint
    is a Chain Manager — there's no lower-privilege self-service signup path
    (Cashier/Store Manager accounts are provisioned by a Chain Manager via
    the Staff API instead)."""
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Staff
        fields = ['staff_id', 'username', 'password', 'full_name', 'email']
        extra_kwargs = {
            'staff_id': {'read_only': True},
            # Required here even though nullable on the model — OTP login
            # emails the code to this address, so an account without one
            # could never sign in.
            'email': {'required': True, 'allow_blank': False},
        }

    def validate_password(self, value):
        validate_password(value)
        return value


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
    store_name = serializers.CharField(source='store.store_name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'po_id', 'supplier', 'supplier_name', 'store', 'store_name', 'order_date',
            'expected_delivery_date', 'status', 'total_amount', 'details'
        ]
        extra_kwargs = {
            # Nullable at the DB level for historical rows, but every new PO must be
            # tied to a branch -- Store Manager/Cashier get theirs auto-assigned in
            # PurchaseOrderViewSet.perform_create, Chain Manager must pick one.
            'store': {'required': True, 'allow_null': False},
        }

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
    store_name = serializers.CharField(source='store.store_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    details = ShipmentItemSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'po_id', 'supplier', 'supplier_name', 'contact_phone', 'store', 'store_name',
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


class ShiftSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.full_name', read_only=True)
    store_name = serializers.CharField(source='store.store_name', read_only=True)

    class Meta:
        model = Shift
        fields = [
            'shift_id', 'store', 'store_name', 'staff', 'staff_name', 'register',
            'opened_at', 'closed_at', 'opening_cash', 'closing_cash', 'status',
        ]
        extra_kwargs = {
            'staff': {'read_only': True},
            'closed_at': {'read_only': True},
            'closing_cash': {'read_only': True},
            'status': {'read_only': True},
        }


class PosCheckoutItemSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'))


class PosCheckoutSerializer(serializers.Serializer):
    store = serializers.PrimaryKeyRelatedField(queryset=Store.objects.all())
    shift = serializers.PrimaryKeyRelatedField(queryset=Shift.objects.all())
    payment_method = serializers.CharField(max_length=50)
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal('0'), max_value=Decimal('100'), default=Decimal('0'),
    )
    external_order_id = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    items = PosCheckoutItemSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value


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


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class DiscountSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)

    class Meta:
        model = Discount
        fields = ['discount_id', 'product', 'product_name', 'discount_type', 'value', 'applied_at', 'is_active']

    def validate(self, attrs):
        product = attrs.get('product') or getattr(self.instance, 'product', None)
        discount_type = attrs.get('discount_type') or getattr(self.instance, 'discount_type', None)
        value = attrs.get('value')
        if value is not None:
            if value <= 0:
                raise serializers.ValidationError({"value": "Discount value must be greater than 0."})
            if discount_type == Discount.TYPE_PERCENTAGE and value > 90:
                raise serializers.ValidationError({"value": "Percentage discount must be between 1 and 90."})
            if discount_type == Discount.TYPE_PRICE and product and value >= product.base_price:
                raise serializers.ValidationError({"value": "New price must be less than the current base price."})
        return attrs

    def create(self, validated_data):
        # Only one active discount per product at a time -- applying a new one
        # supersedes whatever was active before, keeping "the current discount"
        # on a product unambiguous for POS pricing.
        if validated_data.get('is_active', True):
            Discount.objects.filter(product=validated_data['product'], is_active=True).update(is_active=False)
        return super().create(validated_data)


class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessProfile
        fields = '__all__'


class PaymentMethodSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethodSetting
        fields = '__all__'


class MarketplaceChannelSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketplaceChannelSetting
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'message', 'order', 'is_read', 'created_at']
        read_only_fields = fields
