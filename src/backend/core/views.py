from django.core.cache import cache
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Role, Store, Staff, Supplier, PurchaseOrder, PurchaseOrderDetail,
    Category, Product, Batch, StoreInventory, Order, OrderDetail
)
from .permissions import IsCashier, IsChainManager, IsStoreManager
from .serializers import (
    RoleSerializer, StoreSerializer, StaffSerializer, SupplierSerializer,
    PurchaseOrderSerializer, PurchaseOrderDetailSerializer, CategorySerializer,
    ProductSerializer, BatchSerializer, StoreInventorySerializer,
    OrderSerializer, OrderDetailSerializer
)


class HealthCheckView(APIView):
    def get(self, request):
        return Response({'status': 'ok'})


class SupplierListCreateView(APIView):
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
    permission_classes = [IsChainManager]


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsStoreManager | IsChainManager]


class PurchaseOrderDetailViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderDetail.objects.all()
    serializer_class = PurchaseOrderDetailSerializer
    permission_classes = [IsStoreManager | IsChainManager]


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


class OrderDetailViewSet(viewsets.ModelViewSet):
    queryset = OrderDetail.objects.all()
    serializer_class = OrderDetailSerializer
    permission_classes = [IsCashier | IsStoreManager | IsChainManager]

    # Ghi đè hàm perform_create để xử lý logic khi có 1 đơn hàng mới được tạo
    def perform_create(self, serializer):
        # Dùng transaction.atomic() để đảm bảo toàn vẹn ACID.
        # Nếu trừ kho bị lỗi giữa chừng, toàn bộ giao dịch sẽ bị hủy (Rollback).
        with transaction.atomic():
            # 1. Lấy thông tin từ request khách gửi lên
            order = serializer.validated_data['order']
            product = serializer.validated_data['product']
            sell_qty = serializer.validated_data['quantity']
            store = order.store

            # 2. Lấy danh sách tồn kho của sản phẩm này tại cửa hàng đó,
            # chỉ lấy lô còn hàng (>0) và SẮP XẾP theo ngày hết hạn tăng dần (Cận date bán trước)
            inventories = StoreInventory.objects.filter(
                store=store,
                batch__product=product,
                quantity__gt=0
            ).order_by('batch__expiration_date')

            # 3. Tính tổng tồn kho xem có đủ để bán không
            total_stock = sum(inv.quantity for inv in inventories)
            if total_stock < sell_qty:
                raise ValidationError({
                    "detail": f"Không đủ hàng! Cửa hàng chỉ còn tồn {total_stock} sản phẩm."
                })

            # 4. Bắt đầu thuật toán trừ kho dần (Trừ lô cận date nhất trước)
            remaining_to_deduct = sell_qty
            for inv in inventories:
                if remaining_to_deduct <= 0:
                    break # Đã trừ đủ số lượng khách mua

                if inv.quantity >= remaining_to_deduct:
                    # Nếu lô này đủ hàng để trừ
                    inv.quantity -= remaining_to_deduct
                    inv.save()
                    remaining_to_deduct = 0
                else:
                    # Nếu lô này không đủ hàng, lấy sạch lô này và đi qua lô tiếp theo
                    remaining_to_deduct -= inv.quantity
                    inv.quantity = 0
                    inv.save()

            # 5. Lưu OrderDetail vào Database sau khi trừ kho thành công
            serializer.save()


class CustomLoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Lấy tên tài khoản người dùng đang cố đăng nhập
        username = attrs.get(self.username_field)

        # Tạo một "hộp lưu trữ" trong bộ nhớ tạm để đếm số lần sai của riêng user này
        cache_key = f"login_attempts_{username}"
        attempts = cache.get(cache_key, 0)

        # 1. Kiểm tra xem user này đã bị khóa chưa (nhập sai >= 3 lần)
        if attempts >= 3:
            raise ValidationError(
                {"detail": "Tài khoản đã bị khóa do nhập sai quá 3 lần. Vui lòng thử lại sau 15 phút."}
            )

        # 2. Thử xác thực tài khoản & mật khẩu
        try:
            # Gọi hàm gốc của JWT để kiểm tra
            data = super().validate(attrs)

            # Nếu mật khẩu ĐÚNG -> Xóa sổ nợ, reset số lần sai về 0
            cache.delete(cache_key)
            return data

        except Exception:
            # Nếu mật khẩu SAI -> Tăng số lần sai lên 1
            attempts += 1
            # Lưu lại vào Cache. Thiết lập timeout=900 (tương đương 15 phút).
            # Sau 15 phút, Django sẽ tự động xóa bản ghi này để mở khóa.
            cache.set(cache_key, attempts, timeout=900)

            raise ValidationError(
                {"detail": f"Sai thông tin đăng nhập! Bạn còn {3 - attempts} lần thử."}
            )


# Tạo một View mới sử dụng Serializer vừa "độ" ở trên
class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomLoginSerializer


class LogoutView(APIView):
    # Phải có token (đã đăng nhập) thì mới được đăng xuất
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Client sẽ gửi cái refresh token lên đây
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)

            # Đưa token này vào sổ đen
            token.blacklist()

            return Response({"detail": "Đăng xuất thành công!"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({"detail": "Token không hợp lệ hoặc đã bị hủy."}, status=status.HTTP_400_BAD_REQUEST)
