"""
OMNI-6: Locust stress test for the concurrency/race-condition requirement.

NOT part of the automated Django test suite and NOT required for
`docker compose up` -- this is a standalone tool you run manually to produce
the OMNI-6 test report. Requires `pip install locust` on your host (or add
`locust` to src/backend/requirements.txt if the team wants it containerized).

Usage:
    1. Seed one product with a small known stock quantity (e.g. 1 unit) via
    the admin panel or a management command, and note its barcode.
    2. Update BARCODE / STORE_ID below to match.
    3. Run:
        locust -f src/backend/tests/performance/locustfile.py --headless -u 5 -r 5 -t 10s --host http://localhost:8000
    4. Check the DB afterwards: total deducted quantity must equal the
    number of requests that actually got a 200, StoreInventory.quantity
    must never go negative, and no orphaned Order rows should exist.
"""

import uuid

from locust import HttpUser, between, task

# Adjust these to match a real seeded product/store in your local DB before running.
STORE_ID = 1
BARCODE = "RACE-TEST-1"
WEBHOOK_SECRET = "dev-grabmart-secret"


class RaceConditionUser(HttpUser):
    # No think-time between requests -- we want requests as close to
    # simultaneous as possible to actually exercise the race condition.
    wait_time = between(0, 0)

    @task
    def buy_last_unit(self):
        """Simulate one GrabMart webhook delivery trying to buy 1 unit of the
        same product every other simulated user is also trying to buy."""
        payload = {
            # Unique per request so idempotency doesn't collapse concurrent
            # attempts into a single order -- we want genuinely competing orders.
            "orderId": f"LOCUST-{uuid.uuid4()}",
            "storeId": STORE_ID,
            "orderTime": "2026-08-14T09:30:00Z",
            "paymentMethod": "GrabPay",
            "items": [{"barcode": BARCODE, "qty": 1, "price": "0.90"}],
        }
        self.client.post(
            "/api/webhooks/grabmart/",
            json=payload,
            headers={"X-Grab-Signature": WEBHOOK_SECRET},
            name="/webhooks/grabmart/ (race condition)",
        )