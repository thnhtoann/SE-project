---

description: "Task list template for feature implementation"
---

# Tasks: Marketplace Channel Integration (Lazada, TikTok Shop, Shopee)

**Input**: Design documents from `specs/005-marketplace-integration/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md) (no research.md/data-model.md/contracts/
generated for this feature — see plan.md's Project Structure section for why)

**Tests**: Not explicitly requested as TDD in the spec. Targeted tests are still included for the
concurrency/idempotency/restoration invariants the constitution requires (Principle III), matching
the precedent set by `002-omnichannel-hub`'s plan.

**Organization**: Tasks are grouped by user story (from `spec.md`) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact, relative to repository root

## Important dependency note

`002-omnichannel-hub` defines the shared `Order`/`OrderDetail`/`StoreInventory` schema and the
`BaseWebhookView` abstraction this feature extends, but as of this writing only the webhook
skeleton exists (`src/backend/omnichannel/views.py`, `urls.py`) — there is no `models.py` yet. If
`002`'s `Order`/`OrderDetail`/`StoreInventory` models and shared inventory-deduction service are
still unimplemented when this feature is picked up, complete that shared prerequisite first (as
part of `002`'s own tasks) — T007 and Phase 4/5 below assume it exists.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration for the three new platform integrations

- [ ] T001 [P] Add `LAZADA_WEBHOOK_SECRET`, `TIKTOKSHOP_WEBHOOK_SECRET`, `SHOPEE_WEBHOOK_SECRET`
      entries to `src/backend/.env.example`, mirroring the existing `GRABMART_WEBHOOK_SECRET` /
      `SHOPEEFOOD_WEBHOOK_SECRET` / `BEMART_WEBHOOK_SECRET` entries
- [ ] T002 Add `LAZADA_WEBHOOK_SECRET`, `TIKTOKSHOP_WEBHOOK_SECRET`, `SHOPEE_WEBHOOK_SECRET` reads
      via `os.environ.get(...)` in `src/backend/config/settings.py`, following the existing
      `GRABMART_WEBHOOK_SECRET` pattern (lines 16-18)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Webhook receiving skeleton and shared data-model support that every user story below
builds on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Add `LazadaWebhookView(BaseWebhookView)` with `platform_name = "Lazada"` and a
      `verify_signature` implementation in `src/backend/omnichannel/views.py`, matching the
      existing `GrabMartWebhookView` pattern
- [ ] T004 [P] Add `TikTokShopWebhookView(BaseWebhookView)` with `platform_name = "TikTokShop"`
      and a `verify_signature` implementation in `src/backend/omnichannel/views.py`
- [ ] T005 [P] Add `ShopeeWebhookView(BaseWebhookView)` with `platform_name = "Shopee"` and a
      `verify_signature` implementation in `src/backend/omnichannel/views.py`
- [ ] T006 Register `lazada/`, `tiktokshop/`, `shopee/` routes in `src/backend/omnichannel/urls.py`
      pointing to the three new view classes (depends on T003-T005)
- [ ] T007 Extend the shared `Order`/`OrderDetail` source field's allowed values (`OrderType` per
      PA2 §4.2) in `src/backend/omnichannel/models.py` to add `Lazada`, `TikTokShop`, `Shopee`
      alongside the existing `POS | GrabMart | ShopeeFood | BeMart` values — see dependency note
      above if this model doesn't exist yet

**Checkpoint**: Webhook endpoints exist and accept authenticated requests for all three new
platforms; user story implementation can now begin

---

## Phase 3: User Story 1 - View marketplace orders on the unified dashboard (Priority: P1) 🎯 MVP

**Goal**: Orders placed on Lazada, TikTok Shop, or Shopee appear on the existing Omnichannel Order
Dashboard with source platform identified, alongside the existing five channels

**Independent Test**: Send a simulated webhook payload for each of the three new platforms,
confirm an `Order` row is created with the correct source platform and details, and that it's
visible/filterable on the dashboard — independent of inventory deduction (US2) or
cancellation handling (US3)

### Implementation for User Story 1

- [ ] T008 [P] [US1] Implement `handle_event` payload normalization (map Lazada's payload shape to
      `Order`/`OrderDetail` fields) in `LazadaWebhookView` in `src/backend/omnichannel/views.py`
- [ ] T009 [P] [US1] Implement `handle_event` payload normalization for `TikTokShopWebhookView` in
      `src/backend/omnichannel/views.py`
- [ ] T010 [P] [US1] Implement `handle_event` payload normalization for `ShopeeWebhookView` in
      `src/backend/omnichannel/views.py`
- [ ] T011 [US1] Ensure each created `Order` is uniquely identified by source platform +
      platform-native order ID (not just a numeric ID) in `src/backend/omnichannel/views.py`,
      satisfying FR-009 (depends on T008-T010)
- [ ] T012 [US1] Add a per-channel connectivity/error indicator (surface the last successfully
      processed event time, or an error state, per platform) in
      `src/backend/omnichannel/views.py`, satisfying FR-008
- [ ] T013 [US1] Extend the Omnichannel Order Dashboard's source-platform filter and badges to
      include Lazada, TikTok Shop, and Shopee in
      `src/frontend/app/(defaults)/omnichannel/orders/page.tsx`, satisfying FR-002 and FR-007

**Checkpoint**: User Story 1 is independently functional and testable — new-channel orders are
visible and filterable on the dashboard

---

## Phase 4: User Story 2 - Real-time inventory deduction from marketplace sales (Priority: P1)

**Goal**: Completed orders on Lazada, TikTok Shop, or Shopee deduct `StoreInventory` immediately
through the same atomic, race-safe path used by POS/GrabMart/ShopeeFood/BeMart

**Independent Test**: Seed a completed order on each new channel and confirm the affected
product's stock decreases immediately; run a concurrent order for the same product on a new
channel and an existing channel (e.g. POS) and confirm no overselling

### Implementation for User Story 2

- [ ] T014 [US2] Wire `LazadaWebhookView.handle_event` to call the shared, transaction-guarded
      inventory-deduction path (same one used by `001-pos-checkout` and the existing three
      omnichannel platforms) in `src/backend/omnichannel/views.py` (depends on T008, T011)
- [ ] T015 [US2] Wire `TikTokShopWebhookView.handle_event` to the shared inventory-deduction path
      in `src/backend/omnichannel/views.py` (depends on T009, T011)
- [ ] T016 [US2] Wire `ShopeeWebhookView.handle_event` to the shared inventory-deduction path in
      `src/backend/omnichannel/views.py` (depends on T010, T011)
- [ ] T017 [P] [US2] Add a Django test proving a concurrent order from a new channel and an
      existing channel (e.g. POS) for the same product does not oversell, in
      `src/backend/omnichannel/tests.py`
- [ ] T018 [P] [US2] Add a Django test proving duplicate delivery of the same platform webhook
      event does not double-deduct inventory, in `src/backend/omnichannel/tests.py`

**Checkpoint**: User Stories 1 and 2 both work independently — new-channel orders are visible and
correctly deduct inventory with no overselling

---

## Phase 5: User Story 3 - Reflect cancellations and returns from marketplace channels (Priority: P2)

**Goal**: Cancellation/return events from Lazada, TikTok Shop, or Shopee restore previously
deducted inventory and update the order's status on the dashboard

**Independent Test**: Seed an order from a new channel that has already deducted inventory,
simulate a cancellation/return webhook event for it, and confirm inventory is restored and the
dashboard reflects the new status

### Implementation for User Story 3

- [ ] T019 [US3] Add cancellation/return event handling to `LazadaWebhookView.handle_event`
      (restore deducted inventory, update `Order` status) in `src/backend/omnichannel/views.py`
      (depends on T014)
- [ ] T020 [US3] Add cancellation/return event handling to `TikTokShopWebhookView.handle_event` in
      `src/backend/omnichannel/views.py` (depends on T015)
- [ ] T021 [US3] Add cancellation/return event handling to `ShopeeWebhookView.handle_event` in
      `src/backend/omnichannel/views.py` (depends on T016)
- [ ] T022 [US3] Handle out-of-order webhook delivery (a cancellation event arriving before its
      order-created event) safely for all three platforms in
      `src/backend/omnichannel/views.py`
- [ ] T023 [P] [US3] Add a Django test proving a cancel/return event restores exactly the
      previously deducted quantity, in `src/backend/omnichannel/tests.py`

**Checkpoint**: All three user stories are independently functional — orders are visible,
inventory deducts correctly, and cancellations/returns restore stock

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and validation across all three user stories

- [ ] T024 [P] Author use-case and sequence diagrams for the Lazada/TikTok Shop/Shopee webhook
      flows in `docs/analysis and design/`, closing the Constitution Principle V gap noted in
      `plan.md` (these platforms have no PA0/PA1/PA2 UML source, unlike GrabMart/ShopeeFood/BeMart)
- [ ] T025 [P] Add a test plan/report entry for this feature in `docs/test/`, per
      `.claude/rules/testing.md`
- [ ] T026 Run `docker compose exec backend python manage.py test` and confirm all new and
      existing `omnichannel` app tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T002 provide the secrets T003-T005's
  `verify_signature` implementations read) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion only
- **User Story 2 (Phase 4)**: Depends on Foundational completion; T014-T016 also depend on the
  corresponding US1 normalization tasks (T008-T010) and T011, since deduction needs a normalized,
  uniquely-identified `Order` to act on
- **User Story 3 (Phase 5)**: Depends on Foundational completion; T019-T021 also depend on the
  corresponding US2 deduction-wiring tasks (T014-T016), since restoration reverses a deduction
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Parallel Opportunities

- T001-T002 (Setup) can run in parallel with each other
- T003, T004, T005 (Foundational, one view class per platform) can run in parallel
- T008, T009, T010 (US1 normalization, one per platform) can run in parallel
- T017, T018 (US2 tests) can run in parallel with each other, after T014-T016
- T023 (US3 test) can run in parallel with T024-T025 (Polish docs)
- Once Foundational (Phase 2) completes, US1, US2, and US3 are logically layered (US2 needs US1's
  normalization per-platform, US3 needs US2's deduction per-platform) rather than fully parallel
  across stories — but different platforms within the same story (Lazada vs. TikTok Shop vs.
  Shopee) can always be worked on in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Launch all three platform normalization tasks together:
Task: "Implement handle_event payload normalization for LazadaWebhookView in src/backend/omnichannel/views.py"
Task: "Implement handle_event payload normalization for TikTokShopWebhookView in src/backend/omnichannel/views.py"
Task: "Implement handle_event payload normalization for ShopeeWebhookView in src/backend/omnichannel/views.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm Lazada/TikTok Shop/Shopee orders appear correctly on the
   dashboard, independent of inventory deduction
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → webhook endpoints live for all three platforms
2. Add User Story 1 → orders visible on dashboard → Demo
3. Add User Story 2 → inventory deducts correctly, no overselling → Demo
4. Add User Story 3 → cancellations/returns restore stock → Demo
5. Each story adds value without breaking the previous one

---

## Notes

- [P] tasks = different files or independent platform branches within `views.py`, no shared-state
  conflicts
- [Story] label maps task to specific user story for traceability
- This feature is purely additive to `002-omnichannel-hub`'s `omnichannel` app — no new Django app,
  no new frontend route
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
