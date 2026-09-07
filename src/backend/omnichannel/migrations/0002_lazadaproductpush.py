import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_orderdetail_discount'),
        ('omnichannel', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='LazadaProductPush',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('item_id', models.CharField(blank=True, max_length=50)),
                ('sku_id', models.CharField(blank=True, max_length=50)),
                ('status', models.CharField(blank=True, max_length=50)),
                ('last_quantity', models.IntegerField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='lazada_push_status', to='core.product')),
            ],
        ),
    ]
