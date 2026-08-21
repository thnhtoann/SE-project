from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

# Import tất cả các View xử lý Auth từ app core
from core.views import (
    LogoutView,
    LoginRequestOTPView,
    LoginVerifyOTPView, BestWorstSellerView
)

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Refresh Token (Lấy Token mới khi token cũ hết hạn)
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Luồng Đăng nhập 2 lớp (Mới)
    path('api/login/request-otp/', LoginRequestOTPView.as_view(), name='login-request-otp'),
    path('api/login/verify-otp/', LoginVerifyOTPView.as_view(), name='login-verify-otp'),
    
    # API Đăng xuất
    path('api/logout/', LogoutView.as_view(), name='logout'),
    
    # Kết nối sang các API nghiệp vụ của app core (Sản phẩm, Đơn hàng,...)
    path('api/', include('core.urls')),
    
    # Kết nối sang các API webhook
    path('api/webhooks/', include('omnichannel.urls')),
    path("api/pos/", include("pos.urls")),

    # Mặt hàng bán chạy và ế nhất
    path('api/reports/sales-performance/', BestWorstSellerView.as_view(), name='sales-performance-report'),

    path('api/procurement/', include('forecasting.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
