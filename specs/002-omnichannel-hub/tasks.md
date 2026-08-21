---

description: "Task list template for feature implementation"
---

# Tasks: Omnichannel Hub — Admin Management Portal Frontend (Online Orders)

**Input**: Design documents from `specs/002-omnichannel-hub/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md) (no research.md/data-model.md/
contracts/ generated — stack fixed by `CLAUDE.md`/PA2, per plan.md's Project Structure section)

**Scope of this task list**: **Frontend only**, per user request for the
`feature/admin-management-portal` branch. Covers this feature's single PA2 screen — S20 (Online
Orders) — which is part of the same "Admin Management Portal" section (S10-S21) as
`004-analytics-security`'s screens; see that feature's `tasks.md` for S10-S19 and S21. Backend
(the `omnichannel` app's webhook/order-normalization/inventory-deduction logic) does not exist
yet — the dashboard is built against mock/seed data shaped like this spec's Key Entities.

**Tests**: Not explicitly requested in the spec; none included below (frontend-only, pre-API).

**Organization**: Tasks are grouped by user story. **User Story 2 (real-time inventory deduction)
has no frontend surface of its own** — it's a backend-only guarantee (FR-005-FR-007) with no
dedicated screen in this feature; it is intentionally not represented as a task-phase below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- File paths are exact, relative to repository root

## Coordination note

`004-analytics-security`'s `tasks.md` (T002) also edits
`src/frontend/components/layouts/sidebar.tsx` to add its own nav entries. T002 below touches the
same file — sequence these two tasks (don't run them concurrently on the same branch) to avoid a
merge conflict, or fold both nav additions into one edit.

---

## Phase 1: Setup

- [ ] T001 [P] Add a TypeScript interface for `Order`/`OrderLineItem` (with a `sourceChannel`
      field covering `POS | GrabMart | ShopeeFood | BeMart`) in
      `src/frontend/types/omnichannel.ts`, matching this spec's Key Entities section
- [ ] T002 Add an "Online Orders" navigation entry to
      `src/frontend/components/layouts/sidebar.tsx`, linking to `/omnichannel/orders` — see
      Coordination note above

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T003 Reuse (or, if not yet present, create) the shared sortable/filterable data-table
      component at `src/frontend/components/datatable/admin-table.tsx` (introduced by
      `004-analytics-security`'s tasks.md) — the Online Orders dashboard needs the same
      list/row-actions/empty-state pattern as that feature's list screens

**Checkpoint**: Shared types/table component ready; dashboard work can begin

---

## Phase 3: User Story 1 - View aggregated delivery-platform orders (Priority: P1) 🎯 MVP

**Goal**: Online Orders dashboard (S20) — orders from GrabMart, ShopeeFood, BeMart on one view

**Independent Test**: Navigate to `/omnichannel/orders`, see a table of mock orders from all
three platforms with source, amount, delivery address, and delivery status; filter by source
platform and confirm the list narrows correctly

### Implementation for User Story 1

- [ ] T004 [US1] Build the Online Orders dashboard page in
      `src/frontend/app/(defaults)/omnichannel/orders/page.tsx` — source platform, amount,
      delivery address, delivery status (Delivered/Preparing/Cancelled) (S20), using T001's types
      and T003's table component with mock data
- [ ] T005 [US1] Add a source-platform filter (GrabMart/ShopeeFood/BeMart) and per-platform badge
      to the dashboard (depends on T004), satisfying FR-001-FR-002

**Checkpoint**: Online Orders dashboard independently browsable and filterable with mock data

---

## Phase 4: User Story 3 - Manage order status from the dashboard (Priority: P2)

**Goal**: Confirm/update an order's status inline from the dashboard

**Independent Test**: Select a mock order, change its status, and confirm the row reflects the
new status and a simulated "sent to platform" acknowledgment; attempt to confirm an order whose
referenced product is missing (mock scenario) and confirm completion is blocked

### Implementation for User Story 3

- [ ] T006 [US3] Add a status-update control (confirm/update status dropdown or action) per order
      row, simulating the platform round-trip against mock data (depends on T004), satisfying
      FR-003-FR-004
- [ ] T007 [US3] Block status confirmation with an inline error when the referenced product can't
      be found (mock scenario) (depends on T006), matching Story 3's Acceptance Scenario 2

**Checkpoint**: Order status management independently testable with mock data

---

## Phase 5: User Story 4 - Handle synchronization problems (Priority: P2)

**Goal**: Clear, actionable notifications for platform sync failures and low-stock orders

**Independent Test**: Trigger a mock platform-connection-failure state and confirm a
synchronization error with a retry action appears; trigger a mock low-stock order and confirm the
Store Manager sees a clear warning allowing update/cancel

### Implementation for User Story 4

- [ ] T008 [US4] Add a per-platform sync-error banner with a retry action to the dashboard (mock
      failure state) (depends on T004), satisfying FR-009
- [ ] T009 [US4] Add a low-stock warning indicator on an order when its product has insufficient
      inventory (mock scenario), with update/cancel affordances (depends on T004), satisfying
      FR-008

**Checkpoint**: All frontend-facing user stories (US1, US3, US4) independently testable; US2 has
no frontend task by design (see header note)

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T010 [P] Run `npm run lint` in `src/frontend` and fix violations across new
      pages/components
- [ ] T011 [P] Add i18next translation keys for all new user-facing text, per the
      `i18n-key-sync` skill's convention
- [ ] T012 Manually verify `/omnichannel/orders` in the browser: filtering, status update, sync
      error banner, and low-stock warning states

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately (T002 coordinate with
  `004-analytics-security`'s T002, see Coordination note)
- **Foundational (Phase 2)**: BLOCKS User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 3 (Phase 4)**: Depends on User Story 1 (needs the dashboard's order rows to attach
  a status control to)
- **User Story 4 (Phase 5)**: Depends on User Story 1 (needs the dashboard to attach banners/
  warnings to); independent of User Story 3
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Parallel Opportunities

- T001 can run in parallel with T002
- Once US1 (Phase 3) is done, US3 and US4 can be worked in parallel by different developers
  (different concerns on the same page — coordinate on the same file)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm the Online Orders dashboard displays and filters mock orders
   correctly
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → shared types/table ready
2. US1 (dashboard) → Demo
3. US3 (status management) → Demo
4. US4 (sync/stock warnings) → Demo
5. Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Frontend-only: the dashboard reads local mock/seed data matching T001's types until the
  `omnichannel` app's real webhook/order endpoints exist; swapping mock data for real API calls is
  follow-up work once the backend lands
- Commit after each task or logical group
