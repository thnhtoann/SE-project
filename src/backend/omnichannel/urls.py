from django.urls import path

from .views import GrabMartWebhookView, ShopeeFoodWebhookView, BeMartWebhookView

urlpatterns = [
    path('grabmart/', GrabMartWebhookView.as_view(), name='webhook-grabmart'),
    path('shopeefood/', ShopeeFoodWebhookView.as_view(), name='webhook-shopeefood'),
    path('bemart/', BeMartWebhookView.as_view(), name='webhook-bemart'),
]