"""LangGraph definition for the revenue-advisor agent.

Flow (see state.py for the shared state shape):

    START
      +--> fetch_context ---------+
      +--> fetch_market_context --+--> compute_metrics --> detect_anomalies
                                                                  |
                                                                  v
                                                          generate_insights <--+
                                                                  |            |
                                                                  v            | fail, retry<3
                                                          verify_insights -----+
                                                                  |
                                                pass, or fail+retry>=3
                                                                  v
                                                             format_output --> END

`compute_metrics` and `detect_anomalies` are plain Python -- no LLM involved,
so the numbers the agent reasons over are exactly the numbers the existing,
already-tested report endpoints return. Only `generate_insights` (turns
metrics into advice) and `verify_insights` (checks the advice doesn't
invent numbers) call the LLM, and `verify_insights` gates whether
unverified advice ever reaches format_output.
"""
import json

from django.conf import settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph

from . import tools
from .market import fetch_market_context as _fetch_market_context
from .state import AdvisorState

MAX_VERIFY_RETRIES = 3

ROLE_GUIDANCE = {
    'store_manager': (
        "You are advising the MANAGER OF ONE SPECIFIC STORE. Recommendations must be "
        "operational and local: restocking, local promotions, handling slow-moving or low-stock products."
    ),
    'chain_manager': (
        "You are advising the CHAIN MANAGER (all stores). Recommendations may compare "
        "stores against each other, reallocate inventory between branches, or replicate what's working elsewhere."
    ),
}


def _build_llm(temperature=0.3):
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError('GOOGLE_API_KEY is not set -- required to call the advisor agent.')
    return ChatGoogleGenerativeAI(model=settings.GEMINI_MODEL, google_api_key=settings.GOOGLE_API_KEY, temperature=temperature)


def _parse_json_array(text):
    """Gemini is instructed to return a bare JSON array but sometimes wraps it
    in a ```json fence anyway -- strip that before parsing, and fail closed
    (empty list) rather than raise on anything else unexpected."""
    text = (text or '').strip()
    if text.startswith('```'):
        text = text.strip('`').strip()
        if text.lower().startswith('json'):
            text = text[4:].strip()
    try:
        data = json.loads(text)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def fetch_context(state: AdvisorState) -> dict:
    user = state['user']
    store_id = state.get('store_id')
    period = state['period']

    raw_data = {
        'revenue_trend': tools.fetch_revenue_trend(user, store_id, period),
        'sales_by_category': tools.fetch_sales_by_category(user, store_id, period),
        'revenue_by_channel': tools.fetch_revenue_by_channel(user, store_id, period),
        'sales_performance': tools.fetch_sales_performance(user),
        'forecast': tools.fetch_forecast(user, store_id),
    }
    return {'raw_data': raw_data}


def fetch_market_context_node(state: AdvisorState) -> dict:
    return {'market_context': _fetch_market_context(state.get('store_location'), state['period'])}


def compute_metrics(state: AdvisorState) -> dict:
    raw = state['raw_data']
    trend = raw['revenue_trend']

    revenue = sum(float(p['total']) for p in trend['points'])
    expense = sum(float(p['expense_total']) for p in trend['points'])
    profit = revenue - expense

    previous_revenue = float(trend.get('previous_total') or 0)
    previous_expense = float(trend.get('previous_expense_total') or 0)
    previous_profit = previous_revenue - previous_expense
    # Same "no comparison against a non-positive base" rule as the Branch
    # Profit dashboard card -- a percentage there is undefined, not "infinite".
    profit_change_pct = ((profit - previous_profit) / previous_profit * 100) if previous_profit > 0 else None

    categories = sorted(raw['sales_by_category']['categories'], key=lambda c: float(c['total']), reverse=True)
    channels = sorted(raw['revenue_by_channel']['channels'], key=lambda c: float(c['total']), reverse=True)

    metrics = {
        'revenue': revenue,
        'expense': expense,
        'profit': profit,
        'previous_profit': previous_profit,
        'profit_change_pct': profit_change_pct,
        'categories_by_revenue': categories,
        'channels_by_revenue': channels,
        'best_sellers': raw['sales_performance'].get('best_sellers', [])[:5],
        'worst_sellers': raw['sales_performance'].get('worst_sellers', [])[:5],
        'forecast_overview': raw['forecast'].get('overview', {}),
    }
    return {'metrics': metrics}


def detect_anomalies(state: AdvisorState) -> dict:
    metrics = state['metrics']
    raw = state['raw_data']
    anomalies = []

    if metrics['profit_change_pct'] is not None and metrics['profit_change_pct'] <= -20:
        anomalies.append({
            'type': 'profit_drop',
            'severity': 'high',
            'detail': f"Profit dropped {abs(metrics['profit_change_pct']):.1f}% compared to the previous period.",
        })

    high_risk_products = [p for p in raw['forecast'].get('products', []) if p.get('stockout_risk') == 'High']
    if high_risk_products:
        names = ', '.join(p['product_name'] for p in high_risk_products[:5])
        anomalies.append({
            'type': 'stockout_risk',
            'severity': 'high',
            'detail': f"{len(high_risk_products)} product(s) at high risk of stocking out: {names}",
        })

    if metrics['revenue'] > 0 and (metrics['expense'] / metrics['revenue']) > 0.7:
        ratio_pct = metrics['expense'] / metrics['revenue'] * 100
        anomalies.append({
            'type': 'high_cost_ratio',
            'severity': 'medium',
            'detail': f"Order-supply cost is {ratio_pct:.0f}% of revenue this period.",
        })

    return {'anomalies': anomalies}


def generate_insights(state: AdvisorState) -> dict:
    llm = _build_llm()
    prompt = f"""{ROLE_GUIDANCE[state['role']]}

Period: {state['period']}

VERIFIED METRICS (use only these exact numbers -- never invent or estimate a number):
{json.dumps(state['metrics'], ensure_ascii=False, indent=2, default=str)}

DETECTED ANOMALIES:
{json.dumps(state['anomalies'], ensure_ascii=False, indent=2)}

LOCAL MARKET CONTEXT (reference only, NOT verified internal data, may be inaccurate):
{state.get('market_context') or '(none)'}

Give at most 5 concrete, immediately actionable recommendations. Each recommendation is an object with:
- "title": short title
- "reasoning": explanation; MUST quote the exact figures above if it relies on internal data
- "source": "internal_data" or "market_context"
- "priority": "high" | "medium" | "low"

Respond in English. Reply with ONLY a valid JSON array, no other text, no markdown fence.
"""
    response = llm.invoke(prompt)
    recommendations = _parse_json_array(response.content)
    return {'recommendations': recommendations}


def verify_insights(state: AdvisorState) -> dict:
    retry_count = state.get('retry_count', 0)
    recommendations = state.get('recommendations') or []

    if not recommendations:
        return {'verification_passed': False, 'verification_notes': 'No recommendations parsed from LLM output.', 'retry_count': retry_count + 1}

    llm = _build_llm(temperature=0)
    check_prompt = f"""Compare the RECOMMENDATIONS below against the SOURCE METRICS. If any number in the
recommendations does NOT match or does not appear in the source metrics, reply starting with "FAIL:" followed
by a brief reason. If every cited number matches the source metrics (or the recommendation cites no internal
data at all), reply "PASS".

SOURCE METRICS:
{json.dumps(state['metrics'], ensure_ascii=False, default=str)}

RECOMMENDATIONS:
{json.dumps(recommendations, ensure_ascii=False)}
"""
    response = llm.invoke(check_prompt)
    verdict = (response.content or '').strip()
    passed = verdict.upper().startswith('PASS')
    return {
        'verification_passed': passed,
        'verification_notes': verdict,
        'retry_count': retry_count if passed else retry_count + 1,
    }


def route_after_verify(state: AdvisorState) -> str:
    if state.get('verification_passed'):
        return 'format_output'
    if state.get('retry_count', 0) >= MAX_VERIFY_RETRIES:
        return 'format_output'
    return 'generate_insights'


def format_output(state: AdvisorState) -> dict:
    recommendations = state.get('recommendations') or []
    verified = bool(state.get('verification_passed'))
    # LLM narrative failed verification MAX_VERIFY_RETRIES times in a row --
    # ship the verified metrics/anomalies only, never unverified advice.
    if not verified and state.get('retry_count', 0) >= MAX_VERIFY_RETRIES:
        recommendations = []

    return {
        'output': {
            'period': state['period'],
            'store_id': state.get('store_id'),
            'metrics': state['metrics'],
            'anomalies': state['anomalies'],
            'recommendations': recommendations,
            'recommendations_verified': verified,
            'market_context': state.get('market_context') or None,
        }
    }


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def build_graph():
    graph = StateGraph(AdvisorState)

    graph.add_node('fetch_context', fetch_context)
    graph.add_node('fetch_market_context', fetch_market_context_node)
    graph.add_node('compute_metrics', compute_metrics)
    graph.add_node('detect_anomalies', detect_anomalies)
    graph.add_node('generate_insights', generate_insights)
    graph.add_node('verify_insights', verify_insights)
    graph.add_node('format_output', format_output)

    # fetch_context and fetch_market_context run in parallel. generate_insights
    # needs output from BOTH branches (metrics/anomalies from the fetch_context
    # branch, market_context from the other) -- passing a list of source nodes
    # to a single add_edge call is LangGraph's join primitive: it waits for
    # every listed predecessor to finish before firing, rather than firing as
    # soon as the first one does (which two separate add_edge calls would do,
    # and which is what originally caused generate_insights to run before
    # compute_metrics/detect_anomalies had populated `metrics`/`anomalies`).
    graph.add_edge(START, 'fetch_context')
    graph.add_edge(START, 'fetch_market_context')
    graph.add_edge('fetch_context', 'compute_metrics')
    graph.add_edge('compute_metrics', 'detect_anomalies')
    graph.add_edge(['detect_anomalies', 'fetch_market_context'], 'generate_insights')
    graph.add_edge('generate_insights', 'verify_insights')
    graph.add_conditional_edges('verify_insights', route_after_verify, {
        'generate_insights': 'generate_insights',
        'format_output': 'format_output',
    })
    graph.add_edge('format_output', END)

    return graph.compile()


# Compiled once per process; StateGraph.compile() is cheap and the compiled
# graph itself holds no per-request state.
_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph
