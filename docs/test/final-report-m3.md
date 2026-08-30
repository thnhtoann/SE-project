# M3 Final Regression Report — Sprint 3 / FINAL-1

**Member**: M3 (Jukati)
**Modules covered**: Omnichannel Hub (OMNI-1–6), ACID Transactions, Smart Procurement Demand
Forecasting (FCST-1–6)
**Date**: 2026-08-30
**Scope**: Re-verification of all M3-owned features ahead of PA4 final demo/report, per
`FINAL-1` (full end-to-end regression testing across all modules — each member covers their own).

This is a summary index. Full evidence for each item lives in its own permanent file under
`docs/test/`, per `.claude/rules/testing.md` — nothing below duplicates those reports' content.

---

## 1. Automated test suite

```bash
docker compose exec backend python manage.py test omnichannel core forecasting
```

**Result: PASS — 44/44 tests, 0 failures, ~6.5s**

```
Found 44 test(s).
..Webhook payload rejected (GrabMart): Unknown product barcode: 0000000000000
..200 [order list payload — 2 orders returned, POS + GrabMart]
./usr/local/lib/.../fields/__init__.py:1655: RuntimeWarning: DateTimeField Order.order_date
  received a naive datetime (2026-08-14 09:30:00) while time zone support is active.
.....................................Generated 20 synthetic DailySalesRecord rows across 2 products.
..
----------------------------------------------------------------------
Ran 44 tests in 6.499s

OK
```

Covers:
- `omnichannel/tests.py` — OMNI-2 normalization, OMNI-4 rollback-on-failure, OMNI-5 channel filter
- `core/test_race_condition.py` — OMNI-3/OMNI-6 concurrent stock deduction
- `core/tests.py::DeductStockTests` — OMNI-3 FEFO batch-deduction logic
- `forecasting/tests.py` — FCST-4 `evaluate_reorder`, PROC-6 synthetic data command

**Finding (non-blocking)**: a `RuntimeWarning` about a naive datetime on `Order.order_date` in
one test fixture (`USE_TZ = True` but the fixture doesn't pass a timezone-aware value). Doesn't
fail the test or affect production code paths, but worth a follow-up fixture cleanup.

---

## 2. OMNI-1 — Webhook listener verification

Re-confirmed against `docs/test/omni-1-webhook-verification.md`.

**Result: PASS** — all 3 platforms (GrabMart, ShopeeFood, BeMart) accept valid-signature
requests and reject missing/invalid signatures with 401.

---

## 3. OMNI-6 — Race condition / concurrency

Re-confirmed against `docs/test/omni-6-race-condition-report.md`.

**Result: PASS** — 380 concurrent requests for 1 unit of stock: exactly 1 succeeded (200), 379
correctly rejected (409 Insufficient Stock). Final inventory quantity landed at exactly 0, never
negative.

---

## 4. FCST-1–6 — Demand forecasting

Re-confirmed against `docs/test/fcst-forecast-verification.md`.

**Result: PASS** — 20/20 synthetic products fit by Prophet with zero skips. RBAC enforced
(401 unauthenticated, 200 for Store/Chain Manager role). Reorder recommendations computed
correctly via `po_logic.evaluate_reorder()`.

**Outstanding**: FINAL-7's "tune ML accuracy against real Docker/Postgres output" work is
tracked separately and not yet complete — this regression pass only re-confirms the
already-verified baseline, not new tuning.

---

## 5. Postman collection — OMNI-1, OMNI-5, FCST-5

**Collection**: `docs/test/omnichannel-forecasting.postman_collection.json`

**Result: PASS** — 21/21 assertions passing once stock and token were correctly seeded (see
Findings below for two test-setup issues hit and resolved during this pass).

| Section | Requests | Result |
|---|---|---|
| Webhooks (GrabMart/ShopeeFood/BeMart valid + invalid signature, GrabMart duplicate) | 7 | PASS |
| OMNI-5 order list (all, filtered by channel, unauthenticated) | 3 | PASS |
| FCST-5 forecast overview (unauthenticated, authenticated, risk-filtered) | 3 | PASS |
| Auth (2-step OTP → JWT) | 2 | PASS (manual run) |

### Findings during this test pass (test-environment issues, not application bugs)

1. **OTP step cannot run inside the Collection Runner.** "Step 1: Request OTP" generates a new
   OTP every time it's called, invalidating any code manually copied beforehand. The 2-step
   login must be run manually (Step 1 → read OTP from
   `docker compose logs --tail=30 backend` → paste into the `otpCode` variable → Step 2),
   never as part of a full automated Runner pass. This is expected behavior for a real 2FA flow,
   not a defect.
2. **Webhook valid-signature requests initially failed with 409 Insufficient Stock** because the
   test seed script created a `Product` but no `Batch`/`StoreInventory` row. Fixed by seeding a
   `StoreInventory` row with sufficient quantity before running the webhook section — confirms
   `deduct_stock()` correctly rejects a sale against zero available stock rather than allowing
   negative inventory.
3. **JWT token expiry (4h, per `SIMPLE_JWT.ACCESS_TOKEN_LIFETIME`) causes 401s on Orders/Forecast
   requests in later sessions** if the cached `{{token}}` variable is more than 4 hours old.
   Confirms token expiry is enforced as configured. Resolved for repeat local testing by minting
   a fresh token via Django shell (`RefreshToken.for_user(...)`) rather than re-running the full
   OTP flow every session — acceptable for local test iteration since it doesn't bypass any
   actual user's credential check, only skips re-doing 2FA for an already-known test account.

---

## 6. Test setup commands (for reproducing this pass)

These are local-only helper commands used to seed data and obtain a JWT without going through
UI/email each time. Not production code — `docker compose exec` shell one-liners for test setup.

### Seed a test user (Chain Manager role)

```bash
docker compose exec backend python manage.py shell -c "
from core.models import Role, Staff
role, _ = Role.objects.get_or_create(role_name='Chain Manager')
Staff.objects.create_user(username='cm_test', password='testpass123', full_name='CM Test', role=role, email='cm_test@example.com')
"
```

### Seed Store/Product/Batch/StoreInventory (required before running webhook tests)

```bash
docker compose exec backend python manage.py shell -c "
from datetime import date, timedelta
from core.models import Store, Category, Product, Batch, StoreInventory

store, _ = Store.objects.get_or_create(pk=1, defaults={'store_name': 'Test Store', 'location': 'HCMC'})
cat, _ = Category.objects.get_or_create(category_name='Beverages')
product, _ = Product.objects.get_or_create(
    barcode='8934673125456',
    defaults={'product_name': 'Sparkling Water', 'base_price': '0.90', 'min_threshold': 10, 'category': cat},
)
batch, _ = Batch.objects.get_or_create(
    product=product,
    manufacture_date=date.today() - timedelta(days=10),
    expiration_date=date.today() + timedelta(days=60),
)
inv, created = StoreInventory.objects.get_or_create(store=store, batch=batch, defaults={'quantity': 20})
if not created:
    inv.quantity = 20
    inv.save()
print('Seeded: Store', store.store_id, '| Product', product.product_id, '| StoreInventory qty', inv.quantity)
"
```

Re-run this before each webhook test session — it resets stock back to 20 regardless of how much
prior runs deducted (`get_or_create` is idempotent; safe to run repeatedly).

### Mint a JWT directly (bypasses OTP, for local test iteration only)

Used when a previously-issued token has expired (4h lifetime) and re-doing the full OTP flow
(reading a fresh code from logs each time) isn't practical during rapid test iteration:

```bash
docker compose exec backend python manage.py shell -c "
from rest_framework_simplejwt.tokens import RefreshToken
from core.models import Staff
user = Staff.objects.get(username='cm_test')
refresh = RefreshToken.for_user(user)
print('ACCESS TOKEN:', str(refresh.access_token))
"
```

Copy the printed token into the Postman collection's `token` variable (collection **Variables**
tab → `token` → Current Value). Valid for 4 hours from generation.

**Note**: this shortcut is only appropriate for local/dev testing against a known test account —
it does not exercise the actual OTP verification path. To validate the real 2-step login end to
end, run the Auth folder's two requests manually (Step 1 → read OTP from
`docker compose logs --tail=30 backend` → Step 2), never inside the Collection Runner (see
Finding 1 above).

---

## Conclusion

**M3's owned features (OMNI-1 through OMNI-6, ACID transaction handling, FCST-1 through FCST-6)
are regression-clean** as of this pass: 44/44 automated tests pass, all 3 webhook platforms
verified, race-condition safety re-confirmed under load, forecasting pipeline verified end-to-end
with RBAC enforced, and a new Postman collection now exists (previously only Smart Procurement/M2
had one) covering OMNI-1/OMNI-5/FCST-5 as a reusable, importable artifact for the team.

**Follow-ups tracked, not blocking**:
- Naive-datetime `RuntimeWarning` in a test fixture (cosmetic)
- FINAL-7 real-data ML tuning pass (separate, in progress)
- `docs/test/final-report-m3.md` (this file) to be linked from the team's overall FINAL-4 final
  report rather than pasted into it
