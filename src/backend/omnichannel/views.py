import logging

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from .normalizers import normalize_grabmart, normalize_shopeefood, normalize_bemart, PayloadValidationError
from .services import save_normalized_order, OrderSaveError

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class BaseWebhookView(APIView):
    """
    Shared behavior for every omnichannel platform webhook.
    Subclasses set `platform_name` and implement `verify_signature`.
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
        except Exception:
            logger.exception("Error handling webhook event (%s)", self.platform_name)
            return Response({"error": "Internal processing error"}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Webhook processed (%s): order_ref=%s", self.platform_name, payload.get("order_id"))
        return Response({"status": "received"}, status=status.HTTP_200_OK)

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