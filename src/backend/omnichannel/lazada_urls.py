from django.urls import path

from .lazada import (
    LazadaAuthorizeView, LazadaCallbackView, LazadaManualConnectView, LazadaProductsView, LazadaStatusView,
    LazadaSyncOrdersView,
)

urlpatterns = [
    path('authorize/', LazadaAuthorizeView.as_view(), name='lazada-authorize'),
    path('callback/', LazadaCallbackView.as_view(), name='lazada-callback'),
    path('manual-connect/', LazadaManualConnectView.as_view(), name='lazada-manual-connect'),
    path('products/', LazadaProductsView.as_view(), name='lazada-products'),
    path('status/', LazadaStatusView.as_view(), name='lazada-status'),
    path('sync/', LazadaSyncOrdersView.as_view(), name='lazada-sync'),
]
