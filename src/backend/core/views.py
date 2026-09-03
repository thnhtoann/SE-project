import hashlib
import os
import random
import re
import secrets
import requests
from datetime import timedelta
from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.db import models, transaction, IntegrityError
from django.utils import timezone
from django.core.mail import send_mail
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum
from django.db.models.functions import TruncHour, TruncDate, TruncMonth, ExtractHour
# Import Models & Serializers
from .models import (
    Role, Store, Staff, Supplier, PurchaseOrder, PurchaseOrderDetail,
    Category, Product, Batch, StoreInventory, Order, OrderDetail, OTPRecord, InventoryAlert,
    StaffReview, StaffDocument, StaffCertificate, Shift,
    Customer, Discount, BusinessProfile, PaymentMethodSetting, MarketplaceChannelSetting,
    Notification,
)
from .serializers import (
    RoleSerializer, StoreSerializer, StaffSerializer, SupplierSerializer,
    PurchaseOrderSerializer, PurchaseOrderDetailSerializer, ShipmentSerializer, CategorySerializer,
    ProductSerializer, BatchSerializer, StoreInventorySerializer,
    OrderSerializer, OrderDetailSerializer, InventoryAlertSerializer,
    StaffReviewSerializer, StaffDocumentSerializer, StaffCertificateSerializer,
    RegisterSerializer, ShiftSerializer, PosCheckoutSerializer,
    CustomerSerializer, DiscountSerializer, BusinessProfileSerializer,
    PaymentMethodSettingSerializer, MarketplaceChannelSettingSerializer, NotificationSerializer,
)
from .permissions import IsCashier, IsChainManager, IsStoreManager, ROLE_RANK
from .inventory import deduct_stock, InsufficientStockError
from .checkout import create_pos_order


class HealthCheckView(APIView):
    def get(self, request):
        return Response({'status': 'ok'})


class SupplierListCreateView(APIView):
    def get_permissions(self):
        if self.request.method in ['POST', 'PUT', 'DELETE']:
            return [IsChainManager()]
        return [(IsStoreManager | IsChainManager)()]

    def get(self, request):
        suppliers = Supplier.objects.all().order_by('supplier_id')
        serializer = SupplierSerializer(suppliers, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SupplierSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SupplierDetailView(APIView):
    def get_permissions(self):
        if self.request.method in ['POST', 'PUT', 'DELETE']:
            return [IsChainManager()]
        return [(IsStoreManager | IsChainManager)()]

    def get_object(self, pk):
        return Supplier.objects.filter(pk=pk).first()

    def get(self, request, pk):
        supplier = self.get_object(pk)
        if supplier is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = SupplierSerializer(supplier)
        return Response(serializer.data)

    def put(self, request, pk):
        supplier = self.get_object(pk)
        if supplier is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = SupplierSerializer(supplier, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        supplier = self.get_object(pk)
        if supplier is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        supplier.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==========================================
# CÁC VIEWSET QUẢN LÝ NGHIỆP VỤ (SMART PROCUREMENT & POS)
# ==========================================

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsChainManager]


class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer

    def get_permissions(self):
        # Was Chain-Manager-only for every method, including GET -- but the
        # Inventory/Staff/dashboard pages all need to resolve store names for
        # any role, so a Store Manager (or Cashier) hit a 403 just listing
        # stores and every screen that depends on it silently went empty.
        # Create/edit/delete stays Chain Manager/Admin-only.
        if self.request.method in SAFE_METHODS:
            return [IsCashier()]
        return [IsChainManager()]


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer

    def get_permissions(self):
        # Store Manager can view (their own store's) staff and transfer
        # lower-ranked staff between branches (see transfer_store below, which
        # does its own role-rank check); only Chain Manager/Admin can
        # otherwise create/edit/delete staff records.
        if self.request.method in SAFE_METHODS or self.action == 'transfer_store':
            return [(IsStoreManager | IsChainManager)()]
        return [IsChainManager()]

    @action(detail=True, methods=['patch'], url_path='transfer-store')
    def transfer_store(self, request, pk=None):
        """ Chuyển chi nhánh (store) cho 1 nhân viên. Chain Manager/Admin có
        thể chuyển cho bất kỳ ai, kể cả chính mình; Store Manager chỉ được
        chuyển cho nhân viên có role thấp hơn mình (không tự chuyển, không
        chuyển ngang hàng) trong phạm vi cửa hàng mình quản lý (đã bị
        get_queryset ở trên giới hạn sẵn). """
        staff = self.get_object()
        actor = request.user
        actor_rank = ROLE_RANK.get(actor.role.role_name if actor.role else None, 0)
        target_rank = ROLE_RANK.get(staff.role.role_name if staff.role else None, 0)
        is_self = staff.pk == actor.pk
        is_chain_manager = actor_rank >= ROLE_RANK['Chain Manager']

        if not (is_chain_manager or (actor_rank > target_rank and not is_self)):
            raise PermissionDenied("You do not have permission to transfer this staff member's branch.")

        store_id = request.data.get('store')
        store = None
        if store_id not in (None, ''):
            try:
                store = Store.objects.get(pk=store_id)
            except Store.DoesNotExist:
                raise ValidationError({"store": ["Store not found."]})

        staff.store = store
        staff.save(update_fields=['store'])
        return Response(StaffSerializer(staff).data)

    def get_queryset(self):
        # select_related/prefetch_related avoid an N+1 per row: without them,
        # serializing a list of N staff issues ~7N extra queries (role, store,
        # monthly_sales x2, reviews, documents, certificates) -- measured at
        # ~13s for 10 rows against this DB's per-query latency, vs <1s after.
        queryset = Staff.objects.select_related('role', 'store').prefetch_related('reviews', 'documents', 'certificates')
        user = self.request.user
        # Same store-scoping convention as StoreInventoryViewSet: Chain
        # Manager/Admin can browse any store (optionally narrowed via
        # ?store=<id>) or everyone chain-wide when omitted; Store Manager is
        # locked to their own store's staff regardless of ?store=.
        if user.role and user.role.role_name in ('Chain Manager', 'Admin'):
            store_id = self.request.query_params.get('store')
            if store_id:
                queryset = queryset.filter(store_id=store_id)
        else:
            queryset = queryset.filter(store_id=user.store_id)
        return queryset


class StaffScopedViewSet(viewsets.ModelViewSet):
    """Shared base for Staff sub-resources (reviews/documents/certificates):
    same all-Chain-Manager-only gate as StaffViewSet itself, filterable by
    ?staff=<id> for the profile page that lists them per staff member."""
    permission_classes = [IsChainManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        staff_id = self.request.query_params.get('staff')
        if staff_id:
            queryset = queryset.filter(staff_id=staff_id)
        return queryset


class StaffReviewViewSet(StaffScopedViewSet):
    queryset = StaffReview.objects.all()
    serializer_class = StaffReviewSerializer


class StaffDocumentViewSet(StaffScopedViewSet):
    queryset = StaffDocument.objects.all()
    serializer_class = StaffDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]


class StaffCertificateViewSet(StaffScopedViewSet):
    queryset = StaffCertificate.objects.all()
    serializer_class = StaffCertificateSerializer


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().order_by('-order_date', '-po_id')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsStoreManager | IsChainManager]

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsChainManager()]
        return [(IsStoreManager | IsChainManager)()]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        supplier_param = self.request.query_params.get('supplier')

        if status_param:
            queryset = queryset.filter(status__iexact=status_param)
        if supplier_param:
            queryset = queryset.filter(supplier_id=supplier_param)

        # Same store-scoping convention as StoreInventoryViewSet/StaffViewSet:
        # Chain Manager/Admin can browse any branch (optionally narrowed via
        # ?store=<id>) or everything chain-wide when omitted; everyone else is
        # locked to their own store's purchase orders regardless of ?store=.
        user = self.request.user
        if user.role and user.role.role_name in ('Chain Manager', 'Admin'):
            store_id = self.request.query_params.get('store')
            if store_id:
                queryset = queryset.filter(store_id=store_id)
        else:
            queryset = queryset.filter(store_id=user.store_id)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role and user.role.role_name not in ('Chain Manager', 'Admin'):
            store = serializer.validated_data.get('store')
            if store and store.store_id != user.store_id:
                raise ValidationError({"store": ["You can only create purchase orders for your own store."]})
        serializer.save()

    @action(detail=True, methods=['patch', 'put'], url_path='status', url_name='status')
    def update_status(self, request, pk=None):
        purchase_order = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response({'status': ['Trạng thái (status) là bắt buộc.']}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(purchase_order, data={'status': new_status}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class PurchaseOrderDetailViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderDetail.objects.all()
    serializer_class = PurchaseOrderDetailSerializer
    permission_classes = [IsStoreManager | IsChainManager]

    def get_permissions(self):
        if self.action in ['destroy', 'create', 'update', 'partial_update']:
            return [IsChainManager()]
        return [(IsStoreManager | IsChainManager)()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not (user.role and user.role.role_name in ('Chain Manager', 'Admin')):
            queryset = queryset.filter(po__store_id=user.store_id)
        return queryset


class ShipmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    U010 / PROC-3: Shipment Status Tracking API for incoming purchase orders.
    Provides tracking info (supplier, dates, status, overdue flag, items)
    and enables status updates & overdue detection.
    """
    queryset = PurchaseOrder.objects.all().order_by('-order_date', '-po_id')
    serializer_class = ShipmentSerializer
    permission_classes = [IsStoreManager | IsChainManager]

    def get_queryset(self):
        # Auto sweep overdue orders on list/retrieve
        for order in PurchaseOrder.objects.filter(status=PurchaseOrder.STATUS_PREPARING):
            order.check_and_update_overdue()

        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        supplier_param = self.request.query_params.get('supplier')
        overdue_param = self.request.query_params.get('overdue')

        if status_param:
            queryset = queryset.filter(status__iexact=status_param)
        if supplier_param:
            queryset = queryset.filter(supplier_id=supplier_param)

        # Same store-scoping convention as PurchaseOrderViewSet.
        user = self.request.user
        if user.role and user.role.role_name in ('Chain Manager', 'Admin'):
            store_id = self.request.query_params.get('store')
            if store_id:
                queryset = queryset.filter(store_id=store_id)
        else:
            queryset = queryset.filter(store_id=user.store_id)

        if overdue_param is not None:
            if overdue_param.lower() in ['true', '1']:
                from datetime import date
                queryset = queryset.filter(
                    models.Q(status=PurchaseOrder.STATUS_DELAYED) |
                    models.Q(status=PurchaseOrder.STATUS_PREPARING, expected_delivery_date__lt=date.today())
                )

        return queryset

    @action(detail=True, methods=['patch', 'put'], url_path='status', url_name='status')
    def update_status(self, request, pk=None):
        shipment = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response({'status': ['Trạng thái (status) là bắt buộc.']}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PurchaseOrderSerializer(shipment, data={'status': new_status}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='check-overdue', url_name='check-overdue')
    def check_overdue(self, request):
        updated_count = 0
        for order in PurchaseOrder.objects.filter(status=PurchaseOrder.STATUS_PREPARING):
            if order.check_and_update_overdue():
                updated_count += 1
        return Response({
            'detail': f'Đã cập nhật {updated_count} lô hàng trễ hạn sang trạng thái Delayed.',
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)


class LowStockAlertViewSet(viewsets.ModelViewSet):
    """
    Scrum 108 / PROC-4: Low-Stock Alert Logic API.
    Performs JOIN query between PRODUCT and STORE_INVENTORY via BATCH.
    Calculates actual store-level stock for products and generates alerts
    when total stock reaches or falls below MinThreshold.
    """
    queryset = InventoryAlert.objects.all().order_by('-created_at')
    serializer_class = InventoryAlertSerializer
    permission_classes = [IsStoreManager | IsChainManager]

    def _sweep_low_stock_alerts(self, store_id=None):
        """
        Compares current stock (grouped by store/product) against
        MinThreshold and creates/refreshes InventoryAlert rows for anything
        at or below it. Runs 3 queries total regardless of catalog size --
        it used to run one StoreInventory aggregate per (store, product)
        pair in a Python double loop, which measured at ~17s for just 10
        products x 3 stores on this DB's per-query latency.
        """
        stores_qs = Store.objects.all()
        if store_id:
            stores_qs = stores_qs.filter(pk=store_id)
        store_ids = list(stores_qs.values_list('store_id', flat=True))
        if not store_ids:
            return

        stock_rows = (
            StoreInventory.objects.filter(store_id__in=store_ids)
            .values('store_id', 'batch__product_id')
            .annotate(total=models.Sum('quantity'))
        )
        stock_by_store_product = {(row['store_id'], row['batch__product_id']): row['total'] or 0 for row in stock_rows}

        for product in Product.objects.all():
            for sid in store_ids:
                total_stock = stock_by_store_product.get((sid, product.product_id), 0)
                if product.is_low_stock(total_stock):
                    alert, created = InventoryAlert.objects.get_or_create(
                        product=product,
                        store_id=sid,
                        is_resolved=False,
                        defaults={
                            'current_stock': total_stock,
                            'min_threshold': product.min_threshold
                        }
                    )
                    if not created and alert.current_stock != total_stock:
                        alert.current_stock = total_stock
                        alert.save(update_fields=['current_stock'])

    def get_queryset(self):
        user = self.request.user
        is_chain_scope = bool(user.role and user.role.role_name in ('Chain Manager', 'Admin'))
        store_id = self.request.query_params.get('store') or self.request.query_params.get('store_id')
        # Same store-scoping convention as StoreInventoryViewSet/StaffViewSet:
        # Store Manager/Cashier only ever sweep and see their own store's
        # alerts, regardless of ?store=.
        if not is_chain_scope:
            store_id = user.store_id
        self._sweep_low_stock_alerts(store_id=store_id)

        queryset = super().get_queryset()
        if store_id:
            queryset = queryset.filter(store_id=store_id)

        product_id = self.request.query_params.get('product') or self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        is_resolved_param = self.request.query_params.get('is_resolved')
        if is_resolved_param is not None:
            is_res = is_resolved_param.lower() in ['true', '1']
            queryset = queryset.filter(is_resolved=is_res)

        return queryset

    @action(detail=False, methods=['post'], url_path='check', url_name='check')
    def check_alerts(self, request):
        self._sweep_low_stock_alerts()
        active_alerts = InventoryAlert.objects.filter(is_resolved=False)
        return Response({
            'detail': f'Đã kiểm tra xong. Hiện có {active_alerts.count()} cảnh báo tồn kho thấp.',
            'active_alert_count': active_alerts.count()
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch', 'put'], url_path='resolve', url_name='resolve')
    def resolve_alert(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.save(update_fields=['is_resolved'])
        return Response(self.get_serializer(alert).data, status=status.HTTP_200_OK)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsCashier()]
        return [(IsStoreManager | IsChainManager)()]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsCashier()]
        return [(IsStoreManager | IsChainManager)()]

    MAX_IMAGE_SIZE = 5 * 1024 * 1024

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser], url_path='upload-image')
    def upload_image(self, request, pk=None):
        """Saves the uploaded file to local disk (see Product.image_url's comment --
        this is lost on the next Railway redeploy, same tradeoff as StaffDocument) and
        points image_url at it. Not a model FileField: image_url also has to hold
        externally-sourced image links for products no one has uploaded a photo for."""
        product = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({"file": ["No file uploaded."]}, status=status.HTTP_400_BAD_REQUEST)
        if not (file.content_type or '').startswith('image/'):
            return Response({"file": ["File must be an image."]}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > self.MAX_IMAGE_SIZE:
            return Response({"file": ["Image must be under 5MB."]}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file.name)[1] or '.jpg'
        saved_path = default_storage.save(f'product_images/product_{product.product_id}{ext}', file)
        product.image_url = request.build_absolute_uri(default_storage.url(saved_path))
        product.save(update_fields=['image_url'])
        return Response(ProductSerializer(product).data, status=status.HTTP_200_OK)


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer

    def get_queryset(self):
        queryset = Batch.objects.all()
        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsCashier()]
        return [(IsStoreManager | IsChainManager)()]


class StoreInventoryViewSet(viewsets.ModelViewSet):
    queryset = StoreInventory.objects.all()
    serializer_class = StoreInventorySerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsCashier()]
        return [(IsStoreManager | IsChainManager)()]

    def get_queryset(self):
        queryset = StoreInventory.objects.all()
        user = self.request.user
        # Chain Manager/Admin can browse any store (optionally narrowed via
        # ?store=<id>, e.g. for the Inventory page's store picker) or see
        # everything chain-wide when omitted. Everyone else is locked to
        # their own assigned store regardless of ?store=, so a Store Manager
        # or Cashier can never read another store's stock by changing the
        # query param.
        if user.role and user.role.role_name in ('Chain Manager', 'Admin'):
            store_id = self.request.query_params.get('store')
            if store_id:
                queryset = queryset.filter(store_id=store_id)
        else:
            queryset = queryset.filter(store_id=user.store_id)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role and user.role.role_name not in ('Chain Manager', 'Admin'):
            store = serializer.validated_data.get('store')
            if store and store.store_id != user.store_id:
                raise ValidationError({"store": ["You can only manage inventory for your own store."]})
        serializer.save()


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsCashier | IsStoreManager | IsChainManager]

    def get_queryset(self):
        queryset = Order.objects.all().order_by('-order_date')
        channel = self.request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(order_type=channel)
        store_id = self.request.query_params.get('store')
        if store_id:
            queryset = queryset.filter(store_id=store_id)
        return queryset

    @action(detail=False, methods=['post'], url_path='checkout')
    def checkout(self, request):
        serializer = PosCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            order = create_pos_order(
                store=data['store'],
                shift=data['shift'],
                payment_method=data['payment_method'],
                items=data['items'],
                staff=request.user,
                discount_percent=data['discount_percent'],
                external_order_id=data.get('external_order_id'),
            )
        except InsufficientStockError as e:
            raise ValidationError({"detail": str(e)})

        response_data = OrderSerializer(order).data
        response_data['details'] = OrderDetailSerializer(order.orderdetail_set.all(), many=True).data
        return Response(response_data, status=status.HTTP_201_CREATED)


class OrderDetailViewSet(viewsets.ModelViewSet):
    queryset = OrderDetail.objects.all()
    serializer_class = OrderDetailSerializer
    permission_classes = [IsCashier | IsStoreManager | IsChainManager]

    def get_queryset(self):
        queryset = OrderDetail.objects.all()
        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        return queryset

    def perform_create(self, serializer):
        with transaction.atomic():
            order = serializer.validated_data['order']
            product = serializer.validated_data['product']
            sell_qty = serializer.validated_data['quantity']
            store = order.store

            try:
                deduct_stock(store, product, sell_qty)
            except InsufficientStockError as e:
                raise ValidationError({"detail": str(e)})

            serializer.save()


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [IsCashier]

    def get_queryset(self):
        queryset = super().get_queryset()
        store_id = self.request.query_params.get('store')
        status_param = self.request.query_params.get('status')
        if store_id:
            queryset = queryset.filter(store_id=store_id)
        if status_param:
            queryset = queryset.filter(status__iexact=status_param)
        return queryset

    def perform_create(self, serializer):
        store = serializer.validated_data['store']
        if Shift.objects.filter(store=store, status=Shift.STATUS_OPEN).exists():
            raise ValidationError({"detail": "A shift is already open for this store."})
        serializer.save(staff=self.request.user)

    @action(detail=True, methods=['patch', 'put'], url_path='close', url_name='close')
    def close_shift(self, request, pk=None):
        shift = self.get_object()
        if shift.status == Shift.STATUS_CLOSED:
            return Response({"detail": "Shift is already closed."}, status=status.HTTP_400_BAD_REQUEST)

        closing_cash = request.data.get('closing_cash')
        if closing_cash is None:
            return Response({"closing_cash": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        shift.closing_cash = closing_cash
        shift.closed_at = timezone.now()
        shift.status = Shift.STATUS_CLOSED
        shift.save(update_fields=['closing_cash', 'closed_at', 'status'])
        return Response(self.get_serializer(shift).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='eod-report', url_name='eod-report')
    def eod_report(self, request, pk=None):
        shift = self.get_object()
        orders = Order.objects.filter(shift=shift, status__iexact='Completed')

        cash_total = orders.filter(payment_method__iexact='Cash').aggregate(
            total=models.Sum('total_amount'))['total'] or 0
        bank_qr_total = orders.filter(payment_method__iexact='Bank QR').aggregate(
            total=models.Sum('total_amount'))['total'] or 0

        hourly_breakdown = list(
            orders.annotate(hour=TruncHour('order_date'))
            .values('hour')
            .annotate(total=models.Sum('total_amount'), order_count=models.Count('order_id'))
            .order_by('hour')
        )

        top_products = list(
            OrderDetail.objects.filter(order__in=orders)
            .values('product__product_id', 'product__product_name')
            .annotate(total_qty=models.Sum('quantity'))
            .order_by('-total_qty')[:5]
        )

        return Response({
            "shift_id": shift.shift_id,
            "order_count": orders.count(),
            "cash_total": cash_total,
            "bank_qr_total": bank_qr_total,
            "grand_total": cash_total + bank_qr_total,
            "hourly_breakdown": hourly_breakdown,
            "top_products": top_products,
        }, status=status.HTTP_200_OK)


# ==========================================
# CÁC VIEW XỬ LÝ AUTHENTICATION 2FA (OTP -> JWT)
# ==========================================

# "Remember me" (remember_me=true on login) does two things together, like a
# typical "keep me signed in on this device" checkbox: issues a refresh token
# that lives 30 days instead of the default, and marks this browser as
# trusted for 30 days so a future login from it can skip the OTP step
# entirely. Trust records live in the shared Redis cache (not a DB table) —
# consistent with how login/OTP attempt counters are already tracked here,
# and simple since there's nothing to look up besides "is this token valid".
REMEMBER_ME_REFRESH_LIFETIME = timedelta(days=30)
TRUSTED_DEVICE_TTL_SECONDS = 30 * 24 * 60 * 60


def _hash_device_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def _default_store():
    """ Chi nhánh chính (mặc định) gán cho tài khoản tự đăng ký -- luôn là
    chi nhánh có store_id nhỏ nhất, vì Store hiện chưa có cờ "is_main" riêng.
    Trả về None nếu hệ thống chưa có chi nhánh nào (staff.store để trống,
    một Chain Manager/Store Manager gán tay sau qua transfer-store). """
    return Store.objects.order_by('store_id').first()


def _issue_tokens(user, remember_me):
    refresh = RefreshToken.for_user(user)
    if remember_me:
        refresh.set_exp(lifetime=REMEMBER_ME_REFRESH_LIFETIME)

    device_token = None
    if remember_me:
        device_token = secrets.token_urlsafe(32)
        cache.set(
            f"trusted_device_{_hash_device_token(device_token)}",
            {'staff_id': user.staff_id},
            timeout=TRUSTED_DEVICE_TTL_SECONDS,
        )

    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'role': user.role.role_name if user.role else 'None',
        'staff_id': user.staff_id,
        'store_id': user.store_id,
        'device_token': device_token,
    }


class RegisterRequestOTPView(APIView):
    """ Bước 1: Nhập thông tin đăng ký -> Kiểm tra hợp lệ -> Gửi OTP qua Email.
    Tài khoản chưa được tạo ở bước này — dữ liệu (kèm mật khẩu đã băm) và mã
    OTP được lưu tạm trong cache (khóa theo email) vì Staff record chưa tồn
    tại để gắn OTPRecord vào. """
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data['email']

        otp = str(random.randint(100000, 999999))
        cache.set(f"pending_registration_{email}", {
            'username': data['username'],
            'full_name': data['full_name'],
            'email': email,
            'password_hash': make_password(data['password']),
            'otp': otp,
        }, timeout=300)
        cache.delete(f"register_otp_attempts_{email}")

        send_mail(
            subject='[Smart Procurement] Mã OTP Xác Thực Đăng Ký',
            message=f'Mã xác thực OTP của bạn là: {otp}. Mã có hiệu lực trong 5 phút.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        return Response({
            "message": "OTP đã được gửi tới email của bạn.",
            "email": email,
        }, status=status.HTTP_200_OK)


class RegisterVerifyOTPView(APIView):
    """ Bước 2: Nhập OTP -> Tạo tài khoản Chain Manager """
    permission_classes = []

    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp')

        if not email or not otp_code:
            return Response(
                {"error": "Vui lòng nhập đầy đủ email và mã OTP!", "error_code": "otp_missing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        pending_key = f"pending_registration_{email}"
        pending = cache.get(pending_key)
        if not pending:
            return Response(
                {"error": "Yêu cầu đăng ký đã hết hạn hoặc không tồn tại. Vui lòng đăng ký lại.", "error_code": "invalid_request"},
                status=status.HTTP_400_BAD_REQUEST
            )

        attempts_key = f"register_otp_attempts_{email}"
        attempts = cache.get(attempts_key, 0)
        if attempts >= 5:
            return Response(
                {"error": "Nhập sai mã OTP quá nhiều lần. Vui lòng đăng ký lại.", "error_code": "otp_locked"},
                status=status.HTTP_403_FORBIDDEN
            )

        if pending['otp'] != str(otp_code):
            cache.set(attempts_key, attempts + 1, timeout=300)
            return Response(
                {"error": "Mã OTP không chính xác hoặc đã hết hạn!", "error_code": "otp_invalid"},
                status=status.HTTP_400_BAD_REQUEST
            )

        role, _ = Role.objects.get_or_create(role_name='Chain Manager')
        try:
            Staff.objects.create(
                username=pending['username'],
                password=pending['password_hash'],
                full_name=pending['full_name'],
                email=pending['email'],
                role=role,
                store=_default_store(),
                is_active=True,
            )
        except IntegrityError:
            cache.delete(pending_key)
            cache.delete(attempts_key)
            return Response(
                {"error": "Tên đăng nhập hoặc email đã được sử dụng.", "error_code": "invalid_request"},
                status=status.HTTP_400_BAD_REQUEST
            )

        cache.delete(pending_key)
        cache.delete(attempts_key)
        return Response(
            {"message": "Tài khoản Chain Manager đã được tạo. Vui lòng đăng nhập."},
            status=status.HTTP_201_CREATED,
        )


class LoginRequestOTPView(APIView):
    """ Bước 1: Nhập Username/Email + Pass -> Kiểm tra 3 lần sai -> Nhận OTP qua Email """
    permission_classes = []

    def post(self, request):
        identifier = request.data.get('identifier')
        password = request.data.get('password')

        # Bắt buộc phải nhập đầy đủ
        if not identifier or not password:
            return Response(
                {
                    "error": "Vui lòng nhập đầy đủ tài khoản (username hoặc email) và mật khẩu!",
                    "error_code": "missing_credentials",
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Cho phép đăng nhập bằng username hoặc email
        matched_user = Staff.objects.filter(
            models.Q(username=identifier) | models.Q(email__iexact=identifier)
        ).first()
        lookup_username = matched_user.username if matched_user else identifier

        # 1. Kiểm tra xem user này đã bị khóa chưa (nhập sai >= 3 lần)
        cache_key = f"login_attempts_{lookup_username}"
        attempts = cache.get(cache_key, 0)

        if attempts >= 3:
            return Response(
                {
                    "error": "Tài khoản đã bị khóa do nhập sai quá 3 lần. Vui lòng thử lại sau 15 phút.",
                    "error_code": "account_locked",
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. Xác thực tài khoản
        user = authenticate(username=lookup_username, password=password) if matched_user else None
        if user:
            # Xóa sổ nợ nếu nhập đúng
            cache.delete(cache_key)

            # Nếu trình duyệt này đã được ghi nhớ (đăng nhập trước đó có tick
            # "remember_me") và mã thiết bị khớp với đúng user này -> bỏ qua
            # bước OTP, cấp token luôn.
            device_token = request.data.get('device_token')
            if device_token:
                trusted = cache.get(f"trusted_device_{_hash_device_token(device_token)}")
                if trusted and trusted.get('staff_id') == user.staff_id:
                    remember_me = bool(request.data.get('remember_me'))
                    tokens = _issue_tokens(user, remember_me)
                    return Response({
                        'trusted_device': True,
                        'username': user.username,
                        **tokens,
                    }, status=status.HTTP_200_OK)

            # Sinh mã OTP
            otp_record, _ = OTPRecord.objects.get_or_create(user=user)
            otp = otp_record.generate_otp()
            cache.delete(f"otp_attempts_{user.username}")

            # Gửi OTP qua Email
            send_mail(
                subject='[Smart Procurement] Mã OTP Đăng Nhập',
                message=f'Mã xác thực OTP của bạn là: {otp}. Mã có hiệu lực trong 5 phút.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

            return Response({
                "message": "OTP đã được gửi tới email của bạn.",
                "username": user.username
            }, status=status.HTTP_200_OK)

        # Nếu sai password -> Tăng số lần sai
        attempts += 1
        cache.set(cache_key, attempts, timeout=900)
        return Response(
            {
                "error": f"Sai thông tin đăng nhập! Bạn còn {3 - attempts} lần thử.",
                "error_code": "invalid_credentials",
                "attempts_left": max(0, 3 - attempts),
            },
            status=status.HTTP_401_UNAUTHORIZED
        )


class LoginVerifyOTPView(APIView):
    """ Bước 2: Nhập OTP -> Trả về Token JWT """
    permission_classes = []

    def post(self, request):
        username = request.data.get('username')
        otp_code = request.data.get('otp')

        if not username or not otp_code:
            return Response(
                {"error": "Vui lòng nhập đầy đủ username và mã OTP!", "error_code": "otp_missing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = Staff.objects.get(username=username)
            otp_record = user.otp_record

            # Chặn brute-force mã OTP: tối đa 5 lần nhập sai mỗi mã
            attempts_key = f"otp_attempts_{username}"
            attempts = cache.get(attempts_key, 0)
            if attempts >= 5:
                return Response(
                    {"error": "Nhập sai mã OTP quá nhiều lần. Vui lòng gửi lại mã mới.", "error_code": "otp_locked"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Kiểm tra OTP đúng và còn hạn
            if otp_record.otp == str(otp_code) and otp_record.is_valid():
                otp_record.otp = 'USED' # Vô hiệu hóa OTP sau khi dùng
                otp_record.save()
                cache.delete(attempts_key)

                # Cấp cặp JWT Token chính thức
                remember_me = bool(request.data.get('remember_me'))
                return Response(_issue_tokens(user, remember_me), status=status.HTTP_200_OK)

            cache.set(attempts_key, attempts + 1, timeout=300)
            return Response(
                {"error": "OTP không chính xác hoặc đã hết hạn!", "error_code": "otp_invalid"},
                status=status.HTTP_400_BAD_REQUEST
            )

        except (Staff.DoesNotExist, OTPRecord.DoesNotExist):
            return Response(
                {"error": "Yêu cầu không hợp lệ!", "error_code": "invalid_request"},
                status=status.HTTP_400_BAD_REQUEST
            )


# ==========================================
# ĐĂNG NHẬP / ĐĂNG KÝ QUA GOOGLE & FACEBOOK
# ==========================================
# Không dùng OTP: nhà cung cấp OAuth đã tự xác thực danh tính và quyền sở
# hữu email, nên bỏ qua bước OTP như luồng username/password ở trên.
# Nếu email chưa khớp Staff nào có sẵn, tự động tạo tài khoản Chain Manager
# mới (giống hệt chính sách của RegisterVerifyOTPView) với mật khẩu "unusable"
# — tài khoản chỉ đăng nhập được qua social login cho tới khi tự đặt mật khẩu
# qua luồng "quên mật khẩu".

def _get_or_create_social_staff(email, full_name):
    staff = Staff.objects.filter(email__iexact=email).first()
    if staff:
        return staff

    role, _ = Role.objects.get_or_create(role_name='Chain Manager')
    base_username = re.sub(r'[^a-zA-Z0-9_.-]', '', email.split('@')[0]) or 'user'
    username = base_username
    suffix = 1
    while Staff.objects.filter(username=username).exists():
        suffix += 1
        username = f"{base_username}{suffix}"

    staff = Staff(
        username=username,
        full_name=full_name or username,
        email=email,
        role=role,
        store=_default_store(),
        is_active=True,
    )
    staff.set_unusable_password()
    staff.save()
    return staff


class GoogleLoginView(APIView):
    """ Đăng nhập bằng Google OAuth access token (lấy ở client qua Google
    Identity Services' token client, popup flow) -> xác thực token với
    Google (tokeninfo để check đúng audience/client, userinfo để lấy hồ sơ)
    -> tìm hoặc tạo Staff theo email -> cấp token JWT luôn. """
    permission_classes = []

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response(
                {"error": "Thiếu access_token.", "error_code": "access_token_missing"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not settings.GOOGLE_OAUTH_CLIENT_ID:
            return Response(
                {"error": "Đăng nhập Google chưa được cấu hình.", "error_code": "oauth_not_configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            tokeninfo_response = requests.get(
                'https://www.googleapis.com/oauth2/v3/tokeninfo',
                params={'access_token': access_token},
                timeout=10,
            )
            tokeninfo = tokeninfo_response.json()
        except requests.RequestException:
            tokeninfo_response, tokeninfo = None, {}

        # `aud` check stops a token minted for a different Google app being
        # replayed against this endpoint (mirrors the Facebook debug_token check).
        if tokeninfo_response is None or tokeninfo_response.status_code != 200 or tokeninfo.get('aud') != settings.GOOGLE_OAUTH_CLIENT_ID:
            return Response(
                {"error": "Token Google không hợp lệ.", "error_code": "google_token_invalid"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            userinfo_response = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10,
            )
            profile = userinfo_response.json()
        except requests.RequestException:
            userinfo_response, profile = None, {}

        if userinfo_response is None or userinfo_response.status_code != 200 or not profile.get('email'):
            return Response(
                {"error": "Token Google không hợp lệ.", "error_code": "google_token_invalid"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if not profile.get('email_verified'):
            return Response(
                {"error": "Email Google chưa được xác minh.", "error_code": "email_not_verified"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = _get_or_create_social_staff(profile['email'], profile.get('name', ''))
        if not user.is_active:
            return Response(
                {"error": "Tài khoản đã bị vô hiệu hóa.", "error_code": "account_disabled"},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({'username': user.username, **_issue_tokens(user, remember_me=False)}, status=status.HTTP_200_OK)


class FacebookLoginView(APIView):
    """ Đăng nhập bằng Facebook access token (lấy ở client qua Facebook JS
    SDK) -> xác thực token với Graph API -> tìm hoặc tạo Staff theo email
    -> cấp token JWT luôn. """
    permission_classes = []

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response(
                {"error": "Thiếu access_token.", "error_code": "access_token_missing"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not settings.FACEBOOK_APP_ID or not settings.FACEBOOK_APP_SECRET:
            return Response(
                {"error": "Đăng nhập Facebook chưa được cấu hình.", "error_code": "oauth_not_configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        app_access_token = f"{settings.FACEBOOK_APP_ID}|{settings.FACEBOOK_APP_SECRET}"
        try:
            debug_response = requests.get(
                'https://graph.facebook.com/debug_token',
                params={'input_token': access_token, 'access_token': app_access_token},
                timeout=10,
            )
            debug_data = debug_response.json().get('data', {})
        except requests.RequestException:
            debug_data = {}

        # is_valid + app_id check stops a token minted for a different Facebook
        # app being replayed against this endpoint.
        if not debug_data.get('is_valid') or str(debug_data.get('app_id')) != str(settings.FACEBOOK_APP_ID):
            return Response(
                {"error": "Token Facebook không hợp lệ.", "error_code": "facebook_token_invalid"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            profile_response = requests.get(
                'https://graph.facebook.com/me',
                params={'fields': 'id,name,email', 'access_token': access_token},
                timeout=10,
            )
            profile = profile_response.json()
        except requests.RequestException:
            profile = {}

        email = profile.get('email')
        if not email:
            return Response(
                {"error": "Tài khoản Facebook không có email hoặc chưa cấp quyền chia sẻ email.", "error_code": "facebook_email_missing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = _get_or_create_social_staff(email, profile.get('name', ''))
        if not user.is_active:
            return Response(
                {"error": "Tài khoản đã bị vô hiệu hóa.", "error_code": "account_disabled"},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({'username': user.username, **_issue_tokens(user, remember_me=False)}, status=status.HTTP_200_OK)


class PasswordResetRequestOTPView(APIView):
    """ Bước 1: Nhập username/email -> Gửi OTP đặt lại mật khẩu qua Email.
    Trả lỗi rõ ràng nếu không tìm thấy tài khoản -- đánh đổi có chủ đích:
    chấp nhận rủi ro dò tài khoản (account enumeration) để đổi lấy thông
    báo dễ hiểu hơn cho người dùng thật (quyết định sản phẩm, không phải
    sơ suất bảo mật). """
    permission_classes = []

    def post(self, request):
        identifier = request.data.get('identifier')
        if not identifier:
            return Response(
                {"error": "Vui lòng nhập tên đăng nhập hoặc email!", "error_code": "missing_identifier"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = Staff.objects.filter(
            models.Q(username=identifier) | models.Q(email__iexact=identifier)
        ).first()

        if not user or not user.email:
            return Response(
                {"error": "Không tìm thấy tài khoản với tên đăng nhập hoặc email này.", "error_code": "account_not_found"},
                status=status.HTTP_404_NOT_FOUND
            )

        otp_record, _ = OTPRecord.objects.get_or_create(user=user)
        otp = otp_record.generate_otp()
        cache.delete(f"password_reset_attempts_{user.username}")
        send_mail(
            subject='[Smart Procurement] Mã OTP Đặt Lại Mật Khẩu',
            message=f'Mã xác thực OTP của bạn là: {otp}. Mã có hiệu lực trong 5 phút.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response({
            "message": "Một mã OTP đã được gửi tới email đã đăng ký.",
        }, status=status.HTTP_200_OK)


class PasswordResetVerifyOTPView(APIView):
    """ Bước 2: Nhập OTP + mật khẩu mới -> Đặt lại mật khẩu """
    permission_classes = []

    def post(self, request):
        identifier = request.data.get('identifier')
        otp_code = request.data.get('otp')
        new_password = request.data.get('new_password')

        if not identifier or not otp_code or not new_password:
            return Response(
                {"error": "Vui lòng nhập đầy đủ thông tin!", "error_code": "otp_missing"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = Staff.objects.filter(
            models.Q(username=identifier) | models.Q(email__iexact=identifier)
        ).first()
        if not user:
            return Response(
                {"error": "Yêu cầu không hợp lệ!", "error_code": "invalid_request"},
                status=status.HTTP_400_BAD_REQUEST
            )

        attempts_key = f"password_reset_attempts_{user.username}"
        attempts = cache.get(attempts_key, 0)
        if attempts >= 5:
            return Response(
                {"error": "Nhập sai mã OTP quá nhiều lần. Vui lòng gửi lại mã mới.", "error_code": "otp_locked"},
                status=status.HTTP_403_FORBIDDEN
            )

        otp_record = getattr(user, 'otp_record', None)
        if not otp_record or otp_record.otp != str(otp_code) or not otp_record.is_valid():
            cache.set(attempts_key, attempts + 1, timeout=300)
            return Response(
                {"error": "Mã OTP không chính xác hoặc đã hết hạn!", "error_code": "otp_invalid"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response({"password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        otp_record.otp = 'USED'
        otp_record.save()
        cache.delete(attempts_key)

        return Response(
            {"message": "Mật khẩu đã được đặt lại. Vui lòng đăng nhập."},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Đăng xuất thành công!"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({"detail": "Token không hợp lệ hoặc đã bị hủy."}, status=status.HTTP_400_BAD_REQUEST)

class BestWorstSellerView(APIView):
    """ Task SCRUM-125: Thống kê sản phẩm bán chạy và bán ế nhất """
    permission_classes = [IsChainManager | IsStoreManager]

    def get(self, request):
        limit = int(request.query_params.get('limit', 5))
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Lọc các đơn hàng đã hoàn thành
        queryset = Order.objects.filter(status__iexact='Completed')

        # Thêm phần lọc theo khoảng thời gian (date ranges) nếu có truyền lên
        if start_date:
            queryset = queryset.filter(order_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(order_date__lte=end_date)
        # Gom nhóm tổng số lượng bán ra của từng sản phẩm từ OrderDetail
        product_sales = OrderDetail.objects.values(
            'product__product_id', 
            'product__product_name', 
            'product__barcode'
        ).annotate(
            total_sold=Sum('quantity')
        )

        # Sắp xếp giảm dần -> Bán chạy nhất
        best_sellers = product_sales.order_by('-total_sold')[:limit]
        # Sắp xếp tăng dần -> Bán ế nhất
        worst_sellers = product_sales.order_by('total_sold')[:limit]

        return Response({
            "best_sellers": list(best_sellers),
            "worst_sellers": list(worst_sellers)
        }, status=status.HTTP_200_OK)


PO_LINE_COST = models.ExpressionWrapper(models.F('order_qty') * models.F('unit_cost'), output_field=models.DecimalField(max_digits=12, decimal_places=2))


class RevenueTrendView(APIView):
    """Time-bucketed revenue (income) and order-supply cost (expenses) for the
    Analytics/Store dashboards. `store` omitted means chain-wide, matching
    BestWorstSellerView's no-filter-means-everything convention -- applies to both
    series. Historical PurchaseOrder rows created before PO-per-branch existed have
    store=None, so they only ever appear in the chain-wide (no ?store=) totals."""
    permission_classes = [IsChainManager | IsStoreManager]

    def get(self, request):
        period = request.query_params.get('period', 'week')
        if period not in ('week', 'month', 'quarter'):
            return Response({"detail": "period must be one of: week, month, quarter."}, status=status.HTTP_400_BAD_REQUEST)

        store_id = request.query_params.get('store')
        queryset = Order.objects.filter(status__iexact='Completed')
        if store_id:
            queryset = queryset.filter(store_id=store_id)

        today = timezone.localdate()

        if period == 'quarter':
            month_starts = []
            cursor = today.replace(day=1)
            for _ in range(3):
                month_starts.append(cursor)
                cursor = (cursor - timedelta(days=1)).replace(day=1)
            month_starts.reverse()

            rows = (
                queryset.filter(order_date__date__gte=month_starts[0])
                .annotate(bucket=TruncMonth('order_date', output_field=models.DateField()))
                .values('bucket')
                .annotate(total=Sum('total_amount'), order_count=models.Count('order_id'))
            )
            by_bucket = {row['bucket']: row for row in rows}

            expense_qs = PurchaseOrderDetail.objects.filter(po__order_date__gte=month_starts[0])
            if store_id:
                expense_qs = expense_qs.filter(po__store_id=store_id)
            expense_rows = (
                expense_qs
                .annotate(bucket=TruncMonth('po__order_date', output_field=models.DateField()))
                .values('bucket')
                .annotate(total=Sum(PO_LINE_COST))
            )
            expense_by_bucket = {row['bucket']: row['total'] for row in expense_rows}

            points = [
                {
                    "label": d.strftime('%b'),
                    "date": d.isoformat(),
                    "total": str(by_bucket[d]['total']) if d in by_bucket else '0.00',
                    "order_count": by_bucket[d]['order_count'] if d in by_bucket else 0,
                    "expense_total": str(expense_by_bucket[d]) if d in expense_by_bucket else '0.00',
                }
                for d in month_starts
            ]
            prev_cursor = month_starts[0]
            for _ in range(3):
                prev_cursor = (prev_cursor - timedelta(days=1)).replace(day=1)
            prev_start = prev_cursor
            prev_end = month_starts[0] - timedelta(days=1)
        else:
            range_start = today - timedelta(days=6) if period == 'week' else today.replace(day=1)
            days = [range_start + timedelta(days=i) for i in range((today - range_start).days + 1)]

            rows = (
                queryset.filter(order_date__date__gte=range_start)
                .annotate(bucket=TruncDate('order_date'))
                .values('bucket')
                .annotate(total=Sum('total_amount'), order_count=models.Count('order_id'))
            )
            by_bucket = {row['bucket']: row for row in rows}

            expense_qs = PurchaseOrderDetail.objects.filter(po__order_date__gte=range_start)
            if store_id:
                expense_qs = expense_qs.filter(po__store_id=store_id)
            expense_rows = (
                expense_qs
                .annotate(bucket=TruncDate('po__order_date'))
                .values('bucket')
                .annotate(total=Sum(PO_LINE_COST))
            )
            expense_by_bucket = {row['bucket']: row['total'] for row in expense_rows}

            points = [
                {
                    "label": d.strftime('%a') if period == 'week' else str(d.day),
                    "date": d.isoformat(),
                    "total": str(by_bucket[d]['total']) if d in by_bucket else '0.00',
                    "order_count": by_bucket[d]['order_count'] if d in by_bucket else 0,
                    "expense_total": str(expense_by_bucket[d]) if d in expense_by_bucket else '0.00',
                }
                for d in days
            ]
            if period == 'week':
                prev_start = range_start - timedelta(days=7)
                prev_end = range_start - timedelta(days=1)
            else:
                last_day_prev_month = range_start - timedelta(days=1)
                prev_start = last_day_prev_month.replace(day=1)
                prev_end = prev_start + timedelta(days=min(today.day, last_day_prev_month.day) - 1)

        previous_total = queryset.filter(
            order_date__date__gte=prev_start, order_date__date__lte=prev_end
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        prev_expense_qs = PurchaseOrderDetail.objects.filter(po__order_date__gte=prev_start, po__order_date__lte=prev_end)
        if store_id:
            prev_expense_qs = prev_expense_qs.filter(po__store_id=store_id)
        previous_expense_total = prev_expense_qs.aggregate(total=Sum(PO_LINE_COST))['total'] or 0

        return Response({
            "period": period,
            "store": int(store_id) if store_id else None,
            "points": points,
            "previous_total": str(previous_total),
            "previous_expense_total": str(previous_expense_total),
        }, status=status.HTTP_200_OK)


def _period_range_start(period, today):
    """Start date of `period` ending today: last 7 days for 'week', current
    calendar month for 'month', current + prior 2 calendar months for
    'quarter'. Shared by every report view that only needs a cutoff date
    (not day/month buckets like RevenueTrendView)."""
    if period == 'quarter':
        cursor = today.replace(day=1)
        for _ in range(2):
            cursor = (cursor - timedelta(days=1)).replace(day=1)
        return cursor
    if period == 'week':
        return today - timedelta(days=6)
    return today.replace(day=1)


class SalesByCategoryView(APIView):
    """Revenue by product category for the Store dashboard's "Sale by Category" panel,
    replacing the old funnel mock. Same store/period convention as RevenueTrendView."""
    permission_classes = [IsChainManager | IsStoreManager]

    def get(self, request):
        period = request.query_params.get('period', 'week')
        if period not in ('week', 'month', 'quarter'):
            return Response({"detail": "period must be one of: week, month, quarter."}, status=status.HTTP_400_BAD_REQUEST)

        store_id = request.query_params.get('store')
        range_start = _period_range_start(period, timezone.localdate())

        queryset = OrderDetail.objects.filter(order__status__iexact='Completed', order__order_date__date__gte=range_start)
        if store_id:
            queryset = queryset.filter(order__store_id=store_id)

        rows = (
            queryset.values('product__category__category_name')
            .annotate(total=Sum('sub_total'))
            .order_by('-total')
        )

        return Response({
            "period": period,
            "store": int(store_id) if store_id else None,
            "categories": [
                {"category": row['product__category__category_name'] or 'Uncategorized', "total": str(row['total'])}
                for row in rows
            ],
        }, status=status.HTTP_200_OK)


class RevenueByChannelView(APIView):
    """Revenue grouped by sales channel (Order.order_type: POS, GrabMart, ShopeeFood,
    BeMart, Lazada) for the Store dashboard's "Revenue Sources" panel, replacing the
    old CHANNEL_REVENUE mock. Same store/period convention as RevenueTrendView."""
    permission_classes = [IsChainManager | IsStoreManager]

    def get(self, request):
        period = request.query_params.get('period', 'week')
        if period not in ('week', 'month', 'quarter'):
            return Response({"detail": "period must be one of: week, month, quarter."}, status=status.HTTP_400_BAD_REQUEST)

        store_id = request.query_params.get('store')
        range_start = _period_range_start(period, timezone.localdate())

        queryset = Order.objects.filter(status__iexact='Completed', order_date__date__gte=range_start)
        if store_id:
            queryset = queryset.filter(store_id=store_id)

        rows = queryset.values('order_type').annotate(total=Sum('total_amount')).order_by('-total')

        return Response({
            "period": period,
            "store": int(store_id) if store_id else None,
            "channels": [{"channel": row['order_type'], "total": str(row['total'])} for row in rows],
        }, status=status.HTTP_200_OK)


class PeakHoursView(APIView):
    """Order count by hour-of-day, current period vs. the immediately preceding
    equivalent period, for the Store dashboard's "Peak Hours" panel, replacing the
    old PEAK_HOURS/PEAK_HOURS_PREVIOUS_FACTOR mock. Same store/period convention as
    RevenueTrendView. There's no foot-traffic tracking in this system, so "visits"
    is approximated as completed order count."""
    permission_classes = [IsChainManager | IsStoreManager]

    def get(self, request):
        period = request.query_params.get('period', 'week')
        if period not in ('week', 'month', 'quarter'):
            return Response({"detail": "period must be one of: week, month, quarter."}, status=status.HTTP_400_BAD_REQUEST)

        store_id = request.query_params.get('store')
        today = timezone.localdate()
        range_start = _period_range_start(period, today)
        window = (today - range_start).days + 1
        previous_start = range_start - timedelta(days=window)

        queryset = Order.objects.filter(status__iexact='Completed', order_date__date__gte=previous_start)
        if store_id:
            queryset = queryset.filter(store_id=store_id)

        rows = (
            queryset.annotate(hour=ExtractHour('order_date'), is_current=models.Case(
                models.When(order_date__date__gte=range_start, then=True), default=False, output_field=models.BooleanField(),
            ))
            .values('hour', 'is_current')
            .annotate(n=models.Count('order_id'))
        )
        current_by_hour = {row['hour']: row['n'] for row in rows if row['is_current']}
        previous_by_hour = {row['hour']: row['n'] for row in rows if not row['is_current']}

        return Response({
            "period": period,
            "store": int(store_id) if store_id else None,
            "points": [
                {"hour": h, "current": current_by_hour.get(h, 0), "previous": previous_by_hour.get(h, 0)}
                for h in range(24)
            ],
        }, status=status.HTTP_200_OK)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsStoreManager | IsChainManager]


class DiscountViewSet(viewsets.ModelViewSet):
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsCashier()]
        return [(IsStoreManager | IsChainManager)()]

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product')
        is_active = self.request.query_params.get('is_active')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() in ('true', '1'))
        return queryset


class BusinessProfileView(APIView):
    """Singleton chain-wide business profile (Settings > Store) -- always reads/writes pk=1."""
    permission_classes = [IsStoreManager | IsChainManager]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [(IsStoreManager | IsChainManager)()]
        return [IsChainManager()]

    def get(self, request):
        profile, _ = BusinessProfile.objects.get_or_create(pk=1)
        return Response(BusinessProfileSerializer(profile).data)

    def put(self, request):
        profile, _ = BusinessProfile.objects.get_or_create(pk=1)
        serializer = BusinessProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PaymentMethodSettingViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethodSetting.objects.all()
    serializer_class = PaymentMethodSettingSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [(IsStoreManager | IsChainManager)()]
        return [IsChainManager()]


class MarketplaceChannelSettingViewSet(viewsets.ModelViewSet):
    queryset = MarketplaceChannelSetting.objects.all()
    serializer_class = MarketplaceChannelSettingSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [(IsStoreManager | IsChainManager)()]
        return [IsChainManager()]


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ Mỗi staff chỉ thấy thông báo của chính mình (recipient=request.user)
    -- ai được nhận thông báo nào quyết định lúc tạo (xem
    core/checkout.py::_notify_payment_success, gọi từ create_pos_order cho
    cả Cash lẫn Bank QR), không phải ở đây. """
    serializer_class = NotificationSerializer
    permission_classes = [IsCashier]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related('order')

    @action(detail=True, methods=['patch'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"message": "ok"})