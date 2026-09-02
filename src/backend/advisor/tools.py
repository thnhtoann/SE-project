"""In-process "tools" the advisor agent uses to read business data.

Rather than duplicating the aggregation logic that already lives in
core/views.py and forecasting/views.py (revenue buckets, category totals,
demand forecasts, ...), each function here drives the real DRF view through
rest_framework.test.APIClient with force_authenticate(). This is the exact
pattern this codebase's own tests already use (see core/test_revenue_trend.py
etc.) to call a view in-process as a given user -- it goes through the same
permission checks and store-scoping the view already has, so the agent can
never see data a human with that role couldn't also see via the API.
"""
from django.urls import reverse
from rest_framework.test import APIClient


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


def _get(user, url_name, params=None):
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get(reverse(url_name), params or {})
    if response.status_code >= 400:
        raise RuntimeError(f"advisor tool call to {url_name} failed ({response.status_code}): {response.data}")
    return response.data


def fetch_revenue_trend(user, store_id, period):
    params = {'period': period}
    if store_id:
        params['store'] = store_id
    return _get(user, 'revenue-trend-report', params)


def fetch_sales_by_category(user, store_id, period):
    params = {'period': period}
    if store_id:
        params['store'] = store_id
    return _get(user, 'sales-by-category-report', params)


def fetch_revenue_by_channel(user, store_id, period):
    params = {'period': period}
    if store_id:
        params['store'] = store_id
    return _get(user, 'revenue-by-channel-report', params)


def fetch_sales_performance(user, limit=5):
    return _get(user, 'sales-performance-report', {'limit': limit})


def fetch_forecast(user, store_id, action_required_only=True):
    params = {}
    if store_id:
        params['store'] = store_id
    if action_required_only:
        params['action_required'] = 'true'
    return _get(user, 'demand-forecast', params)


def fetch_low_stock_alerts(user, store_id):
    # LowStockAlertViewSet self-scopes off request.user, same as ForecastOverviewView --
    # store_id here is only for the response shape, not passed as a query param.
    del store_id
    return _get(user, 'low-stock-alert-list')
