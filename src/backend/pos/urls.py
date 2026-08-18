from django.urls import path
from .views import (
    CreateOrderView,
    AddItemView,
    RemoveItemView,
    CheckoutView,
    GetOrderView,
    ProductPriceView,
    PaymentWebhookView,
    SalesAnalyticsView,
)

urlpatterns = [
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
]