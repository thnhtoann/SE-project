"""
Dev/demo seed data — seeds the fixed-cardinality PaymentMethodSetting and
MarketplaceChannelSetting rows the Settings > Store page expects to always find
(rather than the frontend needing "create a new payment method" UI for a set that
doesn't really change), plus a single default BusinessProfile row (pk=1, the
singleton BusinessProfileView.get_or_create's default falls back to). Lazada is
deliberately excluded from the channel list -- it already has a real connection
status via LazadaCredential/the Lazada-connect widget, shown separately on the
same Settings page.
"""
from django.db import migrations

PAYMENT_METHODS = [
    {'method': 'Cash', 'enabled': True, 'account_detail': ''},
    {'method': 'Card', 'enabled': True, 'account_detail': ''},
    {'method': 'MoMo', 'enabled': True, 'account_detail': ''},
    {'method': 'Online Banking', 'enabled': False, 'account_detail': ''},
]

MARKETPLACE_CHANNELS = [
    {'channel': 'GrabMart', 'connected': False, 'store_partner_id': ''},
    {'channel': 'ShopeeFood', 'connected': False, 'store_partner_id': ''},
    {'channel': 'BeMart', 'connected': False, 'store_partner_id': ''},
    {'channel': 'Shopee', 'connected': False, 'store_partner_id': ''},
    {'channel': 'TikTok Shop', 'connected': False, 'store_partner_id': ''},
]


def seed(apps, schema_editor):
    PaymentMethodSetting = apps.get_model('core', 'PaymentMethodSetting')
    MarketplaceChannelSetting = apps.get_model('core', 'MarketplaceChannelSetting')
    BusinessProfile = apps.get_model('core', 'BusinessProfile')

    for pm in PAYMENT_METHODS:
        PaymentMethodSetting.objects.get_or_create(method=pm['method'], defaults=pm)
    for ch in MARKETPLACE_CHANNELS:
        MarketplaceChannelSetting.objects.get_or_create(channel=ch['channel'], defaults=ch)
    BusinessProfile.objects.get_or_create(pk=1)


def unseed(apps, schema_editor):
    PaymentMethodSetting = apps.get_model('core', 'PaymentMethodSetting')
    MarketplaceChannelSetting = apps.get_model('core', 'MarketplaceChannelSetting')
    BusinessProfile = apps.get_model('core', 'BusinessProfile')

    PaymentMethodSetting.objects.filter(method__in=[pm['method'] for pm in PAYMENT_METHODS]).delete()
    MarketplaceChannelSetting.objects.filter(channel__in=[ch['channel'] for ch in MARKETPLACE_CHANNELS]).delete()
    BusinessProfile.objects.filter(pk=1).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_businessprofile_customer_marketplacechannelsetting_and_more'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
