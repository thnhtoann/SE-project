# Implementation Plan: Data Analytics & Security

**Branch**: `004-analytics-security` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-analytics-security/spec.md`

## Summary

Two related but separable slices under one Django app: (1) authentication/RBAC — JWT-based login,
staff account provisioning, and the permission classes every other feature's endpoints depend on
— and (2) analytics/perishables — sales performance reporting and batch/expiration/discount
tracking, which read `Order`/`Product`/`Batch` data owned by the other three features.

## Technical Context

**Language/Version**: Python 3.12 (Django backend), TypeScript (Next.js 14 / React 18 frontend)
— same stack as the other three features, per `CLAUDE.md`.

**Primary Dependencies**: `djangorestframework-simplejwt` for JWT issuance/validation — this is
the exact library `.claude/rules/api-conventions.md` already names as the intended auth scheme
("tighten this and add an auth scheme... before any endpoint handles real user data"). Django
REST Framework for all endpoints.

**Storage**: PostgreSQL. `Staff`/`Role` tables (PA2 §4.2 Tables 4.1/4.3) for auth; reads
(read-only from this feature's perspective) `Order`/`Order Line Item` for reporting and
`Batch`/`Product` for expiration tracking, owned by `pos-checkout`/`omnichannel-hub` and the
shared catalog respectively.

**Testing**: Django's built-in test runner. Authentication and permission-class tests are the
highest-priority tests in the whole system, since every other feature's endpoints depend on this
feature's RBAC working correctly. Frontend test runner: NEEDS CLARIFICATION, same open item as
the other three features.

**Target Platform**: Django API on the existing Docker Compose / Linux VPS deployment; login and
dashboard UI in the Next.js frontend (both the `(auth)` route group for login/signup/reset and the
`(defaults)` group for the authenticated portal, per this repo's existing App Router structure).

**Project Type**: Web application (frontend + backend split), consistent with the other features.

**Performance Goals**: Authentication completes in under 3 seconds (SC-001, sourced directly from
PA1 U001's non-functional constraint).

**Constraints**: This feature's authentication/RBAC slice is a **cross-cutting dependency for the
other three features**, not just its own pillar — `001-pos-checkout`, `002-omnichannel-hub`, and
`003-smart-procurement`'s plans all assume an authenticated JWT with a Cashier/Store
Manager/Chain Manager role is already available (Constitution Principle II). Despite being
numbered `004`, the authentication portion (User Story 1) should be implemented **before or
alongside** the other three features' endpoint work, not after — sequence by story, not by
feature-directory number.

**Scale/Scope**: Same multi-branch chain scope as the other features.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `.specify/memory/constitution.md` v1.0.0:

- **I. API-First, Client-Server Architecture** — PASS. Login, staff management, reporting, and
  batch tracking are all REST endpoints; the frontend renders all UI.
- **II. Stateless JWT Authentication & RBAC** — PASS by construction: this feature *is* the
  implementation of this principle (FR-001–FR-005). No server-side session state is introduced;
  every other feature's permission classes depend on the role claims issued here.
- **III. Data Integrity: 3NF + ACID** — PASS. Staff account creation/update (FR-007/FR-008) and
  discount application (FR-014) are simple single-row writes; no multi-step transaction risk
  comparable to inventory deduction exists in this feature.
- **IV. Event-Driven Integration via Webhooks** — NOT APPLICABLE. This feature has no external
  third-party integration surface.
- **V. UML-Documented, Version-Controlled Design** — PASS for Stories 1-5, which map directly to
  PA1's UML-derived use cases U001, U012-U014. Stories 6-7 (Customer List, POS Transactions,
  added 2026-08-08) have no corresponding PA1 use case — like `005-marketplace-integration`'s
  gap on the same principle, use case/sequence diagrams for these two read-only views MUST be
  authored under `docs/analysis and design/` alongside implementation.
- **VI. Hardware & Network Realism** — NOT APPLICABLE. No POS hardware surface in this feature.

No violations identified. Complexity Tracking table is not applicable and is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/004-analytics-security/
├── plan.md              # This file
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

*(No `research.md`, `data-model.md`, `contracts/`, or `quickstart.md` generated for this pass —
same rationale as the other three features: stack and schema already fixed by `CLAUDE.md` and
PA2.)*

### Source Code (repository root)

```text
src/backend/
├── accounts/                   # New Django app: auth + staff provisioning (User Story 1-2)
│   ├── models.py                 # Staff, Role (or extend Django's built-in User)
│   ├── serializers.py
│   ├── views.py                  # Login, refresh, password reset, staff CRUD
│   ├── permissions.py            # Shared DRF permission classes imported by every other app
│   └── urls.py                   # Included from config/urls.py under /api/auth/, /api/staff/
├── analytics/                   # New Django app: reporting + batch/expiration (User Story 3-5)
│   ├── views.py                  # Sales report, batch list/filter, discount application,
│   │                              # read-only customer list (US6) and POS transaction list (US7)
│   └── urls.py                   # Included from config/urls.py under /api/analytics/
└── config/
    ├── settings.py               # `accounts`, `analytics` added to INSTALLED_APPS;
    │                              # REST_FRAMEWORK DEFAULT_PERMISSION_CLASSES tightened away
    │                              # from AllowAny (api-conventions.md)
    └── urls.py

src/frontend/
├── app/(auth)/
│   ├── login/page.tsx             # Sign In — S01
│   ├── register/page.tsx          # Sign Up — S02
│   └── reset-password/page.tsx    # Reset Password — S03
└── app/(defaults)/
    ├── dashboards/
    │   ├── analytics/page.tsx      # Analytics Dashboard — S10
    │   └── store/page.tsx          # Store Dashboard — S11, and S12's customer panels
    │                                # under a Customers tab (S12 merged in 2026-08-08;
    │                                # see tasks.md T011 for the PA2 divergence note)
    ├── inventory/
    │   ├── page.tsx                 # Product List (stock/expiry status) — S13
    │   ├── [id]/page.tsx             # Product Details — S14
    │   └── add/page.tsx              # Add Product (batch/expiry entry) — S15
    ├── staff/
    │   ├── page.tsx                  # Staff List (Grid) — S16
    │   ├── [id]/page.tsx              # Staff Details — S17
    │   └── add/page.tsx               # Add Staff — S18
    ├── customers/
    │   └── page.tsx                  # Customer List — S19 (US6)
    └── transactions/
        └── page.tsx                  # POS Transactions — S21 (US7)
```

**Structure Decision**: Two new Django apps under `src/backend/` — `accounts` (auth/RBAC/staff,
following the `django-app-scaffolder` skill's convention) and `analytics` (reporting/batch
tracking) — split because they have different lifecycles: `accounts` is a foundational
dependency the other three features need immediately, while `analytics` is a pure consumer of
data those features produce. Frontend uses the existing `(auth)` route group — login/register/
reset-password pages already exist there (built ahead of this feature's backend) — and adds
dashboard/inventory/staff/customers/transactions routes under the existing `(defaults)` group.
`customers/` (US6) and `transactions/` (US7) were added 2026-08-08 alongside the corresponding
spec.md user stories, as read-only additions to the same `analytics` app rather than new apps.

## Complexity Tracking

No constitution violations were identified for this feature; this section is not applicable and
is intentionally left without entries.
