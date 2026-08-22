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
