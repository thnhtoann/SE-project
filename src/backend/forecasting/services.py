"""
FCST-3: Demand forecasting service (Prophet-based).

Trains one Prophet model per product from its DailySalesRecord history and forecasts total
expected demand over a given horizon (normally the product's supplier lead time).

IMPORTANT: this is intentionally NOT called from the API request path. A Prophet fit takes
roughly 1-5+ seconds per product, so training here must run out-of-band (see
management/commands/run_demand_forecast.py) and the API (views.py) reads the cached
DemandForecast row instead. Wire run_demand_forecast up to a daily cron/Celery beat job before
relying on this in anything other than manual/demo use.
"""
import logging

import pandas as pd
from prophet import Prophet

from core.models import Product

from .models import DailySalesRecord

logger = logging.getLogger(__name__)

# Prophet needs a reasonable amount of history to fit a trend/weekly-seasonality curve;
# below this we'd just be extrapolating noise, so we refuse rather than return a bogus number.
MIN_TRAINING_DAYS = 14


class InsufficientHistoryError(Exception):
    """Raised when a product doesn't have enough sales history to train a forecast."""


class DemandForecastService:
    """Forecasts future demand for a single product from its historical daily sales."""

    def __init__(self, product: Product):
        self.product = product

    def _load_training_frame(self) -> pd.DataFrame:
        """Builds the two-column (ds, y) frame Prophet requires, summing units_sold across
        every store/channel so the model sees one aggregate demand series per product per day."""
        qs = DailySalesRecord.objects.filter(product=self.product)
        df = pd.DataFrame.from_records(qs.values('sale_date', 'units_sold', 'is_promo_day'))
        if df.empty:
            return df

        df = df.groupby('sale_date', as_index=False).agg(
            units_sold=('units_sold', 'sum'),
            is_promo_day=('is_promo_day', 'max'),
        )
        df = df.rename(columns={'sale_date': 'ds', 'units_sold': 'y'})
        df['ds'] = pd.to_datetime(df['ds'])
        df['is_promo_day'] = df['is_promo_day'].astype(int)
        return df

    def forecast(self, horizon_days: int) -> dict:
        """Fits Prophet on this product's history and returns the SUMMED expected demand
        (point estimate plus lower/upper uncertainty bounds) over the next `horizon_days`.

        Returns: {'expected_demand': float, 'expected_demand_lower': float, 'expected_demand_upper': float}
        Raises: InsufficientHistoryError if there isn't enough history to fit a model.
        """
        df = self._load_training_frame()
        if len(df) < MIN_TRAINING_DAYS:
            raise InsufficientHistoryError(
                f"Product {self.product.product_id} has only {len(df)} day(s) of history; "
                f"need at least {MIN_TRAINING_DAYS} to forecast."
            )

        model = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
        model.add_regressor('is_promo_day')
        model.fit(df)

        future = model.make_future_dataframe(periods=horizon_days)
        # Simplification: assumes no promo days in the forecast window. A future iteration
        # could accept a list of planned promo dates from the caller instead of hardcoding 0.
        future['is_promo_day'] = 0
        prediction = model.predict(future)

        future_only = prediction[prediction['ds'] > df['ds'].max()]
        return {
            'expected_demand': max(0.0, float(future_only['yhat'].sum())),
            'expected_demand_lower': max(0.0, float(future_only['yhat_lower'].sum())),
            'expected_demand_upper': max(0.0, float(future_only['yhat_upper'].sum())),
        }
