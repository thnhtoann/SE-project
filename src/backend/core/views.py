from django.core.cache import cache
from django.db import models, transaction
from django.core.mail import send_mail
from django.contrib.auth import authenticate
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum, F, DecimalField
from rest_framework.exceptions import PermissionDenied
# Import Models & Serializers
from .models import (
    Role, Store, Staff, Supplier, PurchaseOrder, PurchaseOrderDetail,
    Category, Product, Batch, StoreInventory, Order, OrderDetail, OTPRecord, InventoryAlert
)
from .serializers import (
    RoleSerializer, StoreSerializer, StaffSerializer, SupplierSerializer,
    PurchaseOrderSerializer, PurchaseOrderDetailSerializer, ShipmentSerializer, CategorySerializer,
    ProductSerializer, BatchSerializer, StoreInventorySerializer,
    OrderSerializer, OrderDetailSerializer, InventoryAlertSerializer
)
from .permissions import IsCashier, IsChainManager, IsStoreManager, IsChainManagerOrStoreManagerForStaff


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
    permission_classes = [IsChainManager]


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        current_role = user.role.role_name if user.role else ""

        # Các tên role quản lý/admin hợp lệ có trong DB của bạn
        allowed_manager_roles = ['Admin', 'Chain Manager', 'ChainManager', 'Store Manager', 'StoreManager']

        if current_role not in allowed_manager_roles:
            raise PermissionDenied(f"Tài khoản của bạn (Vai trò: {current_role}) không có quyền tạo tài khoản.")

        # Lấy tên role của tài khoản sắp được tạo
        target_role_instance = serializer.validated_data.get('role')
        target_role_name = target_role_instance.role_name if target_role_instance else ""

        # Nếu người thực hiện là Store Manager (bất kể kiểu có dấu cách hay dán liền) -> Chỉ được tạo Staff
        if current_role in ['Store Manager', 'StoreManager']:
            if target_role_name not in ['Cashier', 'Staff']:
                raise ValidationError({"role": "Store Manager chỉ được phép đăng ký tài khoản cho nhân viên (Cashier/Staff)."})

        serializer.save()

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

        return queryset

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
        Executes optimal JOIN query filtering active inventory (quantity > 0)
        grouped by (store, product). Compares against MinThreshold.
        Also handles zero-stock products per store.
        """
        products = Product.objects.all()
        stores = Store.objects.all()
        if store_id:
            stores = stores.filter(pk=store_id)

        for store in stores:
            for product in products:
                total_stock = StoreInventory.objects.filter(
                    store=store,
                    batch__product=product
                ).aggregate(total=models.Sum('quantity'))['total'] or 0

                if product.is_low_stock(total_stock):
                    alert, created = InventoryAlert.objects.get_or_create(
                        product=product,
                        store=store,
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
        store_id = self.request.query_params.get('store') or self.request.query_params.get('store_id')
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
    permission_classes = [IsStoreManager | IsChainManager]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsStoreManager | IsChainManager]


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    permission_classes = [IsStoreManager | IsChainManager]


class StoreInventoryViewSet(viewsets.ModelViewSet):
    queryset = StoreInventory.objects.all()
    serializer_class = StoreInventorySerializer
    permission_classes = [IsStoreManager | IsChainManager]


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsCashier | IsStoreManager | IsChainManager]

    def get_queryset(self):
        queryset = Order.objects.all().order_by('-order_date')
        channel = self.request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(order_type=channel)
        return queryset


class OrderDetailViewSet(viewsets.ModelViewSet):
    queryset = OrderDetail.objects.all()
    serializer_class = OrderDetailSerializer
    permission_classes = [IsCashier | IsStoreManager | IsChainManager]

    def perform_create(self, serializer):
        with transaction.atomic():
            order = serializer.validated_data['order']
            product = serializer.validated_data['product']
            sell_qty = serializer.validated_data['quantity']
            store = order.store

            inventories = StoreInventory.objects.filter(
                store=store,
                batch__product=product,
                quantity__gt=0
            ).order_by('batch__expiration_date')

            total_stock = sum(inv.quantity for inv in inventories)
            if total_stock < sell_qty:
                raise ValidationError({
                    "detail": f"Không đủ hàng! Cửa hàng chỉ còn tồn {total_stock} sản phẩm."
                })

            remaining_to_deduct = sell_qty
            for inv in inventories:
                if remaining_to_deduct <= 0:
                    break

                if inv.quantity >= remaining_to_deduct:
                    inv.quantity -= remaining_to_deduct
                    inv.save()
                    remaining_to_deduct = 0
                else:
                    remaining_to_deduct -= inv.quantity
                    inv.quantity = 0
                    inv.save()

            serializer.save()


# ==========================================
# CÁC VIEW XỬ LÝ AUTHENTICATION 2FA (OTP -> JWT)
# ==========================================

class LoginRequestOTPView(APIView):
    """ Bước 1: Nhập User/Pass/Email -> Kiểm tra 3 lần sai -> Nhận OTP qua Email """
    permission_classes = []

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')

        # Bắt buộc phải nhập cả 3 trường
        if not username or not password or not email:
            return Response(
                {"error": "Vui lòng nhập đầy đủ username, password và email!"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Kiểm tra xem user này đã bị khóa chưa (nhập sai >= 3 lần)
        cache_key = f"login_attempts_{username}"
        attempts = cache.get(cache_key, 0)

        if attempts >= 3:
            return Response(
                {"error": "Tài khoản đã bị khóa do nhập sai quá 3 lần. Vui lòng thử lại sau 15 phút."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. Xác thực tài khoản
        user = authenticate(username=username, password=password)
        if user:
            # Xóa sổ nợ nếu nhập đúng
            cache.delete(cache_key)

            # Kiểm tra Email có khớp không
            if user.email != email:
                return Response(
                    {"error": "Email không khớp với thông tin tài khoản của bạn!"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Sinh mã OTP
            otp_record, _ = OTPRecord.objects.get_or_create(user=user)
            otp = otp_record.generate_otp()

            # Gửi OTP qua Email
            send_mail(
                subject='[Smart Procurement] Mã OTP Đăng Nhập',
                message=f'Mã xác thực OTP của bạn là: {otp}. Mã có hiệu lực trong 5 phút.',
                from_email='no-reply@smartprocurement.com',
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            return Response({
                "message": "OTP đã được gửi tới email của bạn.", 
                "username": username
            }, status=status.HTTP_200_OK)
            
        # Nếu sai password -> Tăng số lần sai
        attempts += 1
        cache.set(cache_key, attempts, timeout=900)
        return Response(
            {"error": f"Sai thông tin đăng nhập! Bạn còn {3 - attempts} lần thử."}, 
            status=status.HTTP_401_UNAUTHORIZED
        )


class LoginVerifyOTPView(APIView):
    """ Bước 2: Nhập OTP -> Trả về Token JWT """
    permission_classes = []

    def post(self, request):
        username = request.data.get('username')
        otp_code = request.data.get('otp')
        
        if not username or not otp_code:
            return Response({"error": "Vui lòng nhập đầy đủ username và mã OTP!"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = Staff.objects.get(username=username)
            otp_record = user.otp_record
            
            # Kiểm tra OTP đúng và còn hạn
            if otp_record.otp == str(otp_code) and otp_record.is_valid():
                otp_record.otp = 'USED' # Vô hiệu hóa OTP sau khi dùng
                otp_record.save()
                
                # Cấp cặp JWT Token chính thức
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'role': user.role.role_name if user.role else 'None'
                }, status=status.HTTP_200_OK)
                
            return Response({"error": "OTP không chính xác hoặc đã hết hạn!"}, status=status.HTTP_400_BAD_REQUEST)
            
        except (Staff.DoesNotExist, OTPRecord.DoesNotExist):
            return Response({"error": "Yêu cầu không hợp lệ!"}, status=status.HTTP_400_BAD_REQUEST)


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


class SalesPerformanceReportView(APIView):
    """
    API liệt kê hiệu suất bán hàng theo đơn hàng và chi tiết sản phẩm.
    """
    permission_classes = [IsChainManager | IsStoreManager]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Lọc các đơn hàng đã hoàn thành
        orders_queryset = Order.objects.filter(status__iexact='Completed')
        if start_date:
            orders_queryset = orders_queryset.filter(order_date__date__gte=start_date)
        if end_date:
            orders_queryset = orders_queryset.filter(order_date__date__lte=end_date)

        # Lấy dữ liệu chi tiết từ OrderDetail
        details = OrderDetail.objects.filter(order__in=orders_queryset).select_related('product', 'order')

        results = []
        for item in details:
            results.append({
                "date": str(item.order.order_date.date()) if item.order.order_date else None,
                "product_id": item.product.product_id if item.product else None,
                "product_name": item.product.product_name if item.product else "Unknown",
                "barcode": item.product.barcode if item.product else None,
                "units_sold": item.quantity,
                "revenue": float(item.quantity * item.unit_price) if item.quantity and item.unit_price else 0.0
            })

        return Response({
            "total_records": len(results),
            "results": results
        })
