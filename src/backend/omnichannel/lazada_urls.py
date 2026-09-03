from django.urls import path

from .lazada import (
    LazadaAuthorizeView, LazadaCallbackView, LazadaCategoryTreeView, LazadaCreateProductView,
    LazadaImportProductsView, LazadaManualConnectView, LazadaProductsView, LazadaStatusView, LazadaSyncOrdersView,
)

urlpatterns = [
    path('authorize/', LazadaAuthorizeView.as_view(), name='lazada-authorize'),
    path('callback/', LazadaCallbackView.as_view(), name='lazada-callback'),
    path('manual-connect/', LazadaManualConnectView.as_view(), name='lazada-manual-connect'),
    path('categories/', LazadaCategoryTreeView.as_view(), name='lazada-category-tree'),
    path('products/', LazadaProductsView.as_view(), name='lazada-products'),
    path('create-product/', LazadaCreateProductView.as_view(), name='lazada-create-product'),
    path('import-products/', LazadaImportProductsView.as_view(), name='lazada-import-products'),
    path('status/', LazadaStatusView.as_view(), name='lazada-status'),
    path('sync/', LazadaSyncOrdersView.as_view(), name='lazada-sync'),
]
