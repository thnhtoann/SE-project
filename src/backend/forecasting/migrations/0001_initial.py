import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DailySalesRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sale_date', models.DateField()),
                ('channel', models.CharField(max_length=50)),
                ('units_sold', models.IntegerField()),
                ('current_stock', models.IntegerField()),
                ('safety_stock_level', models.IntegerField()),
                ('supplier_lead_time_days', models.IntegerField()),
                ('is_promo_day', models.BooleanField(default=False)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='daily_sales_records', to='core.product')),
                ('store', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='core.store')),
            ],
            options={
                'unique_together': {('product', 'store', 'sale_date', 'channel')},
            },
        ),
        migrations.AddIndex(
            model_name='dailysalesrecord',
            index=models.Index(fields=['product', 'sale_date'], name='forecasting_product_saledate_idx'),
        ),
        migrations.CreateModel(
            name='DemandForecast',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('generated_at', models.DateTimeField(auto_now=True)),
                ('forecast_horizon_days', models.IntegerField()),
                ('expected_demand', models.DecimalField(decimal_places=2, max_digits=10)),
                ('expected_demand_lower', models.DecimalField(decimal_places=2, max_digits=10)),
                ('expected_demand_upper', models.DecimalField(decimal_places=2, max_digits=10)),
                ('safety_stock_level', models.IntegerField()),
                ('product', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='demand_forecast', to='core.product')),
            ],
        ),
    ]
