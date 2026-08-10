from django.urls import path

from .views import HealthCheckView, SupplierDetailView, SupplierListCreateView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('suppliers/', SupplierListCreateView.as_view(), name='supplier-list'),
    path('suppliers/<int:pk>/', SupplierDetailView.as_view(), name='supplier-detail'),
]
