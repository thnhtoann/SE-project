from django.urls import path

from .views import AdvisorAnalyzeView

urlpatterns = [
    path('analyze/', AdvisorAnalyzeView.as_view(), name='advisor-analyze'),
]
