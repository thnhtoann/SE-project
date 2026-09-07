from django.urls import path
from .views import (
    AddItemView,
    CheckoutView,
    CreateOrderView,
    CreateQrPaymentView,
    DiscountSettingView,
    GetOrderView,
    HealthCheckView,
    PayOSWebhookView,
    PaymentWebhookView,
    ProductPriceView,
    QrPaymentStatusView,
    RemoveItemView,
    SalesAnalyticsView,
)

urlpatterns = [
    path("", HealthCheckView.as_view(), name="pos-health"),

    path(
        "orders/create/",
        CreateOrderView.as_view(),
        name="create-order",
    ),

    path(
        "orders/<int:order_id>/add-item/",
        AddItemView.as_view(),
        name="add-item",
    ),

    path(
        "orders/<int:order_id>/remove-item/",
        RemoveItemView.as_view(),
        name="remove-item",
    ),

    path(
        "orders/<int:order_id>/checkout/",
        CheckoutView.as_view(),
        name="checkout",
    ),

    path(
        "orders/<int:order_id>/",
        GetOrderView.as_view(),
        name="get-order",
    ),

    path(
        "products/<int:product_id>/price/",
        ProductPriceView.as_view(),
        name="product-price",
    ),

    path(
        "webhooks/payment/",
        PaymentWebhookView.as_view(),
        name="payment-webhook",
    ),

    path(
        "analytics/sales/",
        SalesAnalyticsView.as_view(),
        name="sales-analytics",
    ),

    path(
        "discount-settings/",
        DiscountSettingView.as_view(),
        name="discount-settings",
    ),

    path("qr-payments/", CreateQrPaymentView.as_view(), name="pos-qr-payment-create"),
    path("qr-payments/<int:order_code>/", QrPaymentStatusView.as_view(), name="pos-qr-payment-status"),
    path("webhooks/payos/", PayOSWebhookView.as_view(), name="pos-payos-webhook"),
]
