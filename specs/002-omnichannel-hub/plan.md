# Implementation Plan: Omnichannel Hub

**Branch**: `002-omnichannel-hub` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-omnichannel-hub/spec.md`

## Summary

A webhook-driven backend service that ingests orders from GrabMart, ShopeeFood, and BeMart,
surfaces them on a unified Store Manager dashboard, and deducts `StoreInventory` in real time
for every completed sale regardless of channel — sharing the `Order`/`OrderDetail` schema with
`001-pos-checkout` so POS and online sales draw from and update the same stock numbers.

## Technical Context

**Language/Version**: Python 3.12 (Django backend), TypeScript (Next.js 14 / React 18 frontend)
— same stack as `001-pos-checkout`, per `CLAUDE.md`.

**Primary Dependencies**: Django REST Framework for the dashboard/status API; a webhook receiver
endpoint per delivery platform (GrabMart, ShopeeFood, BeMart) implemented as Django views, not a
separate service, to keep the "no polling" webhook pattern (Constitution Principle IV) inside the
existing API-first backend.

**Storage**: PostgreSQL, same `Order`/`OrderDetail`/`StoreInventory` schema as `001-pos-checkout`
(PA2 §4.2); this feature's webhook handlers and `001`'s checkout flow both write through the same
inventory-deduction code path so the "0% oversell" success criterion (SC-002) holds regardless of
which channel triggers it.

**Testing**: Django's built-in test runner (`docker compose exec backend python manage.py test`)
for webhook handling and inventory-deduction logic — this is the highest-value place for
concurrency tests (simultaneous POS + online deduction of the same product, per the Edge Cases in
`spec.md`). Frontend test runner: NEEDS CLARIFICATION, same open item as `001-pos-checkout`.

**Target Platform**: Django API on the existing Docker Compose / Linux VPS deployment; dashboard
rendered in the Next.js Management Portal.

**Project Type**: Web application (frontend + backend split), consistent with `001-pos-checkout`.

**Performance Goals**: New orders visible on the dashboard within 1 minute of being placed
(SC-001); inventory deduction applied immediately (same transaction as order completion, not a
deferred job).

**Constraints**: Webhook receivers MUST be idempotent — a duplicate delivery of the same
platform event MUST NOT double-deduct inventory (Edge Cases). Inventory deduction MUST be atomic
with the completing order write, and MUST be the same guarded code path `001-pos-checkout` uses,
so a concurrent POS sale and online order for the last unit of a product cannot both succeed
(Constitution Principle III; spec Acceptance Scenario US2.3).

**Scale/Scope**: Same multi-branch chain scope as `001-pos-checkout`; concurrent webhook volume
from three platforms is not quantified in PA0/PA1 — NEEDS CLARIFICATION if a specific
events-per-second target is required before implementation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.0.0:

- **I. API-First, Client-Server Architecture** — PASS. The dashboard is a REST API client;
  webhook receivers are API endpoints, not a separate rendering layer.
- **II. Stateless JWT Authentication & RBAC** — PASS. Dashboard endpoints require an authenticated
  Store Manager-role JWT. Inbound platform webhooks authenticate via the platform's own signing
  scheme (not user JWTs) — this is a deliberate, documented exception for machine-to-machine
  webhook auth, not a violation of user-facing RBAC.
- **III. Data Integrity: 3NF + ACID** — PASS, with the same explicit obligation as
  `001-pos-checkout`: inventory deduction MUST be atomic with order completion, for every channel.
  This feature's central risk (Edge Cases: simultaneous POS + online sale of the last unit) is
  exactly what this principle exists to prevent — the plan MUST route all deduction through one
  shared, transaction-guarded code path rather than per-channel copies.
- **IV. Event-Driven Integration via Webhooks** — PASS by design: this feature *is* the webhook
  integration the principle describes (FR-001, FR-009). No polling of GrabMart/ShopeeFood/BeMart
  is introduced.
- **V. UML-Documented, Version-Controlled Design** — PASS. User stories map directly to PA1's
  UML-derived use cases U007-U008.
- **VI. Hardware & Network Realism** — PASS (not directly applicable — this feature has no POS
  hardware surface — but network-failure handling for platform connectivity, FR-009, follows the
  same "clear error, not silent failure" standard the principle sets for POS network loss).

No violations identified. Complexity Tracking table is not applicable and is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/002-omnichannel-hub/
├── plan.md              # This file
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

*(No `research.md`, `data-model.md`, `contracts/`, or `quickstart.md` generated for this pass —
same rationale as `001-pos-checkout`: stack and schema are already fixed by `CLAUDE.md` and PA2.)*

### Source Code (repository root)

```text
src/backend/
├── omnichannel/                # Existing app (currently just apps.py/urls.py/views.py,
│   │                            # no models.py yet — see CLAUDE.md's Structure section)
│   ├── models.py                # StoreInventory / Batch deduction logic; Order reused from
│   │                             # the shared `orders` app introduced by 001-pos-checkout
│   ├── webhooks.py               # One handler per platform: GrabMart, ShopeeFood, BeMart
│   ├── serializers.py
│   ├── views.py                  # Dashboard list/detail, status-update endpoints
│   └── urls.py                   # Included from config/urls.py under /api/omnichannel/
└── config/
    └── urls.py

src/frontend/
└── app/(defaults)/omnichannel/
    └── orders/
        └── page.tsx               # Online Orders dashboard — S20
```

**Structure Decision**: Reuses the existing (currently empty) `omnichannel` Django app noted in
`CLAUDE.md`'s Structure section rather than creating a new one — this feature is exactly what
that app was scaffolded for. Depends on the shared `Order`/`OrderDetail` models from
`001-pos-checkout`'s `orders` app (see that plan's Cross-feature note); adds its own
`StoreInventory` deduction logic and per-platform webhook views. Frontend adds an `omnichannel`
route group under the existing `(defaults)` App Router group.

## Complexity Tracking

No constitution violations were identified for this feature; this section is not applicable and
is intentionally left without entries.
