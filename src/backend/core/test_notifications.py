"""Tests for the Notification API (core/views.py NotificationViewSet)."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Notification, Role, Staff


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        role = Role.objects.get_or_create(role_name='Cashier')[0]
        self.staff = Staff.objects.create_user(username='notif_staff', password='password123', full_name='Notif Staff', role=role)
        self.other_staff = Staff.objects.create_user(username='notif_other', password='password123', full_name='Notif Other', role=role)
        self.client.force_authenticate(user=self.staff)

        self.own_note = Notification.objects.create(recipient=self.staff, message='Own notification')
        Notification.objects.create(recipient=self.other_staff, message='Someone else\'s notification')

    def test_list_only_returns_own_notifications(self):
        res = self.client.get(reverse('notification-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.own_note.id)

    def test_mark_read(self):
        res = self.client.patch(reverse('notification-mark-read', kwargs={'pk': self.own_note.pk}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['is_read'])
        self.own_note.refresh_from_db()
        self.assertTrue(self.own_note.is_read)

    def test_cannot_mark_someone_elses_notification_read(self):
        other_note = Notification.objects.get(recipient=self.other_staff)
        res = self.client.patch(reverse('notification-mark-read', kwargs={'pk': other_note.pk}))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_read(self):
        Notification.objects.create(recipient=self.staff, message='Second one')
        res = self.client.post(reverse('notification-mark-all-read'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=self.staff, is_read=False).count(), 0)

    def test_unauthenticated_rejected(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(reverse('notification-list'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
