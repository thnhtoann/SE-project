"""Tests for POST /api/products/<id>/upload-image/ (core/views.py ProductViewSet.upload_image)."""
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Category, Product, Role, Staff

# A minimal valid 1x1 PNG.
PNG_BYTES = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
    b'\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82'
)


class ProductImageUploadApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        category = Category.objects.create(category_name='Snacks')
        self.product = Product.objects.create(barcode='IMG-1', product_name='Chips', base_price='10000.00', min_threshold=5, category=category)

        manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]
        self.store_manager = Staff.objects.create_user(username='img_store_manager', password='password123', full_name='Manager', role=manager_role)
        self.client.force_authenticate(user=self.store_manager)

    def test_upload_sets_image_url(self):
        file = SimpleUploadedFile('chips.png', PNG_BYTES, content_type='image/png')
        res = self.client.post(reverse('product-upload-image', kwargs={'pk': self.product.pk}), {'file': file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertTrue(res.data['image_url'])
        self.product.refresh_from_db()
        self.assertTrue(self.product.image_url)

    def test_non_image_file_rejected(self):
        file = SimpleUploadedFile('notes.txt', b'hello', content_type='text/plain')
        res = self.client.post(reverse('product-upload-image', kwargs={'pk': self.product.pk}), {'file': file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_file_rejected(self):
        res = self.client.post(reverse('product-upload-image', kwargs={'pk': self.product.pk}), {}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cashier_forbidden(self):
        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        cashier = Staff.objects.create_user(username='img_cashier', password='password123', full_name='Cashier', role=cashier_role)
        self.client.force_authenticate(user=cashier)
        file = SimpleUploadedFile('chips.png', PNG_BYTES, content_type='image/png')
        res = self.client.post(reverse('product-upload-image', kwargs={'pk': self.product.pk}), {'file': file}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
