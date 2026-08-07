---

description: "Task list template for feature implementation"
---

# Tasks: Data Analytics & Security — Admin Management Portal Frontend

**Input**: Design documents from `specs/004-analytics-security/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md) (no research.md/data-model.md/
contracts/ generated — stack fixed by `CLAUDE.md`/PA2, per plan.md's Project Structure section)

**Scope of this task list**: **Frontend only**, per user request for the
`feature/admin-management-portal` branch. Covers this spec's PA2 screens S10-S19 and S21 (the
"Admin Management Portal" section minus S20, owned by `002-omnichannel-hub` — see that feature's
own `tasks.md`). **S01-S03 (login/register/reset-password) already exist** in
`src/frontend/app/(auth)/` and are excluded below. Backend endpoints for these screens
(`accounts`/`analytics` Django apps) do not exist yet — pages are built against mock/seed data
shaped like this spec's Key Entities, ready to be wired to the real API once it lands.

**Tests**: Not explicitly requested in the spec; none included below (frontend-only, pre-API).

**Organization**: Tasks are grouped by user story (US2-US7; US1/login is already built).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- File paths are exact, relative to repository root

---

## Phase 1: Setup

**Purpose**: Shared types and navigation entries every screen below needs

- [x] T001 [P] Add TypeScript interfaces for `StaffAccount`, `SalesReport`, `Batch`/`Product`,
      `Customer`, and `PosTransaction` in `src/frontend/types/admin.ts`, matching this spec's Key
      Entities section — used as the mock-data shape until the real `accounts`/`analytics`
      endpoints exist
      **(Staff-related types only so far — `StaffAccount` + its nested types. `SalesReport`,
      `Batch`/`Product`, `Customer`, `PosTransaction` still pending for their own stories.)**
- [x] T002 [P] Add navigation entries for Dashboards, Inventory, Staff, Customers, and
      Transactions to `src/frontend/components/layouts/sidebar.tsx`, linking to the routes this
      feature adds (leave existing unrelated demo links as-is — out of scope)
      **(Added a new "Admin Portal" nav section with the Staff link. Dashboards/Inventory/
      Customers/Transactions entries still pending until those stories are built.)**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared UI building blocks every list/dashboard screen below reuses

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 **(Deferred)** Create a reusable data-table component (sortable/filterable columns, row
      actions, empty state) in `src/frontend/components/datatable/admin-table.tsx` — Product List,
      Customer List, and POS Transactions (US4, US6, US7) need one. Staff List (US2) turned out to
      be a pure card grid (per S16's mockup) with no table view, so it didn't need this — revisit
      when starting US4/US6/US7
- [ ] T004 **(Deferred)** Create a reusable stat-card/KPI component in
      `src/frontend/components/dashboard/stat-card.tsx` — the three dashboards (US3) need one.
      Staff List's summary widgets were built inline in `components-staff-list.tsx` instead of as
      a shared component, since they were the only consumer so far — extract to a shared component
      if/when US3's dashboards need the same visual pattern

**Checkpoint**: Shared types and components ready; user story pages can now be built

---

## Phase 3: User Story 2 - Provision and manage staff accounts (Priority: P2) 🎯 MVP

**Goal**: Staff List (S16), Staff Details (S17), Add Staff (S18), against mock data

**Independent Test**: Navigate to `/staff`, see a populated grid of staff cards; open a staff
member's details; submit the Add Staff form and see client-side validation accept/reject input

### Implementation for User Story 2

- [x] T005 [P] [US2] Build Staff List (Grid) page in
      `src/frontend/app/(defaults)/staff/page.tsx` — staff cards with monthly sales, branch,
      contact links, plus staff summary widgets (S16), using T001's types and T003's table/grid
      pattern
      **(Built as `app/(defaults)/staff/page.tsx` + `components/staff/components-staff-list.tsx`,
      following the existing page/component split convention. Search-by-name-or-branch included.)**
- [x] T006 [P] [US2] Build Staff Details page in
      `src/frontend/app/(defaults)/staff/[id]/page.tsx` — profile, performance status, reviews,
      documents, certificates (S17)
      **(Server page does the mock lookup + 404 via `notFound()`; client component
      `components-staff-details.tsx` renders the profile/reviews/documents/certificates panels.)**
- [x] T007 [P] [US2] Build Add Staff page in `src/frontend/app/(defaults)/staff/add/page.tsx` —
      name, email, phone, address, city/country, social links, photo fields with client-side
      validation (S18)
- [x] T008 [US2] Wire Staff List row navigation to Staff Details, and Add Staff form submission
      to append to the mock staff list (depends on T005-T007)
      **(Card→details navigation works via `Link`. Form submission does NOT append to the visible
      mock list — each route is a separately mounted page with its own local state, and there's no
      backend yet to persist to; submission validates, shows a success panel, and links back to
      `/staff`. Wiring real persistence is follow-up work once the `accounts` API exists.)**

**Checkpoint**: Staff screens independently browsable and testable with mock data — verified in
the browser: grid renders with working search, card click → Staff Details renders profile/reviews/
documents/certificates, Add Staff blocks submission on empty required fields (native HTML5
validation) and shows a success state on valid submission. No console errors. `tsc --noEmit`
passes.

---

## Phase 4: User Story 3 - View sales performance reports (Priority: P2)

**Goal**: Analytics Dashboard (S10), Store Dashboard (S11), Customer Dashboard (S12)

**Independent Test**: Navigate to each dashboard route, see KPI cards/charts render from seeded
mock sales data for a selectable period; changing the period updates the displayed figures; an
empty period shows an empty-report notification, not an error

### Implementation for User Story 3

- [ ] T009 [P] [US3] Build Analytics Dashboard page in
      `src/frontend/app/(defaults)/dashboards/analytics/page.tsx` — company-wide KPIs (SKUs,
      staff, customers, revenue), sales analytics, top-selling and latest transactions (S10)
- [ ] T010 [P] [US3] Build Store Dashboard page in
      `src/frontend/app/(defaults)/dashboards/store/page.tsx` — branch-level revenue, sales
      funnel, revenue sources, top staff, branch location (S11)
- [ ] T011 [P] [US3] Build Customer Dashboard page in
      `src/frontend/app/(defaults)/dashboards/customer/page.tsx` — membership tiers, top VIP
      customer, peak hours, top customers, visits by device (S12)
- [ ] T012 [US3] Add a reporting-period selector shared across the three dashboards, plus an
      empty-report state when no data exists for the selected period (FR-010), in
      `src/frontend/components/dashboard/period-selector.tsx` (depends on T009-T011)

**Checkpoint**: All three dashboards independently browsable with a working period selector

---

## Phase 5: User Story 4 - Track batch and expiration dates (Priority: P2)

**Goal**: Product List (S13) with stock/expiry status, Product Details (S14) with expiry info

**Independent Test**: Navigate to `/inventory`, filter by expiration date, confirm near-expiry and
expired products are visually flagged; open a product's details and see its batch/expiry info

### Implementation for User Story 4

- [ ] T013 [P] [US4] Build Product List page in
      `src/frontend/app/(defaults)/inventory/page.tsx` — catalogue with stock status, quantity,
      supplier, price, and row actions (view/edit/delete) (S13)
- [ ] T014 [P] [US4] Build Product Details page in
      `src/frontend/app/(defaults)/inventory/[id]/page.tsx` — supplier contact, Reorder-Stock
      request form, tags, stock badge (S14)
- [ ] T015 [US4] Add expiration-date filter/search and expired/near-expiry visual flags to
      Product List (depends on T013), satisfying FR-011-FR-013

**Checkpoint**: Batch/expiry visibility independently testable with mock data

---

## Phase 6: User Story 5 - Apply discounts to near-expiry items (Priority: P3)

**Goal**: Discount entry on Product Details, and Add Product (S15)

**Independent Test**: On a near-expiry product's details, enter a discount percentage/price and
see client-side validation accept or reject it; attempt the same on an expired product and see it
blocked with a "remove instead" message

### Implementation for User Story 5

- [ ] T016 [P] [US5] Build Add Product page in
      `src/frontend/app/(defaults)/inventory/add/page.tsx` — photo, category, price, unit,
      barcode, batch, expiry, supplier fields (S15)
- [ ] T017 [US5] Add discount entry (percentage or new price) with validation to Product Details
      (depends on T014), satisfying FR-014-FR-015
- [ ] T018 [US5] Block discount entry on already-expired products with a "remove instead" message
      (depends on T017), satisfying FR-016

**Checkpoint**: Discounting flow independently testable with mock near-expiry/expired products

---

## Phase 7: User Story 6 - View customer list (Priority: P3)

**Goal**: Customer List (S19)

**Independent Test**: Navigate to `/customers`, see a table of customers with contact, status,
and last-contacted date; with no seeded customers, see an empty-state message

### Implementation for User Story 6

- [ ] T019 [US6] Build Customer List page in
      `src/frontend/app/(defaults)/customers/page.tsx` — table of customers with contact,
      status, last-contacted date, row actions, and empty state (S19), using T003's table
      component, satisfying FR-019-FR-020

**Checkpoint**: Customer List independently browsable with mock data

---

## Phase 8: User Story 7 - View POS transactions (Priority: P3)

**Goal**: POS Transactions (S21)

**Independent Test**: Navigate to `/transactions`, see a table of POS transactions with ID,
customer, amount, payment method, cashier, and status; with none seeded, see an empty-state
message

### Implementation for User Story 7

- [ ] T020 [US7] Build POS Transactions page in
      `src/frontend/app/(defaults)/transactions/page.tsx` — transaction ID, customer, amount,
      payment method (card/MoMo/cash/online banking), cashier, status (Completed/Pending/
      Canceled), and empty state (S21), using T003's table component, satisfying FR-021-FR-022

**Checkpoint**: All seven user stories (US1 pre-existing, US2-US7 above) independently browsable

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T021 [P] Run `npm run lint` in `src/frontend` and fix violations across all new
      pages/components
- [ ] T022 [P] Add i18next translation keys for all new user-facing text introduced by this
      feature, per the `i18n-key-sync` skill's convention
- [ ] T023 Manually verify every new route in the browser: `dashboards/analytics`,
      `dashboards/store`, `dashboards/customer`, `inventory`, `inventory/[id]`, `inventory/add`,
      `staff`, `staff/[id]`, `staff/add`, `customers`, `transactions`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: No hard dependency on Setup, but logically follows it — BLOCKS all
  user stories
- **User Stories (Phase 3-8)**: All depend on Foundational completion; otherwise independent of
  each other (US5 depends on US4's Product Details page existing, noted per-task above)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### Parallel Opportunities

- T001, T002 (Setup) in parallel
- T003, T004 (Foundational) in parallel
- Within each story, tasks marked [P] (e.g. T005/T006/T007, T009/T010/T011, T013/T014) touch
  different files and can run in parallel
- Once Foundational is done, US2, US3, US6, and US7 can all be worked in parallel by different
  developers; US4 should precede US5 (Add Product/discount reuses Product Details)

---

## Parallel Example: User Story 3

```bash
# Launch all three dashboard pages together:
Task: "Build Analytics Dashboard page in src/frontend/app/(defaults)/dashboards/analytics/page.tsx"
Task: "Build Store Dashboard page in src/frontend/app/(defaults)/dashboards/store/page.tsx"
Task: "Build Customer Dashboard page in src/frontend/app/(defaults)/dashboards/customer/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 2 (Staff management)
4. **STOP and VALIDATE**: Confirm Staff List/Details/Add work independently with mock data
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → shared types/components ready
2. US2 (Staff) → Demo
3. US3 (Dashboards) → Demo
4. US4 (Batch/Expiry) → Demo
5. US5 (Discounts, builds on US4) → Demo
6. US6 (Customer List) → Demo
7. US7 (POS Transactions) → Demo
8. Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This is frontend-only; every page reads from local mock/seed data matching T001's types until
  the `accounts`/`analytics` backend endpoints exist — swapping mock data for real API calls is
  follow-up work once the backend lands, not part of this task list
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
