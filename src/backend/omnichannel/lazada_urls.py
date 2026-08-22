from django.urls import path

from .lazada import LazadaAuthorizeView, LazadaCallbackView, LazadaStatusView, LazadaSyncOrdersView

urlpatterns = [
    path('authorize/', LazadaAuthorizeView.as_view(), name='lazada-authorize'),
    path('callback/', LazadaCallbackView.as_view(), name='lazada-callback'),
    path('status/', LazadaStatusView.as_view(), name='lazada-status'),
    path('sync/', LazadaSyncOrdersView.as_view(), name='lazada-sync'),
]
