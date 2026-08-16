from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    HealthCheckView, SupplierDetailView, SupplierListCreateView,
    RoleViewSet, StoreViewSet, StaffViewSet,
    PurchaseOrderViewSet, PurchaseOrderDetailViewSet, CategoryViewSet,
    ProductViewSet, BatchViewSet, StoreInventoryViewSet,
    OrderViewSet, OrderDetailViewSet, BestWorstSellerView,
)

router = DefaultRouter()
router.register(r'roles', RoleViewSet)
router.register(r'stores', StoreViewSet)
router.register(r'staff', StaffViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'purchase-order-details', PurchaseOrderDetailViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'batches', BatchViewSet)
router.register(r'store-inventories', StoreInventoryViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'order-details', OrderDetailViewSet)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('suppliers/', SupplierListCreateView.as_view(), name='supplier-list'),
    path('suppliers/<int:pk>/', SupplierDetailView.as_view(), name='supplier-detail'),
    path('', include(router.urls)),
    path('api/statistics/best-worst-sellers/', BestWorstSellerView.as_view(), name='best-worst-sellers'),
]
