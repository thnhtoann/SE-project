import re

from rest_framework import serializers

from .models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['supplier_id', 'supplier_name', 'contact_phone', 'email', 'address']
        extra_kwargs = {
            'supplier_name': {'required': True, 'allow_blank': False},
            'contact_phone': {'required': True, 'allow_blank': False},
            'email': {'required': False, 'allow_blank': True},
            'address': {'required': False, 'allow_blank': True},
        }

    def validate_email(self, value):
        if value in [None, '']:
            return value

        pattern = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'
        if not re.match(pattern, value):
            raise serializers.ValidationError('Email is not in a valid format.')
        return value
