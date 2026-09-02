"""In-process "tools" the advisor agent uses to read business data.

Rather than duplicating the aggregation logic that already lives in
core/views.py and forecasting/views.py (revenue buckets, category totals,
demand forecasts, ...), each function here drives the real DRF view
directly: build a request with APIRequestFactory, authenticate it with
force_authenticate(), and call the view's .as_view() callable. This goes
through the exact same query/permission/store-scoping logic those views
already have, so the agent can never see data a human with that role
couldn't also see via the API -- without duplicating that logic here.

This intentionally does NOT use rest_framework.test.APIClient (an earlier
version of this file did). APIClient drives the full WSGI/middleware stack,
including Django's ALLOWED_HOSTS check against the Host header it sends
('testserver' by default) -- Django's test runner allows that host during
`manage.py test`, but production ALLOWED_HOSTS does not, so APIClient calls
here 500'd in production despite passing every test. Calling .as_view()
directly bypasses Django's middleware chain entirely, which is correct for
an internal Python-to-Python call like this one -- host validation, CORS,
CSRF etc. aren't meaningful for it anyway.
"""
from rest_framework.test import APIRequestFactory, force_authenticate

from core.views import BestWorstSellerView, LowStockAlertViewSet, RevenueByChannelView, RevenueTrendView, SalesByCategoryView
from forecasting.views import ForecastOverviewView

_factory = APIRequestFactory()


def resolve_store_scope(user, requested_store_id=None):
    """Chain Manager/Admin may query a specific store or omit it for
    chain-wide; everyone else (Store Manager) is locked to their own store
    regardless of what's requested. Mirrors the convention used throughout
    core/views.py (StoreInventoryViewSet, StaffViewSet, ForecastOverviewView).
    """
    is_chain_scope = bool(user.role and user.role.role_name in ('Chain Manager', 'Admin'))
    if is_chain_scope:
        return requested_store_id
    return user.store_id


def _call(view_callable, user, params=None):
    request = _factory.get('/', params or {})
    force_authenticate(request, user=user)
    response = view_callable(request)
    response.render()
    if response.status_code >= 400:
        raise RuntimeError(f"advisor tool call failed ({response.status_code}): {response.data}")
    return response.data


def fetch_revenue_trend(user, store_id, period):
    params = {'period': period}
    if store_id:
        params['store'] = store_id
    return _call(RevenueTrendView.as_view(), user, params)


def fetch_sales_by_category(user, store_id, period):
    params = {'period': period}
    if store_id:
        params['store'] = store_id
    return _call(SalesByCategoryView.as_view(), user, params)


def fetch_revenue_by_channel(user, store_id, period):
    params = {'period': period}
    if store_id:
        params['store'] = store_id
    return _call(RevenueByChannelView.as_view(), user, params)


def fetch_sales_performance(user, limit=5):
    return _call(BestWorstSellerView.as_view(), user, {'limit': limit})


def fetch_forecast(user, store_id, action_required_only=True):
    params = {}
    if store_id:
        params['store'] = store_id
    if action_required_only:
        params['action_required'] = 'true'
    return _call(ForecastOverviewView.as_view(), user, params)


def fetch_low_stock_alerts(user, store_id):
    # LowStockAlertViewSet self-scopes off request.user, same as ForecastOverviewView --
    # store_id here is only for the response shape, not passed as a query param.
    del store_id
    return _call(LowStockAlertViewSet.as_view({'get': 'list'}), user)
