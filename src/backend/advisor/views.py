from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Store
from core.permissions import IsChainManager, IsStoreManager

from . import tools
from .graph import get_graph

PERIOD_CHOICES = ('week', 'month', 'quarter')


class AdvisorAnalyzeView(APIView):
    """Runs the revenue-advisor LangGraph agent for the caller's store (or a
    chosen store / chain-wide for Chain Manager/Admin) and returns metrics +
    role-aware recommendations. Same store-scoping convention as every other
    report endpoint in this app (RevenueTrendView, ForecastOverviewView, ...).

    POST /api/advisor/analyze/
    body: {"period": "week"|"month"|"quarter", "store": <id, optional, Chain Manager/Admin only>}
    """
    permission_classes = [IsStoreManager | IsChainManager]

    def post(self, request):
        period = request.data.get('period', 'week')
        if period not in PERIOD_CHOICES:
            return Response({'detail': f'period must be one of: {", ".join(PERIOD_CHOICES)}.'}, status=400)

        user = request.user
        is_chain_scope = bool(user.role and user.role.role_name in ('Chain Manager', 'Admin'))
        requested_store_id = request.data.get('store')
        store_id = tools.resolve_store_scope(user, requested_store_id)

        store_location = None
        if store_id and user.store_id == store_id and getattr(user, 'store', None):
            store_location = user.store.location
        elif store_id:
            store = Store.objects.filter(pk=store_id).first()
            store_location = store.location if store else None

        initial_state = {
            'user': user,
            'role': 'chain_manager' if is_chain_scope else 'store_manager',
            'store_id': store_id,
            'store_location': store_location,
            'period': period,
            'retry_count': 0,
        }

        graph = get_graph()
        final_state = graph.invoke(initial_state)
        return Response(final_state['output'])
