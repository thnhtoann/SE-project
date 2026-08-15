from django.contrib import admin
from django.urls import path, include
from core.views import CustomLoginView, LogoutView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # API Đăng nhập (Lấy Token)
    #path('api/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # API Refresh Token (Lấy Token mới khi cái cũ hết hạn)
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    #kết nối sang app core
    path('api/', include('core.urls')),
    path('api/login/', CustomLoginView.as_view(), name='login'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    path('api/webhooks/', include('omnichannel.urls')),
    path('api/forecasting/', include('forecasting.urls')),
]
