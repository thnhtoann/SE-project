from django.urls import path
from .views import CreateQrPaymentView, HealthCheckView, PayOSWebhookView, QrPaymentStatusView

urlpatterns = [
    path("", HealthCheckView.as_view(), name="pos-health"),
    path("qr-payments/", CreateQrPaymentView.as_view(), name="pos-qr-payment-create"),
    path("qr-payments/<int:order_code>/", QrPaymentStatusView.as_view(), name="pos-qr-payment-status"),
    path("webhooks/payos/", PayOSWebhookView.as_view(), name="pos-payos-webhook"),
]
