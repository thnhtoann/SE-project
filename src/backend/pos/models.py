from django.db import models

# Create your models here.

from decimal import Decimal
from django.db import models


class DiscountSetting(models.Model):
    near_expiry_days = models.PositiveIntegerField(default=7)
    near_expiry_discount = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal("0.20"),
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Near Expiry Discount Setting"