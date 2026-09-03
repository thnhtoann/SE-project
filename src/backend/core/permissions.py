from rest_framework.permissions import BasePermission

# Numeric seniority for role-hierarchy checks (e.g. "can this staff member
# change that staff member's branch?") that plain role-name comparisons
# can't express. Admin ranks alongside Chain Manager, matching every
# Is*Permission class above.
ROLE_RANK = {
    'Cashier': 1,
    'Store Manager': 2,
    'Chain Manager': 3,
    'Admin': 3,
}


class IsCashier(BasePermission):
    """Thu ngân, Quản lý cửa hàng, Quản lý chuỗi và Admin đều có quyền của Thu ngân"""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.role and 
            request.user.role.role_name in ['Cashier', 'Store Manager', 'Chain Manager', 'Admin']
        )

class IsStoreManager(BasePermission):
    """Quản lý cửa hàng, Quản lý chuỗi và Admin có quyền quản lý kho/cửa hàng"""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.role and 
            request.user.role.role_name in ['Store Manager', 'Chain Manager', 'Admin']
        )

class IsChainManager(BasePermission):
    """Chỉ Quản lý chuỗi và Admin mới có quyền tối cao toàn hệ thống"""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.role and 
            request.user.role.role_name in ['Chain Manager', 'Admin']
        )