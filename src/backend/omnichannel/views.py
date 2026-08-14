import logging

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from core.inventory import InsufficientStockError

from .normalizers import normalize_grabmart, normalize_shopeefood, normalize_bemart, PayloadValidationError
from .services import save_normalized_order, OrderSaveError

logger = logging.getLogger(__name__)

# RBAC-2 note (Member 3): the only user-facing endpoint for this feature —
# the Omnichannel order dashboard (U007/S20) — is NOT defined in this file.
# It's the shared `OrderViewSet` in `core/views.py`, which already enforces
# RBAC via `permission_classes = [IsCashier | IsStoreManager | IsChainManager]`
# (core/permissions.py, Member 1). Nothing further to add here for that part.


@method_decorator(csrf_exempt, name='dispatch')
class BaseWebhookView(APIView):
    """
    Shared behavior for every omnichannel platform webhook.
    Subclasses set `platform_name` and implement `verify_signature`.

    RBAC-2 note (Member 3): these webhook endpoints are called by external
    delivery platforms (GrabMart/ShopeeFood/BeMart), not by logged-in staff,
    so there is no Staff/JWT to check `IsCashier`/`IsStoreManager`/
    `IsChainManager` against. Per the project constitution (Principle II),
    machine-to-machine webhook auth is a documented exception to user-facing
    JWT RBAC — signature verification below (`verify_signature`) is this
    endpoint's equivalent of an auth/permission check, not a gap.
    """
    platform_name = "unknown"
    normalizer = None  # one of normalize_grabmart/normalize_shopeefood/normalize_bemart
    authentication_classes = []  # auth here is signature-based, not DRF session/token auth
    permission_classes = []

    def verify_signature(self, request) -> bool:
        """
        Override per platform with the real check (HMAC, shared secret
        header, etc). Return True only if the request is authentic.
        """
        raise NotImplementedError

    def post(self, request, *args, **kwargs):
        # --- 1. Verify the caller is really the platform ---
        try:
            if not self.verify_signature(request):
                logger.warning("Webhook rejected: bad signature (%s)", self.platform_name)
                return Response({"error": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception:
            logger.exception("Signature verification crashed (%s)", self.platform_name)
            return Response({"error": "Signature verification failed"}, status=status.HTTP_401_UNAUTHORIZED)

        # --- 2. Parse payload ---
        try:
            payload = request.data  # DRF parses JSON body into a dict for us
            if not isinstance(payload, dict):
                raise ValueError("Payload must be a JSON object")
        except Exception:
            logger.exception("Failed to parse payload (%s)", self.platform_name)
            return Response({"error": "Invalid JSON payload"}, status=status.HTTP_400_BAD_REQUEST)

        # --- 3. Normalize + persist (OMNI-2) ---
        try:
            order = self.handle_event(payload)
        except (PayloadValidationError, OrderSaveError) as exc:
            logger.warning("Webhook payload rejected (%s): %s", self.platform_name, exc)
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except InsufficientStockError as exc:
            logger.warning("Webhook rejected, insufficient stock (%s): %s", self.platform_name, exc)
            return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)
        except Exception:
            logger.exception("Error handling webhook event (%s)", self.platform_name)
            return Response({"error": "Internal processing error"}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Webhook processed (%s): order_id=%s", self.platform_name, order.order_id)
        return Response({"status": "received", "order_id": order.order_id}, status=status.HTTP_200_OK)

    def handle_event(self, payload: dict):
        """
        OMNI-2: normalize the platform payload and save it as an
        Order/OrderDetail. OMNI-3 (real-time stock deduction) plugs in next,
        inside services.save_normalized_order's transaction.atomic() block.
        """
        normalized = self.normalizer(payload)
        return save_normalized_order(self.platform_name, normalized)


class GrabMartWebhookView(BaseWebhookView):
    platform_name = "GrabMart"
    normalizer = staticmethod(normalize_grabmart)

    def verify_signature(self, request) -> bool:
        token = request.headers.get("X-Grab-Signature")
        return token == settings.GRABMART_WEBHOOK_SECRET


class ShopeeFoodWebhookView(BaseWebhookView):
    platform_name = "ShopeeFood"
    normalizer = staticmethod(normalize_shopeefood)

    def verify_signature(self, request) -> bool:
        token = request.headers.get("X-Shopee-Signature")
        return token == settings.SHOPEEFOOD_WEBHOOK_SECRET


class BeMartWebhookView(BaseWebhookView):
    platform_name = "BeMart"
    normalizer = staticmethod(normalize_bemart)

    def verify_signature(self, request) -> bool:
        token = request.headers.get("X-Bemart-Signature")
        return token == settings.BEMART_WEBHOOK_SECRET