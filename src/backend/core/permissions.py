from rest_framework.permissions import BasePermission

class IsCashier(BasePermission):
    """Thu ngân, Quản lý cửa hàng, Quản lý chuỗi và Admin đều có quyền của Thu ngân"""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.role and 
            request.user.role.role_name in ['Cashier', 'Store Manager', 'Chain Manager', 'Admin']
        )

# class IsStoreManager(BasePermission):
#     """Quản lý cửa hàng, Quản lý chuỗi và Admin có quyền quản lý kho/cửa hàng"""
#     def has_permission(self, request, view):
#         return bool(
#             request.user and request.user.is_authenticated and request.user.role and 
#             request.user.role.role_name in ['Store Manager', 'Chain Manager', 'Admin']
#         )

# class IsChainManager(BasePermission):
#     """Chỉ Quản lý chuỗi và Admin mới có quyền tối cao toàn hệ thống"""
#     def has_permission(self, request, view):
#         return bool(
#             request.user and request.user.is_authenticated and request.user.role and 
#             request.user.role.role_name in ['Chain Manager', 'Admin']
#         )
class IsStoreManager(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or not request.user.role:
            return False
        # Chuẩn hóa tên role: đưa về viết thường và xóa sạch khoảng trắng để chấp nhận cả 2 kiểu DB
        role_name = request.user.role.role_name.replace(" ", "").lower()
        return role_name in ['storemanager']

class IsChainManager(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or not request.user.role:
            return False
        role_name = request.user.role.role_name.replace(" ", "").lower()
        return role_name in ['chainmanager']

class IsChainManagerOrStoreManagerForStaff(BasePermission):
    """Cho phép bất kỳ user nào đã đăng nhập đi vào view, việc phân quyền chi tiết xử lý ở View/Serializer."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)