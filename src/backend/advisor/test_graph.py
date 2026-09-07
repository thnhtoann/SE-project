"""Tests for advisor/graph.py's wiring -- runs the real compiled graph with
the LLM calls mocked out (no live GOOGLE_API_KEY in CI; market_context is
skipped safely by market.py itself when the key is unset, no mocking needed
there).

Exists specifically to catch execution-order bugs unit tests of individual
node functions can't: an earlier version of build_graph() wired
generate_insights with two separate add_edge calls (from detect_anomalies
and from fetch_market_context) instead of one add_edge with a list of both
sources -- LangGraph's actual "wait for all of these" join primitive. That
meant generate_insights fired as soon as EITHER branch finished, sometimes
before compute_metrics/detect_anomalies had populated `metrics`/
`anomalies`, crashing with a bare KeyError in production despite every
other test (including the fetch_* regression tests) passing.
"""
from unittest.mock import MagicMock, patch

from rest_framework.test import APITestCase

from advisor.graph import build_graph
from core.models import Role, Staff, Store


def _fake_llm_invoke(prompt):
    # verify_insights' prompt is the only one that asks for a PASS/FAIL
    # verdict; generate_insights' prompt asks for a JSON array. Routing on
    # prompt content (rather than call order) keeps this robust to retries.
    if 'PASS' in prompt and 'FAIL' in prompt:
        return MagicMock(content='PASS')
    return MagicMock(content='[{"title": "t", "reasoning": "r", "source": "internal_data", "priority": "low"}]')


class GraphExecutionOrderTests(APITestCase):
    def setUp(self):
        self.store = Store.objects.create(store_name='Store A', location='HCMC')
        chain_manager_role = Role.objects.get_or_create(role_name='Chain Manager')[0]
        self.chain_manager = Staff.objects.create_user(
            username='advisor_graph_chain_mgr', password='password123', full_name='Advisor Graph Chain Mgr', role=chain_manager_role,
        )

    @patch('advisor.graph._build_llm')
    def test_generate_insights_waits_for_both_metrics_and_market_context(self, mock_build_llm):
        mock_llm = MagicMock()
        mock_llm.invoke.side_effect = _fake_llm_invoke
        mock_build_llm.return_value = mock_llm

        graph = build_graph()
        final_state = graph.invoke({
            'user': self.chain_manager,
            'role': 'chain_manager',
            'store_id': self.store.store_id,
            'store_location': self.store.location,
            'period': 'week',
            'retry_count': 0,
        })

        output = final_state['output']
        self.assertIn('revenue', output['metrics'])
        self.assertIn('profit', output['metrics'])
        self.assertTrue(output['recommendations_verified'])
        self.assertEqual(len(output['recommendations']), 1)
        self.assertEqual(output['recommendations'][0]['title'], 't')
