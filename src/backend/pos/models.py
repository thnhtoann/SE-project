from django.db import models

from core.models import Order, Shift, Staff, Store


class QrPaymentIntent(models.Model):
    """ Một lượt thanh toán VietQR qua PayOS cho giỏ hàng POS. Tách khỏi
    core.Order có chủ đích: Order (và trừ kho theo nó) chỉ được tạo khi
    PayOSWebhookView xác nhận đã thanh toán thật -- một mã QR bị bỏ dở
    (khách không quét) sẽ không bao giờ giữ hàng tồn kho. Xem
    pos/views.py::CreateQrPaymentView / PayOSWebhookView. """

    STATUS_PENDING = 'Pending'
    STATUS_PAID = 'Paid'
    STATUS_CANCELLED = 'Cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PAID, 'Paid'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    order_code = models.BigIntegerField(unique=True)
    store = models.ForeignKey(Store, on_delete=models.PROTECT)
    shift = models.ForeignKey(Shift, on_delete=models.PROTECT)
    staff = models.ForeignKey(Staff, on_delete=models.PROTECT)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    # [{"product": <product_id>, "quantity": int, "unit_price": "12345.00"}, ...] --
    # captured at intent-creation time so the webhook (which has no request
    # body of its own) can still build the real Order once payment lands.
    cart_snapshot = models.JSONField()
    amount = models.PositiveIntegerField()  # VND has no minor unit
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    checkout_url = models.URLField(max_length=500, blank=True)
    qr_code = models.TextField(blank=True)
    payos_payment_link_id = models.CharField(max_length=100, blank=True)
    order = models.OneToOneField(Order, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"QrPaymentIntent {self.order_code} ({self.status})"
