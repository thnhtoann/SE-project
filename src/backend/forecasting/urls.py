from django.urls import path

from .views import ForecastOverviewView

urlpatterns = [
    path('forecast/', ForecastOverviewView.as_view(), name='demand-forecast'),
]
