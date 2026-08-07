# Implementation Plan: Marketplace Channel Integration (Lazada, TikTok Shop, Shopee)

**Branch**: `005-marketplace-integration` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-marketplace-integration/spec.md`

## Summary

Extends the webhook-driven `omnichannel` Django app built for `002-omnichannel-hub` with three
more platform webhook receivers — Lazada, TikTok Shop, Shopee — reusing the existing
`BaseWebhookView` abstraction (signature verification + payload handoff) rather than a new
integration style. Orders from all three appear on the same unified dashboard and deduct the same
shared `StoreInventory` in real time, alongside POS, GrabMart, ShopeeFood, and BeMart.

**Dependency note**: `002-omnichannel-hub`'s `omnichannel` app currently only has the webhook
*receiving* skeleton (`BaseWebhookView` + GrabMart/ShopeeFood/BeMart subclasses in `views.py`); the
`handle_event` method is an explicit stub pending order normalization and inventory-deduction
logic (referenced in-code as OMNI-2/OMNI-3), and no dashboard page exists yet in the frontend. This
feature's webhook receivers can be built in parallel using the same stub pattern, but end-to-end
order visibility and inventory deduction for all six channels depend on that shared normalization/
deduction logic landing (whether as part of 002 or as a shared prerequisite task) — see Constraints
below.

## Technical Context

**Language/Version**: Python 3.12 (Django backend), TypeScript (Next.js 14 / React 18 frontend) —
same stack as `001-pos-checkout` and `002-omnichannel-hub`, per `CLAUDE.md`.

**Primary Dependencies**: Django REST Framework, extending the existing `omnichannel` app's
`BaseWebhookView` (`src/backend/omnichannel/views.py`) with three new subclasses —
`LazadaWebhookView`, `TikTokShopWebhookView`, `ShopeeWebhookView` — each implementing
`verify_signature` for its platform, matching the existing `GrabMartWebhookView` /
`ShopeeFoodWebhookView` / `BeMartWebhookView` pattern exactly. No new Django app, no new
integration mechanism.

**Storage**: PostgreSQL, the same `Order`/`OrderDetail`/`StoreInventory` schema shared with
`001-pos-checkout` and `002-omnichannel-hub`. This feature only needs to extend that schema's
order-source/`OrderType` value set (PA2 §4.2: currently `POS | GrabMart | ShopeeFood | BeMart`)
with three more values (`Lazada`, `TikTokShop`, `Shopee`) once that schema exists — it does not
introduce a new table or a parallel schema.

**Testing**: Django's built-in test runner (`docker compose exec backend python manage.py test`),
same as `002-omnichannel-hub` — signature verification per new platform, and concurrency tests
covering the same product being sold simultaneously across any combination of all six channels
(spec Edge Cases / FR-004).

**Target Platform**: Django API on the existing Docker Compose / Linux VPS deployment; dashboard
rendered in the Next.js Management Portal (same unified dashboard `002` delivers, not a new page).

**Project Type**: Web application (frontend + backend split), consistent with `001-pos-checkout`
and `002-omnichannel-hub`.

**Performance Goals**: New orders from the three new channels visible on the dashboard within 30
seconds of being placed (SC-001); inventory deduction applied in the same transaction as order
completion, not a deferred job (SC-002).

**Constraints**: Webhook receivers for Lazada, TikTok Shop, and Shopee MUST be idempotent, matching
the existing platforms' requirement. Inventory deduction and restoration (on cancel/return, FR-006)
MUST route through the exact same shared, transaction-guarded deduction code path used by POS,
GrabMart, ShopeeFood, and BeMart — not a per-platform copy — so Constitution Principle III's
"no overselling" guarantee holds across all six channels. Because that shared deduction path is not
yet implemented (see Dependency note above), this feature's webhook receivers can be scaffolded
independently, but cannot be considered functionally complete until wired into that shared logic.

**Scale/Scope**: Same multi-branch chain scope as `001-pos-checkout` / `002-omnichannel-hub`;
concurrent webhook volume across six platforms combined is not quantified in PA0/PA1 (these three
platforms are outside the original PA scope) — no specific events-per-second target is required for
this pass, consistent with `002`'s NEEDS CLARIFICATION note on the same point.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.0.0:

- **I. API-First, Client-Server Architecture** — PASS. New webhook receivers are additional REST
  API endpoints on the existing `omnichannel` app; no server-rendered views introduced.
- **II. Stateless JWT Authentication & RBAC** — PASS. Dashboard read/filter endpoints require an
  authenticated Store Manager-role JWT, unchanged from `002`. Inbound Lazada/TikTok
  Shop/Shopee webhooks authenticate via each platform's own signing scheme, the same deliberate
  machine-to-machine exception already documented and approved for GrabMart/ShopeeFood/BeMart.
- **III. Data Integrity: 3NF + ACID** — PASS, conditional on the Constraints above: this feature
  MUST NOT introduce a second inventory-deduction code path. All six channels' deductions and
  restorations route through one shared, transaction-guarded mechanism.
- **IV. Event-Driven Integration via Webhooks, Not Polling** — PASS by construction: this feature
  is three more instances of the same webhook pattern `002` establishes (FR-005). No polling of
  Lazada/TikTok Shop/Shopee is introduced.
- **V. UML-Documented, Version-Controlled Design** — PASS, with a gap to close before/alongside
  implementation: unlike `002` (which maps to PA1 use cases U007-U008), this feature has no
  pre-existing PA0/PA1/PA2 UML source — Lazada and TikTok Shop are not mentioned in `pa/` at all,
  and "Shopee" appears only once in passing (PA2 §screen S20). Use case and sequence diagrams
  covering the three new channels MUST be authored under `docs/analysis and design/` alongside
  implementation to satisfy this principle; this is a documentation task to schedule, not a
  structural violation.
- **VI. Hardware & Network Realism** — PASS. Per-channel webhook connectivity loss must produce a
  clear dashboard error for that channel (FR-008), matching the same "clear error, not silent
  failure" standard already applied to the existing three platforms.

No structural violations identified. Complexity Tracking table is not applicable and is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/005-marketplace-integration/
├── plan.md              # This file
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

*(No `research.md`, `data-model.md`, `contracts/`, or `quickstart.md` generated — same rationale as
`001-pos-checkout` and `002-omnichannel-hub`: stack and schema are already fixed by `CLAUDE.md` and
PA2, and this feature extends `002`'s data model/contracts rather than introducing new ones.)*

### Source Code (repository root)

```text
src/backend/
├── omnichannel/
│   ├── views.py           # Extend: add LazadaWebhookView, TikTokShopWebhookView,
│   │                       # ShopeeWebhookView subclassing the existing BaseWebhookView
│   ├── urls.py             # Extend: add lazada/, tiktokshop/, shopee/ routes
│   └── models.py           # (once introduced by 002/OMNI-2) extend the order-source/OrderType
│                            # choices with Lazada, TikTokShop, Shopee
└── config/
    ├── settings.py          # Add LAZADA_WEBHOOK_SECRET, TIKTOKSHOP_WEBHOOK_SECRET,
    │                         # SHOPEE_WEBHOOK_SECRET (mirrors existing three platform secrets)
    └── urls.py               # No change — new routes are under the existing
                               # api/webhooks/ -> omnichannel.urls include

src/frontend/app/(defaults)/omnichannel/orders/
└── page.tsx                  # (once introduced by 002 — S20) extend the source-platform
                               # filter/badge list with Lazada, TikTok Shop, Shopee
```

**Structure Decision**: Purely additive to the `omnichannel` Django app and its `BaseWebhookView`
abstraction from `002-omnichannel-hub` — no new app, no new frontend route. New platform secrets
follow the existing `<PLATFORM>_WEBHOOK_SECRET` naming convention in `config/settings.py` and
`.env.example`.

## Complexity Tracking

No constitution violations were identified for this feature; this section is not applicable and
is intentionally left without entries.
