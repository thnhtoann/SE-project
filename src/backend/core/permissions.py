from rest_framework.permissions import BasePermission


class IsCashier(BasePermission):
    """Allows access to staff with the Cashier role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role_name == 'Cashier'
        )


class IsStoreManager(BasePermission):
    """Allows access to staff with the Store Manager role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role_name == 'Store Manager'
        )


class IsChainManager(BasePermission):
    """Allows access to staff with the Chain Manager role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role_name == 'Chain Manager'
        )
