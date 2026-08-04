# Implementation Plan: POS Checkout

**Branch**: `001-pos-checkout` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-pos-checkout/spec.md`

## Summary

A hotkey-driven POS checkout screen for Cashiers: scan/search products, accept cash or Bank QR
payment, print a receipt and trigger the cash drawer only after confirmed payment, and deduct
inventory in the same transaction. Backed by a Django REST API (`Order`/`OrderDetail` per PA2's
data design) behind JWT auth, consumed by a Next.js SPA route that talks to browser hardware
(barcode scanner, thermal printer, cash drawer) via WebUSB/WebBluetooth.

## Technical Context

**Language/Version**: Python 3.12 (Django backend, per `CLAUDE.md`), TypeScript (Next.js 14 /
React 18 frontend, per `CLAUDE.md` — the "SPA" requirement in PA0/PA1 is satisfied by this
repo's existing Next.js App Router setup).

**Primary Dependencies**: Django REST Framework (backend); the existing Next.js/React/Tailwind
stack in `src/frontend/` (frontend), consuming the API over JSON.

**Storage**: PostgreSQL, 3NF schema, transactional writes for payment + inventory deduction (see
Constitution Principle III).

**Testing**: Django's built-in test runner for the backend (`docker compose exec backend python
manage.py test`, per `.claude/rules/testing.md`). Frontend test runner: NEEDS CLARIFICATION —
`.claude/rules/testing.md` notes none is configured yet; pick one (e.g. Jest/RTL) before writing
POS UI tests, and update that rules file per its own instruction to document the run command.

**Target Platform**: Browser-based SPA (Chrome/Firefox/Safari/Edge) talking to local retail
peripherals via WebUSB/WebBluetooth; Django API served from the existing Docker Compose stack
locally and a Linux VPS/cloud instance in production (per the constitution's Technology Stack
section).

**Project Type**: Web application (frontend + backend split — matches this repo's existing
`src/backend/` + `src/frontend/` structure).

**Performance Goals**: Barcode-to-display under 1s (SC-002); full 3-5 item cash checkout under
30s (SC-001); cash drawer trigger within 1s of confirmed payment (SC-003).

**Constraints**: Cash drawer command MUST NOT be sent before payment is confirmed successful —
this is a correctness rule (Constitution Principle VI), not just a performance target. Bank QR
confirmation MUST arrive via webhook, not polling (Constitution Principle IV). Inventory
deduction on payment MUST be atomic with the transaction write (Constitution Principle III).

**Scale/Scope**: Single store chain, multiple branches (PA0 §2.1); PA0/PA1 do not state a target
concurrent-cashier or transactions-per-second number — NEEDS CLARIFICATION if a specific load
target is required before implementation; not blocking for an initial single-branch build.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.0.0:

- **I. API-First, Client-Server Architecture** — PASS. The POS SPA is a pure API client; all
  checkout logic (FR-001–FR-016) is exposed via Django REST endpoints, no server-rendered views.
- **II. Stateless JWT Authentication & RBAC** — PASS. Checkout endpoints require an authenticated
  Cashier-role JWT; no server-side session state is introduced.
- **III. Data Integrity: 3NF + ACID** — PASS, with an explicit implementation obligation: the
  payment-confirmation → inventory-deduction → transaction-completion sequence (FR-006, FR-008)
  MUST run inside a single atomic database transaction so a failure partway through cannot leave
  inventory deducted without a completed order, or vice versa.
- **IV. Event-Driven Integration via Webhooks** — PASS. Bank QR payment confirmation (FR-006) is
  received via webhook from the payment service, matching the Observer/Webhook pattern; no polling
  of the banking API is introduced.
- **V. UML-Documented, Version-Controlled Design** — PASS. This feature's user stories map
  directly to PA1's UML-derived use cases U002-U006; no new undocumented flows are introduced.
- **VI. Hardware & Network Realism** — PASS. FR-002/FR-010/FR-011/FR-012 directly implement the
  scanner/printer/drawer integration and payment-before-drawer-open rule this principle requires.

No violations identified. Complexity Tracking table is not applicable and is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/001-pos-checkout/
├── plan.md              # This file
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

*(No `research.md`, `data-model.md`, `contracts/`, or `quickstart.md` were generated for this
pass — the technology stack and data shape were already fixed by `CLAUDE.md` and PA2's existing
class/data design rather than requiring new research; see the Key Entities section of `spec.md`
and PA2 §3.3/§4 for the underlying schema this feature builds on.)*

### Source Code (repository root)

```text
src/backend/
├── pos/                        # New Django app for POS checkout
│   ├── models.py               # Order, OrderDetail (or reuse a shared `orders` app if
│   │                            # omnichannel-hub's order model is introduced first — see
│   │                            # "Cross-feature note" below)
│   ├── serializers.py
│   ├── views.py                # Checkout, payment confirmation, receipt, shift endpoints
│   └── urls.py                 # Included from config/urls.py under /api/pos/
└── config/
    ├── settings.py              # `pos` added to INSTALLED_APPS
    └── urls.py

src/frontend/
└── app/(defaults)/pos/
    ├── page.tsx                 # Sales Cart (POS Home) — S04
    ├── checkout/                # Checkout/Payment modal — S05
    ├── orders/                  # Order Lookup — S06
    ├── inventory-lookup/        # Inventory Lookup — S07
    └── shift/                   # Shift Management, End of Day Report — S08/S09
```

**Structure Decision**: Web application split matching this repo's existing `src/backend/` /
`src/frontend/` layout (per `CLAUDE.md` and `.claude/rules/code-style.md`). A new `pos` Django app
is added under `src/backend/` following the `django-app-scaffolder` skill's convention (mirrors
`core/`); the frontend adds a `pos` route group under the existing `(defaults)` App Router group.

**Cross-feature note**: PA2's data design (§4.2, Table 4.11 `ORDER`) treats `ORDER` as shared
across POS and omnichannel-hub (`OrderType` distinguishes `POS` from `GrabMart`/`ShopeeFood`/
`BeMart`). Whichever of `001-pos-checkout` or `002-omnichannel-hub` is implemented first should
own the shared `Order`/`OrderDetail` models (e.g. in a small shared `orders` app this plan's `pos`
app exposes for reuse); the other feature's plan should reference — not duplicate — that model.
This plan defaults to `pos` owning it since POS checkout is the higher-priority pillar (PA0
Table 1 precedes Table 2); revisit if omnichannel-hub ships first.

## Complexity Tracking

No constitution violations were identified for this feature; this section is not applicable and
is intentionally left without entries.
