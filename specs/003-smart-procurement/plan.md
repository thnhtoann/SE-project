# Implementation Plan: Smart Procurement

**Branch**: `003-smart-procurement` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-smart-procurement/spec.md`

## Summary

A Django app for Chain Managers covering three linked capabilities: automatic minimum-inventory
alerts sourced from the shared `StoreInventory`/`Product` data, supplier record management, and
purchase-order creation with manual shipment-status tracking — all exposed as REST endpoints and
a Next.js management-portal UI.

## Technical Context

**Language/Version**: Python 3.12 (Django backend), TypeScript (Next.js 14 / React 18 frontend)
— same stack as `001-pos-checkout` and `002-omnichannel-hub`, per `CLAUDE.md`.

**Primary Dependencies**: Django REST Framework; a periodic/triggered check for minimum-threshold
breaches (see Constraints below — mechanism is an open implementation decision, not fixed by the
source documents).

**Storage**: PostgreSQL, 3NF schema per PA2 §4.2 (`SUPPLIER`, `PURCHASE_ORDER`,
`PURCHASE_ORDER_DETAIL` tables); reads `PRODUCT.MinThreshold` and `STORE_INVENTORY.Quantity`
(owned by the shared catalog/inventory data, not this feature) to evaluate alerts.

**Testing**: Django's built-in test runner (`docker compose exec backend python manage.py test`).
Frontend test runner: NEEDS CLARIFICATION, same open item as the other two features.

**Target Platform**: Django API on the existing Docker Compose / Linux VPS deployment; Chain
Manager UI in the Next.js Management Portal.

**Project Type**: Web application (frontend + backend split), consistent with the other features.

**Performance Goals**: Alert delivery within 1 hour of a threshold breach (SC-001); a 10-line
purchase order created and totaled in under 5 minutes of Chain Manager interaction (SC-003).

**Constraints**: **NEEDS CLARIFICATION** — the minimum-inventory check is described in PA1 as
"continuous monitoring" (U011) but PA0's stack (Django + PostgreSQL, no message queue or
scheduler named) doesn't specify the mechanism. Two reasonable options: (a) evaluate the
threshold synchronously inside the same inventory-deduction code path `001`/`002` already use
(check-after-write, no separate scheduler needed, but only fires on a write, not on standalone
threshold-config changes), or (b) a periodic scheduled job (e.g. Celery beat or Django management
command on a cron). Recommend (a) as the simpler default consistent with Constitution Principle
II (Simplicity First is a Karpathy Skills principle in `CLAUDE.md`, not the Spec Kit constitution,
but applies here too) — confirm with the team before implementation.

**Scale/Scope**: Same multi-branch chain scope as the other features; PA0/PA1 do not state a
target number of suppliers or concurrent purchase orders.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.0.0:

- **I. API-First, Client-Server Architecture** — PASS. Supplier, purchase-order, and alert
  functionality is exposed via REST endpoints only.
- **II. Stateless JWT Authentication & RBAC** — PASS. All endpoints in this feature require an
  authenticated Chain Manager-role JWT (PA1 NFR1: "Only authorized users can manage supplier
  information" / "access shipment tracking information").
- **III. Data Integrity: 3NF + ACID** — PASS. Purchase order + line item creation (FR-007/FR-008)
  MUST be a single atomic write so a partially-saved order (header without line items, or vice
  versa) can never occur.
- **IV. Event-Driven Integration via Webhooks** — PARTIAL / NOT DIRECTLY APPLICABLE. This feature
  has no external-platform webhook surface; shipment status is entered manually (see spec
  Assumptions). If the team later integrates a supplier/logistics tracking API, that MUST follow
  the webhook pattern per this principle rather than polling — flagged for future work, not a
  current violation.
- **V. UML-Documented, Version-Controlled Design** — PASS. User stories map directly to PA1's
  UML-derived use cases U009-U011.
- **VI. Hardware & Network Realism** — PASS (not directly applicable — no POS hardware surface in
  this feature).

No violations identified. Complexity Tracking table is not applicable and is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/003-smart-procurement/
├── plan.md              # This file
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

*(No `research.md`, `data-model.md`, `contracts/`, or `quickstart.md` generated for this pass —
same rationale as the other two features, except the alert-mechanism NEEDS CLARIFICATION above,
which is a genuine open decision the team should resolve, not something PA0/PA1/PA2 already
answer.)*

### Source Code (repository root)

```text
src/backend/
├── procurement/                # New Django app
│   ├── models.py                # Supplier, PurchaseOrder, PurchaseOrderDetail, InventoryAlert
│   ├── serializers.py
│   ├── views.py                 # Supplier CRUD, PO create/list, shipment status update
│   ├── alerts.py                 # Minimum-threshold check logic (see Constraints)
│   └── urls.py                   # Included from config/urls.py under /api/procurement/
└── config/
    ├── settings.py               # `procurement` added to INSTALLED_APPS
    └── urls.py

src/frontend/
└── app/(defaults)/procurement/
    ├── suppliers/
    │   └── page.tsx               # Supplier list/management (no PA2 mockup — new screen)
    ├── purchase-orders/
    │   └── page.tsx               # Purchase order creation/list (no PA2 mockup — new screen)
    └── alerts/
        └── page.tsx                # Minimum inventory alerts (no PA2 mockup — new screen)
```

**Structure Decision**: New `procurement` Django app under `src/backend/`, following the
`django-app-scaffolder` skill's convention. Unlike `001-pos-checkout` and `002-omnichannel-hub`,
PA2's Figma prototype does not map any screen to supplier/PO/alert management (see this feature's
`checklists/requirements.md`), so the frontend routes above are proposed fresh rather than mapped
to an existing mockup — flag for a design pass before implementation.

## Complexity Tracking

No constitution violations were identified for this feature; this section is not applicable and
is intentionally left without entries.
