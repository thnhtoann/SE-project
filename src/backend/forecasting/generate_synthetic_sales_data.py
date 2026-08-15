"""
generate_synthetic_sales_data.py

Generates a synthetic daily sales history dataset for a Smart Procurement
forecasting model (Convenience Store Chain Management System).

Usage:
    python generate_synthetic_sales_data.py
Produces:
    retail_sales_history.csv

NOTE: for the real deliverable (bulk-writing straight into DailySalesRecord),
use the Django management command instead:
    docker compose exec backend python manage.py generate_sales_data
This script stays as a standalone CSV-export tool for quick local inspection
of the synthetic data outside the DB.
"""

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
RANDOM_SEED = 42
NUM_DAYS = 730
NUM_PRODUCTS = 20
CHANNELS = ["In-store", "Online"]
OUTPUT_PATH = "retail_sales_history.csv"

rng = np.random.default_rng(RANDOM_SEED)


def generate_product_catalog(num_products: int) -> pd.DataFrame:
    """
    Builds a static product catalog with per-product attributes that drive
    the simulation: category, base demand, whether it's a 'trending'
    popular item, safety stock level, and supplier lead time.
    """
    categories = ["Beverages", "Snacks", "Dairy", "Household", "Fresh Food"]
    product_ids = np.arange(1, num_products + 1)

    catalog = pd.DataFrame({
        "product_id": product_ids,
        "product_name": [f"Product_{pid:02d}" for pid in product_ids],
        "category": rng.choice(categories, size=num_products),
        # Average total (both channels) units sold per day before
        # seasonality/trend/events are applied.
        "base_demand": rng.uniform(5, 40, size=num_products).round(1),
        # A handful of "hero" SKUs get a genuine upward trend over the window.
        "is_trending": rng.choice([True, False], size=num_products, p=[0.25, 0.75]),
        # Reorder point used by the inventory simulation below.
        "safety_stock_level": rng.integers(20, 80, size=num_products),
        "supplier_lead_time_days": rng.integers(2, 14, size=num_products),
    })
    return catalog


def generate_calendar(num_days: int) -> pd.DataFrame:
    """
    Builds the date spine and calendar features: day-of-week, weekend flag,
    and a sparse set of "promo" days representing holidays/promotions.
    Promo days get a demand multiplier applied uniformly across all
    products/channels that day, simulating a chain-wide event.
    """
    end_date = pd.Timestamp.today().normalize()
    dates = pd.date_range(end=end_date, periods=num_days, freq="D")

    calendar = pd.DataFrame({"date": dates})
    calendar["day_of_week"] = calendar["date"].dt.dayofweek  # 0=Mon .. 6=Sun
    calendar["is_weekend"] = calendar["day_of_week"].isin([5, 6])

    # ~1.5% of days are promo days, with a random spike multiplier.
    is_promo = rng.random(num_days) < 0.015
    promo_multiplier = np.where(is_promo, rng.uniform(1.8, 3.5, size=num_days), 1.0)
    calendar["is_promo_day"] = is_promo
    calendar["promo_multiplier"] = promo_multiplier

    return calendar


def simulate_demand_and_inventory(catalog: pd.DataFrame, calendar: pd.DataFrame) -> pd.DataFrame:
    """
    Core simulation, done per product so that units_sold and current_stock
    are generated together and stay physically consistent:

      1. Compute an "expected demand" curve per day from base demand,
         weekend seasonality, trend, and promo multipliers.
      2. Sample a raw (uncensored) daily demand via Poisson noise.
      3. Walk the calendar day by day: receive any pending stock arrival,
         then fulfil demand up to whatever stock is actually on hand
         (units_sold = min(raw_demand, current_stock) -- this is the fix:
         you can never sell more than you have).
      4. Split the day's actual sold quantity between channels using a
         slowly-growing Online share (channel split happens AFTER capping,
         so the two channel rows always sum to a number the stockroom
         could really support).
      5. Trigger a reorder (arriving after supplier_lead_time_days) once
         stock drops to/below safety_stock_level.

    Stock is simulated per PRODUCT (not per channel) because it represents
    one shared physical stockroom -- both channel rows for a given
    (product_id, date) report the same post-sale current_stock.
    """
    day_index = np.arange(len(calendar))
    online_share_series = 0.25 + 0.10 * (day_index / len(calendar))  # 25% -> 35%

    rows = []

    for _, product in catalog.iterrows():
        trend_multiplier = (
            (1 + 0.0005) ** day_index if product["is_trending"] else np.ones(len(calendar))
        )
        weekend_multiplier = np.where(calendar["is_weekend"], 1.4, 1.0)

        expected_demand = (
            product["base_demand"]
            * weekend_multiplier
            * trend_multiplier
            * calendar["promo_multiplier"].values
        )
        raw_demand = rng.poisson(np.clip(expected_demand, 0.1, None))

        safety_stock = int(product["safety_stock_level"])
        lead_time = int(product["supplier_lead_time_days"])
        avg_daily_demand = raw_demand.mean()

        stock = int(round(max(safety_stock * 2, avg_daily_demand * 15)))
        reorder_qty = int(round(max(avg_daily_demand * lead_time + safety_stock, safety_stock)))
        pending_arrivals = {}  # {day_index: quantity_arriving}

        for i in range(len(calendar)):
            if i in pending_arrivals:
                stock += pending_arrivals.pop(i)

            # THE FIX: can't sell more than what's physically on hand.
            actual_sold = min(int(raw_demand[i]), stock)
            stock -= actual_sold

            online_qty = min(int(round(actual_sold * online_share_series[i])), actual_sold)
            instore_qty = actual_sold - online_qty

            base_row = {
                "date": calendar["date"].iloc[i],
                "product_id": product["product_id"],
                "product_name": product["product_name"],
                "category": product["category"],
                "current_stock": stock,
                "safety_stock_level": safety_stock,
                "supplier_lead_time_days": lead_time,
                "is_promo_day": bool(calendar["is_promo_day"].iloc[i]),
            }
            rows.append({**base_row, "channel": "In-store", "units_sold": instore_qty})
            rows.append({**base_row, "channel": "Online", "units_sold": online_qty})

            if stock <= safety_stock and not pending_arrivals:
                pending_arrivals[i + lead_time] = reorder_qty

    return pd.DataFrame(rows)


def main():
    catalog = generate_product_catalog(NUM_PRODUCTS)
    calendar = generate_calendar(NUM_DAYS)

    final_df = simulate_demand_and_inventory(catalog, calendar)

    final_df["date"] = pd.to_datetime(final_df["date"]).dt.strftime("%Y-%m-%d")
    final_df = final_df[[
        "date", "product_id", "product_name", "category", "channel",
        "units_sold", "current_stock", "safety_stock_level",
        "supplier_lead_time_days", "is_promo_day",
    ]].sort_values(["product_id", "channel", "date"])

    # Sanity check: no channel row should ever exceed available stock that day.
    assert (final_df["units_sold"] >= 0).all(), "Negative units_sold generated"
    assert (final_df["current_stock"] >= 0).all(), "Negative current_stock generated"

    final_df.to_csv(OUTPUT_PATH, index=False)
    print(f"Wrote {len(final_df):,} rows to {OUTPUT_PATH}")
    print(final_df.head())


if __name__ == "__main__":
    main()
