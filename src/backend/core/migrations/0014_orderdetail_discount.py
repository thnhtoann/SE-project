from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_notification'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderdetail',
            name='discount_type',
            field=models.CharField(blank=True, choices=[('percent', 'Percent'), ('amount', 'Amount')], max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='orderdetail',
            name='discount_value',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
