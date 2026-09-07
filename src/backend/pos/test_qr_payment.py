"""Tests for the PayOS VietQR checkout flow (pos/views.py, pos/payos_client.py)."""
from decimal import Decimal
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from core.models import Batch, Category, Notification, Order, Product, Role, Shift, Staff, Store, StoreInventory

from .models import QrPaymentIntent
from .payos_client import PayOSError


class QrPaymentTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()

        self.store = Store.objects.create(store_name='QR Store', location='HCMC')

        cashier_role = Role.objects.get_or_create(role_name='Cashier')[0]
        self.cashier = Staff.objects.create_user(
            username='qr_cashier', password='password123',
            full_name='QR Cashier', role=cashier_role, store=self.store,
        )
        self.client.force_authenticate(user=self.cashier)

        category = Category.objects.create(category_name='Snacks')
        self.product = Product.objects.create(
            barcode='QR-1', product_name='Chips', base_price='15000.00',
            min_threshold=5, category=category,
        )
        batch = Batch.objects.create(
            product=self.product, manufacture_date='2026-01-01', expiration_date='2026-12-31',
        )
        self.inventory = StoreInventory.objects.create(store=self.store, batch=batch, quantity=10)

        self.shift = Shift.objects.create(store=self.store, staff=self.cashier, opening_cash='100000.00')

    def _create_payload(self, **overrides):
        payload = {
            'store': self.store.store_id,
            'shift': self.shift.shift_id,
            'discount_percent': 0,
            'items': [{'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00'}],
        }
        payload.update(overrides)
        return payload


class CreateQrPaymentTests(QrPaymentTestBase):
    @patch('pos.views.payos_client.create_payment_link')
    def test_creates_intent_without_touching_inventory(self, mock_create_link):
        mock_create_link.return_value = {
            'checkoutUrl': 'https://pay.payos.vn/web/abc123',
            'qrCode': '00020101...',
            'paymentLinkId': 'link_abc123',
        }

        res = self.client.post(reverse('pos-qr-payment-create'), self._create_payload(), format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['amount'], 30000)
        self.assertEqual(res.data['status'], QrPaymentIntent.STATUS_PENDING)
        self.assertEqual(res.data['checkout_url'], 'https://pay.payos.vn/web/abc123')

        intent = QrPaymentIntent.objects.get(order_code=res.data['order_code'])
        self.assertEqual(intent.amount, 30000)
        self.assertEqual(intent.cart_snapshot, [{
            'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00',
            'discount_type': None, 'discount_value': '0',
        }])

        # No order created / stock touched yet -- only the webhook does that.
        self.assertEqual(Order.objects.count(), 0)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 10)

        call_kwargs = mock_create_link.call_args.kwargs
        self.assertEqual(call_kwargs['amount'], 30000)

    @patch('pos.views.payos_client.create_payment_link')
    def test_amount_reflects_per_item_discount(self, mock_create_link):
        mock_create_link.return_value = {'checkoutUrl': 'https://pay.payos.vn/web/abc123', 'qrCode': '', 'paymentLinkId': ''}

        payload = self._create_payload(items=[{
            'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00',
            'discount_type': 'amount', 'discount_value': '5000',
        }])
        res = self.client.post(reverse('pos-qr-payment-create'), payload, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        # (15000*2) - 5000 = 25000
        self.assertEqual(res.data['amount'], 25000)
        self.assertEqual(mock_create_link.call_args.kwargs['amount'], 25000)

    @patch('pos.views.payos_client.create_payment_link')
    def test_payos_error_returns_502(self, mock_create_link):
        mock_create_link.side_effect = PayOSError('sandbox unreachable')

        res = self.client.post(reverse('pos-qr-payment-create'), self._create_payload(), format='json')

        self.assertEqual(res.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(QrPaymentIntent.objects.count(), 0)

    def test_cashier_role_permitted(self):
        with patch('pos.views.payos_client.create_payment_link', return_value={'checkoutUrl': '', 'qrCode': '', 'paymentLinkId': ''}):
            res = self.client.post(reverse('pos-qr-payment-create'), self._create_payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)


class QrPaymentStatusTests(QrPaymentTestBase):
    def _make_intent(self, status_=QrPaymentIntent.STATUS_PENDING):
        return QrPaymentIntent.objects.create(
            order_code=123456,
            store=self.store,
            shift=self.shift,
            staff=self.cashier,
            discount_percent=Decimal('0'),
            cart_snapshot=[{'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00'}],
            amount=30000,
            status=status_,
        )

    def test_status_pending(self):
        self._make_intent()
        res = self.client.get(reverse('pos-qr-payment-status', kwargs={'order_code': 123456}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], QrPaymentIntent.STATUS_PENDING)
        self.assertIsNone(res.data['order'])

    def test_status_not_found(self):
        res = self.client.get(reverse('pos-qr-payment-status', kwargs={'order_code': 999999}))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_cancel_pending_intent(self):
        self._make_intent()
        res = self.client.post(reverse('pos-qr-payment-status', kwargs={'order_code': 123456}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], QrPaymentIntent.STATUS_CANCELLED)

    def test_cancel_is_noop_once_paid(self):
        order = Order.objects.create(
            store=self.store, staff=self.cashier, shift=self.shift, order_date=timezone.now(),
            order_type='POS', payment_method='Bank QR', total_amount='30000.00', status='Completed',
        )
        self._make_intent(status_=QrPaymentIntent.STATUS_PAID)
        intent = QrPaymentIntent.objects.get(order_code=123456)
        intent.order = order
        intent.save(update_fields=['order'])

        res = self.client.post(reverse('pos-qr-payment-status', kwargs={'order_code': 123456}))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], QrPaymentIntent.STATUS_PAID)

        status_res = self.client.get(reverse('pos-qr-payment-status', kwargs={'order_code': 123456}))
        self.assertIsNotNone(status_res.data['order'])
        self.assertEqual(status_res.data['order']['order_id'], order.order_id)


class PayOSWebhookTests(QrPaymentTestBase):
    def setUp(self):
        super().setUp()
        self.intent = QrPaymentIntent.objects.create(
            order_code=555000,
            store=self.store,
            shift=self.shift,
            staff=self.cashier,
            discount_percent=Decimal('0'),
            cart_snapshot=[{'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00'}],
            amount=30000,
        )
        # Webhook auth is signature-based, not session -- test as an anonymous client.
        self.client.force_authenticate(user=None)

    def _payload(self, **data_overrides):
        data = {'orderCode': 555000, 'amount': 30000, 'code': '00', 'desc': 'Thanh cong'}
        data.update(data_overrides)
        return {'code': '00', 'desc': 'success', 'success': True, 'data': data, 'signature': 'sig'}

    @patch('pos.views.payos_client.verify_webhook_signature', return_value=False)
    def test_invalid_signature_rejected(self, mock_verify):
        res = self.client.post(reverse('pos-payos-webhook'), self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.intent.refresh_from_db()
        self.assertEqual(self.intent.status, QrPaymentIntent.STATUS_PENDING)

    @patch('pos.views.payos_client.verify_webhook_signature', return_value=True)
    def test_unknown_order_code_acknowledged(self, mock_verify):
        res = self.client.post(reverse('pos-payos-webhook'), self._payload(orderCode=999999999), format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    @patch('pos.views.payos_client.verify_webhook_signature', return_value=True)
    def test_success_event_creates_order_and_deducts_stock(self, mock_verify):
        res = self.client.post(reverse('pos-payos-webhook'), self._payload(), format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.intent.refresh_from_db()
        self.assertEqual(self.intent.status, QrPaymentIntent.STATUS_PAID)
        self.assertIsNotNone(self.intent.order)
        self.assertEqual(self.intent.order.payment_method, 'Bank QR')
        self.assertEqual(Decimal(self.intent.order.total_amount), Decimal('30000.00'))

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 8)

    @patch('pos.views.payos_client.verify_webhook_signature', return_value=True)
    def test_per_item_discount_from_snapshot_applied_to_order(self, mock_verify):
        self.intent.cart_snapshot = [{
            'product': self.product.product_id, 'quantity': 2, 'unit_price': '15000.00',
            'discount_type': 'percent', 'discount_value': '10',
        }]
        self.intent.save(update_fields=['cart_snapshot'])

        res = self.client.post(reverse('pos-payos-webhook'), self._payload(), format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.intent.refresh_from_db()
        # (15000*2) - 10% = 27000
        self.assertEqual(Decimal(self.intent.order.total_amount), Decimal('27000.00'))
        detail = self.intent.order.orderdetail_set.get()
        self.assertEqual(detail.discount_type, 'percent')
        self.assertEqual(Decimal(detail.discount_value), Decimal('10'))

    @patch('pos.views.payos_client.verify_webhook_signature', return_value=True)
    def test_notifies_cashier_own_store_manager_and_all_chain_managers_only(self, mock_verify):
        store_manager = Staff.objects.create_user(
            username='qr_store_mgr', password='password123', full_name='QR Store Mgr',
            role=Role.objects.get_or_create(role_name='Store Manager')[0], store=self.store,
        )
        chain_manager = Staff.objects.create_user(
            username='qr_chain_mgr', password='password123', full_name='QR Chain Mgr',
            role=Role.objects.get_or_create(role_name='Chain Manager')[0],
        )
        other_store = Store.objects.create(store_name='Other Store', location='HN')
        other_store_manager = Staff.objects.create_user(
            username='other_store_mgr', password='password123', full_name='Other Store Mgr',
            role=Role.objects.get_or_create(role_name='Store Manager')[0], store=other_store,
        )
        other_cashier = Staff.objects.create_user(
            username='other_cashier', password='password123', full_name='Other Cashier',
            role=Role.objects.get_or_create(role_name='Cashier')[0], store=other_store,
        )

        res = self.client.post(reverse('pos-payos-webhook'), self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        notified_ids = set(Notification.objects.values_list('recipient_id', flat=True))
        self.assertEqual(notified_ids, {self.cashier.pk, store_manager.pk, chain_manager.pk})
        self.assertNotIn(other_store_manager.pk, notified_ids)
        self.assertNotIn(other_cashier.pk, notified_ids)

        note = Notification.objects.get(recipient=chain_manager)
        self.assertEqual(note.notification_type, Notification.TYPE_QR_PAYMENT_SUCCESS)
        self.assertFalse(note.is_read)
        self.assertEqual(note.order, Order.objects.get(external_order_id='555000'))

    @patch('pos.views.payos_client.verify_webhook_signature', return_value=True)
    def test_duplicate_webhook_call_does_not_create_second_order(self, mock_verify):
        self.client.post(reverse('pos-payos-webhook'), self._payload(), format='json')
        self.client.post(reverse('pos-payos-webhook'), self._payload(), format='json')

        self.assertEqual(Order.objects.filter(external_order_id='555000').count(), 1)

    @patch('pos.views.payos_client.verify_webhook_signature', return_value=True)
    def test_non_success_event_ignored(self, mock_verify):
        payload = self._payload()
        payload['success'] = False

        res = self.client.post(reverse('pos-payos-webhook'), payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.intent.refresh_from_db()
        self.assertEqual(self.intent.status, QrPaymentIntent.STATUS_PENDING)
