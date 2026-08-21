"""
FCST-4: Turns a demand forecast into a reorder decision.

Kept separate from services.py on purpose: this is cheap, deterministic math with zero
dependency on Prophet/pandas, so it can be unit tested in milliseconds without the ML stack
installed (see tests.py).
"""


def evaluate_reorder(current_stock: int, expected_demand, safety_stock_level: int) -> dict:
    """
    Reorder-point check: if current stock can't cover expected demand over the lead time plus
    a safety buffer, recommend ordering the shortfall.

    Args:
        current_stock: units currently on hand (summed across the relevant store(s)).
        expected_demand: forecasted demand over the supplier lead time (float or Decimal).
        safety_stock_level: buffer stock the business wants to hold on top of forecast demand.

    Returns a dict with:
        action_required: bool
        recommended_order_quantity: int (>= 0)
        stockout_risk: 'Low' | 'Medium' | 'High'
        reasoning: str - human-readable explanation, safe to show directly in the UI.
    """
    expected_demand = float(expected_demand)
    reorder_point = expected_demand + safety_stock_level
    shortfall = reorder_point - current_stock

    action_required = shortfall > 0
    recommended_order_quantity = max(0, round(shortfall)) if action_required else 0

    if current_stock <= 0 or current_stock < expected_demand:
        stockout_risk = 'High'
    elif current_stock < reorder_point:
        stockout_risk = 'Medium'
    else:
        stockout_risk = 'Low'

    reasoning = (
        f"Forecasted demand over the lead time is {expected_demand:.1f} units. "
        f"Current stock is {current_stock}, safety stock target is {safety_stock_level}. "
    )
    if action_required:
        reasoning += (
            f"Stock falls short of the {reorder_point:.1f}-unit reorder point by "
            f"{shortfall:.1f} units, so ordering {recommended_order_quantity} units is recommended."
        )
    else:
        reasoning += "Stock covers forecasted demand plus safety stock; no order needed."

    return {
        'action_required': action_required,
        'recommended_order_quantity': recommended_order_quantity,
        'stockout_risk': stockout_risk,
        'reasoning': reasoning,
    }
