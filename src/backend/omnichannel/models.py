from django.db import models


class LazadaCredential(models.Model):
    """OAuth grant for a connected Lazada Open Platform seller account
    (sandbox or production). Deliberately a single row per environment —
    one Lazada seller account is connected at a time, mapped to one Store
    for order-sync purposes (Lazada has no concept of this chain's
    multi-branch Store split)."""
    store = models.ForeignKey('core.Store', on_delete=models.PROTECT, related_name='lazada_credential')
    account = models.CharField(max_length=255, blank=True)  # seller account/email, for display only
    access_token = models.CharField(max_length=512)
    refresh_token = models.CharField(max_length=512)
    access_token_expires_at = models.DateTimeField()
    refresh_token_expires_at = models.DateTimeField()
    last_synced_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Lazada credential ({self.account or 'unnamed'}) -> {self.store.store_name}"


class LazadaProductPush(models.Model):
    """Latest known Lazada listing state for one Product, as reported by
    Lazada's inbound Message Push notifications (POSTed to this app's OAuth
    callback URL -- see LazadaCallbackView._handle_lazada_push). Lets the
    rest of the app read the last-known status/quantity without polling
    Lazada's API. status/last_quantity are only populated for the push
    message_types actually observed so far (3 = product status change,
    6 = inventory change) -- both are optional/blank until a push updates
    them."""
    product = models.OneToOneField('core.Product', on_delete=models.CASCADE, related_name='lazada_push_status')
    item_id = models.CharField(max_length=50, blank=True)
    sku_id = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=50, blank=True)  # e.g. "PUBLISHED" (message_type=3's `action`)
    last_quantity = models.IntegerField(null=True, blank=True)  # message_type=6's `real_quantity`
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Lazada push status for {self.product.product_name}"
