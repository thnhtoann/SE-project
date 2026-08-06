from django.urls import path

from .views import (
    CreateOrderView,
    AddItemView,
    RemoveItemView,
    GetOrderView,
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
    "orders/<int:order_id>/",
    GetOrderView.as_view(),
    name="get-order",
    ),
]