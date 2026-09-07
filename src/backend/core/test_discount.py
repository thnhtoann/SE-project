"""Tests for the Discount API (core/views.py DiscountViewSet)."""
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Category, Discount, Product, Role, Staff


class DiscountApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()

        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        store_manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        self.cashier = Staff.objects.create_user(username='discount_cashier', password='password123', full_name='Cashier', role=cashier_role)
        self.store_manager = Staff.objects.create_user(username='discount_store_mgr', password='password123', full_name='Store Mgr', role=store_manager_role)

        category = Category.objects.create(category_name='Bakery')
        self.product = Product.objects.create(barcode='DISC-1', product_name='Bread', base_price='20000.00', min_threshold=5, category=category)

    def test_cashier_can_read_but_not_write(self):
        self.client.force_authenticate(user=self.cashier)
        res = self.client.get(reverse('discount-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.post(reverse('discount-list'), {'product': self.product.product_id, 'discount_type': 'percentage', 'value': 20}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_store_manager_applies_percentage_discount(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.post(reverse('discount-list'), {'product': self.product.product_id, 'discount_type': 'percentage', 'value': 25}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertTrue(res.data['is_active'])

    def test_applying_a_new_discount_deactivates_the_previous_one(self):
        self.client.force_authenticate(user=self.store_manager)
        first = self.client.post(reverse('discount-list'), {'product': self.product.product_id, 'discount_type': 'percentage', 'value': 10}, format='json').data
        second = self.client.post(reverse('discount-list'), {'product': self.product.product_id, 'discount_type': 'percentage', 'value': 30}, format='json').data

        first_reloaded = Discount.objects.get(pk=first['discount_id'])
        self.assertFalse(first_reloaded.is_active)
        self.assertTrue(Discount.objects.get(pk=second['discount_id']).is_active)

        active = self.client.get(reverse('discount-list'), {'product': self.product.product_id, 'is_active': 'true'})
        self.assertEqual(len(active.data), 1)
        self.assertEqual(active.data[0]['discount_id'], second['discount_id'])

    def test_percentage_discount_over_90_rejected(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.post(reverse('discount-list'), {'product': self.product.product_id, 'discount_type': 'percentage', 'value': 95}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_price_discount_must_be_below_base_price(self):
        self.client.force_authenticate(user=self.store_manager)
        res = self.client.post(reverse('discount-list'), {'product': self.product.product_id, 'discount_type': 'price', 'value': '25000.00'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_discount_deactivates_it(self):
        self.client.force_authenticate(user=self.store_manager)
        created = self.client.post(reverse('discount-list'), {'product': self.product.product_id, 'discount_type': 'price', 'value': '15000.00'}, format='json').data
        res = self.client.patch(reverse('discount-detail', kwargs={'pk': created['discount_id']}), {'is_active': False}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertFalse(Discount.objects.get(pk=created['discount_id']).is_active)
