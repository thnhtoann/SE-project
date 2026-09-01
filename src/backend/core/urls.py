from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    HealthCheckView, SupplierDetailView, SupplierListCreateView,
    RoleViewSet, StoreViewSet, StaffViewSet,
    StaffReviewViewSet, StaffDocumentViewSet, StaffCertificateViewSet,
    PurchaseOrderViewSet, PurchaseOrderDetailViewSet, ShipmentViewSet, LowStockAlertViewSet, CategoryViewSet,
    ProductViewSet, BatchViewSet, StoreInventoryViewSet,
    OrderViewSet, OrderDetailViewSet, BestWorstSellerView, ShiftViewSet,
)

router = DefaultRouter()
router.register(r'roles', RoleViewSet)
router.register(r'stores', StoreViewSet)
router.register(r'staff', StaffViewSet)
router.register(r'staff-reviews', StaffReviewViewSet)
router.register(r'staff-documents', StaffDocumentViewSet)
router.register(r'staff-certificates', StaffCertificateViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'purchase-order-details', PurchaseOrderDetailViewSet)
router.register(r'shipments', ShipmentViewSet, basename='shipment')
router.register(r'inventory/low-stock-alerts', LowStockAlertViewSet, basename='inventory-low-stock-alert')
router.register(r'low-stock-alerts', LowStockAlertViewSet, basename='low-stock-alert')
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'batches', BatchViewSet)
router.register(r'store-inventories', StoreInventoryViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'order-details', OrderDetailViewSet)
router.register(r'shifts', ShiftViewSet)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('suppliers/', SupplierListCreateView.as_view(), name='supplier-list'),
    path('suppliers/<int:pk>/', SupplierDetailView.as_view(), name='supplier-detail'),
    path('', include(router.urls)),
    path('api/statistics/best-worst-sellers/', BestWorstSellerView.as_view(), name='best-worst-sellers'),
]
