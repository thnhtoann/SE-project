from django.contrib import admin

from .models import QrPaymentIntent


@admin.register(QrPaymentIntent)
class QrPaymentIntentAdmin(admin.ModelAdmin):
    list_display = ('order_code', 'status', 'amount', 'store', 'created_at', 'paid_at')
    list_filter = ('status', 'store')
    search_fields = ('order_code',)
