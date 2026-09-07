"""
Dev/demo seed data — NOT intended to run blindly against a populated/production
database. Seeds the 4 Role rows that core/permissions.py's IsCashier/
IsStoreManager/IsChainManager checks compare against by literal string (these
tables are otherwise empty in a fresh DB, so login/RBAC cannot work at all
until this exists), plus one Chain Manager Staff account for local testing.
"""
from django.contrib.auth.hashers import make_password
from django.db import migrations

ROLE_NAMES = ['Cashier', 'Store Manager', 'Chain Manager', 'Admin']

SEED_STAFF_USERNAME = 'chain_manager_demo'
SEED_STAFF_PASSWORD = 'ChangeMe123!'
SEED_STAFF_FULL_NAME = 'Demo Chain Manager'
SEED_STAFF_EMAIL = 'chainmanager.demo@martplus.local'


def seed(apps, schema_editor):
    Role = apps.get_model('core', 'Role')
    Staff = apps.get_model('core', 'Staff')

    for name in ROLE_NAMES:
        Role.objects.get_or_create(role_name=name)

    chain_manager_role = Role.objects.get(role_name='Chain Manager')
    Staff.objects.get_or_create(
        username=SEED_STAFF_USERNAME,
        defaults={
            'password': make_password(SEED_STAFF_PASSWORD),
            'full_name': SEED_STAFF_FULL_NAME,
            'role': chain_manager_role,
            'email': SEED_STAFF_EMAIL,
            'is_active': True,
        },
    )


def unseed(apps, schema_editor):
    Staff = apps.get_model('core', 'Staff')
    Role = apps.get_model('core', 'Role')

    Staff.objects.filter(username=SEED_STAFF_USERNAME).delete()
    Role.objects.filter(role_name__in=ROLE_NAMES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_inventoryalert'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
