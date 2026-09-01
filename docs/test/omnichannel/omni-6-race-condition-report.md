# OMNI-6: Concurrency & Race Condition Testing Report

## 1. Objective
The goal of this test is to verify that the `omnichannel` webhook endpoint (`/api/webhooks/grabmart/`) correctly handles concurrent requests. Specifically, when multiple requests attempt to purchase the same item at the exact same millisecond, the system must use database locks to ensure that inventory never drops below zero and only valid orders are processed.

---

## 2. Environment & Data Setup

To accurately test the race condition, the database must be seeded with exactly 1 unit of stock. 

### 2.1. Initializing the Database & Superuser
If you are running this test on a fresh Docker volume, run the following commands to prep the database:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py shell -c "from core.models import Role; Role.objects.get_or_create(role_id=1, role_name='admin')"
docker compose exec backend python manage.py createsuperuser
```

### 2.2. Seeding the Test Data (Via Admin Panel)
Log in to the Django Admin dashboard at `http://localhost:8000/admin/` and create the following records in order:

1. **Category:** Create a dummy category (e.g., "Test Category").
2. **Store:** Create a test store. *(Note: Ensure this is the first store so it gets ID = 1).*
3. **Product:** Create a new product. 
   * **Crucial:** Set the Barcode exactly to `RACE-TEST-1`.
4. **Batch:** Create a batch linked to the `RACE-TEST-1` product.
5. **Store Inventory:** Create an inventory record linking the Store, Batch, and Product. 
   * **Crucial:** Set the Quantity to exactly `1`.

---

## 3. Test Configuration (Locust)

The test utilizes `locust` to simulate 5 concurrent users continuously hammering the webhook endpoint without delay. This ensures multiple requests hit the backend at the exact same millisecond.

**`src/backend/tests/performance/locustfile.py`:**

```python
import uuid
from locust import HttpUser, between, task

STORE_ID = 1
BARCODE = "RACE-TEST-1"
WEBHOOK_SECRET = "dev-grabmart-secret"

class RaceConditionUser(HttpUser):
    # wait_time = 0 ensures requests are fired as fast as possible
    wait_time = between(0, 0)

    @task
    def buy_last_unit(self):
        payload = {
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
```

---

## 4. Execution

Execute the load test locally against the Docker backend by running this command from the project root:

```bash
locust -f src/backend/tests/performance/locustfile.py --headless -u 5 -r 5 -t 10s --host http://localhost:8000
```

### Important: Resetting Between Runs
Because successful Locust requests permanently update the database, the inventory will be 0 after a successful test run. 

If you run the test again while inventory is at 0, all requests will fail. To run the test again and see a successful purchase, you must restock the item by going to `http://localhost:8000/admin/`, navigating to Store Inventories, and changing the quantity of `RACE-TEST-1` back to `1`.

---

## 5. Results & Analysis

**Locust Terminal Output:**

```text
Type     Name                                                         # reqs      # fails |    Avg     Min     Max    Med |   req/s  failures/s
--------|-----------------------------------------------------------|-------|-------------|-------|-------|-------|-------|--------|-----------
POST     /webhooks/grabmart/ (race condition)                            380  379(99.74%) |    121      88     423    120 |   41.04       40.93

Error report
# occurrences      Error                                                                                                                  
------------------|----------------------------------------------------------------------------------------------------------------------------
379                POST /webhooks/grabmart/ (race condition): HTTPError('409 Client Error: Conflict for url: /api/webhooks/grabmart/')
```

### Findings

* **Total Concurrent Requests:** 380 requests were fired at the endpoint within a 10-second window.
* **Successful Requests:** Exactly 1 request succeeded (200 OK), effectively purchasing the single unit of inventory.
* **Failed Requests:** Exactly 379 requests failed with a 409 Conflict, properly rejecting the order due to insufficient stock.
* **Final Database State:** The StoreInventory quantity for `RACE-TEST-1` reached exactly 0 and did not fall into negative numbers. 

---

## 6. Conclusion
**PASS.** The application successfully implements database concurrency control (row locking). The race condition is mitigated, and inventory integrity is strictly maintained even under heavy simultaneous load.