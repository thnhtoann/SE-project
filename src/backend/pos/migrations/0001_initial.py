from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='DiscountSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('near_expiry_days', models.PositiveIntegerField(default=7)),
                ('near_expiry_discount', models.DecimalField(decimal_places=4, default=Decimal('0.20'), max_digits=5)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
