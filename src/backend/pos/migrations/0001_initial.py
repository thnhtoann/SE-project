import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0012_product_image_url'),
    ]

    operations = [
        migrations.CreateModel(
            name='QrPaymentIntent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order_code', models.BigIntegerField(unique=True)),
                ('discount_percent', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('cart_snapshot', models.JSONField()),
                ('amount', models.PositiveIntegerField()),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Paid', 'Paid'), ('Cancelled', 'Cancelled')], default='Pending', max_length=10)),
                ('checkout_url', models.URLField(blank=True, max_length=500)),
                ('qr_code', models.TextField(blank=True)),
                ('payos_payment_link_id', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('order', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.order')),
                ('shift', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='core.shift')),
                ('staff', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='core.staff')),
                ('store', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='core.store')),
            ],
        ),
    ]
