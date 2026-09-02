"""Tests for advisor/tools.py -- only the pure, deterministic piece
(resolve_store_scope). The tool functions that hit the network/LLM
(fetch_* here, and everything in market.py/graph.py) need a live
GOOGLE_API_KEY and aren't exercised by the automated test suite.
"""
from rest_framework.test import APITestCase

from advisor.tools import resolve_store_scope
from core.models import Role, Staff, Store


class ResolveStoreScopeTests(APITestCase):
    def setUp(self):
        self.store_a = Store.objects.create(store_name='Store A', location='HCMC')
        self.store_b = Store.objects.create(store_name='Store B', location='Hanoi')

        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        store_manager_role = Role.objects.get_or_create(role_name='Store Manager')[0]

        self.chain_manager = Staff.objects.create_user(
            username='advisor_chain_mgr', password='password123', full_name='Advisor Chain Mgr', role=chain_manager_role,
        )
        self.store_manager = Staff.objects.create_user(
            username='advisor_store_mgr', password='password123', full_name='Advisor Store Mgr',
            role=store_manager_role, store=self.store_a,
        )

    def test_chain_manager_can_pass_any_store(self):
        self.assertEqual(resolve_store_scope(self.chain_manager, self.store_b.store_id), self.store_b.store_id)

    def test_chain_manager_omitting_store_stays_chain_wide(self):
        self.assertIsNone(resolve_store_scope(self.chain_manager, None))

    def test_store_manager_locked_to_own_store_even_if_another_requested(self):
        self.assertEqual(resolve_store_scope(self.store_manager, self.store_b.store_id), self.store_a.store_id)

    def test_store_manager_with_no_store_param_gets_own_store(self):
        self.assertEqual(resolve_store_scope(self.store_manager, None), self.store_a.store_id)
