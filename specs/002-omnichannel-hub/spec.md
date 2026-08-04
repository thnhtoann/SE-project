# Feature Specification: Omnichannel Hub

**Feature Branch**: `002-omnichannel-hub`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Omnichannel Hub for store managers: automatically aggregate
incoming orders from GrabMart, ShopeeFood, and BeMart onto one unified dashboard, and deduct
inventory in real time across all sales channels as soon as any order is placed, so stock stays
consistent between physical and online sales. Covers FR2.1-FR2.2, use cases U007-U008 from PA1,
screen S20 from PA2."

**Source**: `pa/PA0.md` (Table 2), `pa/PA1.md` (FR Group 2, Use Cases U007-U008), `pa/PA2.md`
(screen S20)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View aggregated delivery-platform orders (Priority: P1)

A Store Manager opens a single dashboard and sees incoming orders from GrabMart, ShopeeFood, and
BeMart together, instead of checking each platform's own app or device separately.

**Why this priority**: This directly eliminates the "monitoring multiple disparate devices"
bottleneck named as the core omnichannel problem in PA1 §2.1. It delivers value on its own even
before any automated status sync or inventory logic is added.

**Independent Test**: Can be fully tested by simulating incoming orders from each connected
platform and confirming they all appear, with correct details, on one dashboard view.

**Acceptance Scenarios**:

1. **Given** the store is connected to GrabMart, ShopeeFood, and BeMart, **When** a new order
   arrives from any of them, **Then** it appears on the Omnichannel Order Dashboard with its
   order details and source platform identified.
2. **Given** multiple orders exist from different platforms, **When** the Store Manager views the
   dashboard, **Then** all orders are listed together regardless of source, and the Store Manager
   can review each order's details.

---

### User Story 2 - Real-time inventory deduction across channels (Priority: P1)

As soon as any sales transaction completes — whether at the physical POS or via an online
delivery order — the system deducts the sold quantity from inventory immediately, so the same
stock isn't oversold across channels.

**Why this priority**: This is the other half of the core business problem in PA1 §2.1
(inventory discrepancies and overselling from unsynchronized channels); without it, the unified
dashboard from Story 1 still leaves stock counts wrong.

**Independent Test**: Can be fully tested by completing an order on one channel (or a seeded
completed order) and confirming inventory for the affected product(s) decreases immediately and
correctly, without needing to implement dashboard status-sync (Story 3).

**Acceptance Scenarios**:

1. **Given** a customer transaction completes on any channel, **When** the system identifies the
   purchased products, **Then** it deducts the sold quantity from inventory and saves the updated
   quantity.
2. **Given** an inventory deduction has occurred for one channel, **When** any other channel
   queries current stock, **Then** it sees the updated (post-deduction) quantity — no channel
   operates on stale data.
3. **Given** the requested quantity for a completed transaction exceeds available inventory,
   **When** the system attempts to deduct it, **Then** it MUST NOT deduct an incorrect (negative
   or below-zero) quantity, and MUST send an inventory warning instead.
4. **Given** an inventory update fails partway through (e.g., a database error), **When** the
   failure occurs, **Then** the associated transaction update MUST be rolled back and the error
   recorded — inventory and the triggering transaction must never end up inconsistent with each
   other.

---

### User Story 3 - Manage order status from the dashboard (Priority: P2)

A Store Manager reviews an incoming online order and confirms or updates its status directly from
the dashboard; the update is sent back to the originating delivery platform.

**Why this priority**: Builds on Story 1's visibility to close the loop with the delivery
platform, but the store can still operate (viewing orders manually via each platform's own status
tools) without this if needed — it's an efficiency layer on top of Stories 1-2.

**Independent Test**: Can be fully tested by selecting a displayed order, changing its status, and
confirming both the local record and the (simulated) platform-facing update reflect the change.

**Acceptance Scenarios**:

1. **Given** an order is displayed on the dashboard, **When** the Store Manager confirms or
   updates its status, **Then** the system sends the updated status to the corresponding platform
   and stores the change.
2. **Given** the system cannot find product information referenced by an online order, **When**
   the Store Manager attempts to confirm it, **Then** the system prevents completion until the
   issue is resolved.

---

### User Story 4 - Handle synchronization problems (Priority: P2)

When a delivery platform connection fails, or an online order requests a product that doesn't
have enough stock, the Store Manager is clearly notified and can take corrective action instead
of the order silently failing or overselling.

**Why this priority**: A necessary resilience layer for Stories 1-3, but the "happy path" of those
stories already delivers the primary value; this story hardens it against the failure modes PA1
explicitly calls out.

**Independent Test**: Can be fully tested by simulating a platform connection failure and a
low-stock online order, and confirming the Store Manager sees clear, actionable notifications for
each.

**Acceptance Scenarios**:

1. **Given** the system cannot connect to a delivery platform, **When** synchronization is
   attempted, **Then** the system displays a synchronization error and lets the Store Manager
   retry.
2. **Given** an online order requests a product with insufficient inventory, **When** the system
   detects this, **Then** it notifies the Store Manager, who can update or cancel the order.

### Edge Cases

- What happens when the same product is sold simultaneously at the POS and via an online order,
  and combined they exceed available stock? (Only one may succeed; the other must receive the
  insufficient-inventory response, not an oversold result — see Story 2, Acceptance Scenario 3.)
- How does the system handle an order cancellation initiated on the delivery platform's side
  (e.g., the customer cancels in the GrabMart app) after the order was already displayed?
- What happens if a platform sends a duplicate webhook for the same order (e.g., due to a retry
  on their end)?
- How does the system behave if a product referenced by an incoming online order has been
  discontinued or removed from the catalog?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST automatically aggregate incoming orders from GrabMart, ShopeeFood,
  and BeMart onto a single unified dashboard.
- **FR-002**: The system MUST display each incoming order's details (items, quantities, source
  platform, and delivery information) to the Store Manager.
- **FR-003**: The system MUST let a Store Manager confirm or update the status of an order from
  the dashboard.
- **FR-004**: The system MUST send an order's updated status back to the platform it originated
  from.
- **FR-005**: The system MUST deduct inventory in real time, immediately upon completion of any
  sales transaction, regardless of which channel (POS or a connected delivery platform) it came
  from.
- **FR-006**: The system MUST prevent an inventory deduction that would take stock below zero,
  and MUST issue an inventory warning instead of applying it.
- **FR-007**: The system MUST roll back an inventory update and record the error if the update
  fails partway through, rather than leaving inventory and the triggering transaction out of sync.
- **FR-008**: The system MUST detect when an online order requests a product with insufficient
  available inventory, notify the Store Manager, and let them update or cancel the order.
- **FR-009**: The system MUST display a synchronization error and allow retry when it cannot
  connect to a delivery platform.
- **FR-010**: The system MUST store order information consistently regardless of source channel,
  so reporting and analytics features can treat all completed orders uniformly.

### Key Entities *(include if feature involves data)*

- **Order**: A single sale, whether placed at the POS or received from a delivery platform;
  records its source channel, status, and total. Shared conceptually with `pos-checkout`'s
  Transaction — see the Cross-feature note in `001-pos-checkout`'s plan.
- **Order Line Item**: A product and quantity within an order, same shape regardless of source
  channel.
- **Store Inventory**: The real-time stock quantity of a product (by batch) at a specific branch;
  the single source of truth every channel deducts from and reads.
- **External Platform Connection**: The logical link to a delivery platform (GrabMart, ShopeeFood,
  BeMart) through which orders and status updates flow; represents the webhook source, not
  implementation credentials.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An order placed on any connected delivery platform appears on the unified dashboard
  within 1 minute of being placed.
- **SC-002**: 0% of completed transactions across any combination of channels oversell a product
  (sell more than was available at the time of sale).
- **SC-003**: A Store Manager can identify and resolve every order needing attention (sync
  failure or insufficient stock) from the dashboard alone, without opening a source platform's own
  app.
- **SC-004**: 100% of inventory deduction failures are recorded and surfaced as errors — none are
  silently lost, leaving inventory and order records inconsistent.

## Assumptions

- Delivery-platform order and status-update events arrive via webhook, per the project
  constitution's Event-Driven Integration principle; onboarding a platform (API credentials,
  webhook registration) is an operational/config concern, not part of this feature's scope.
- "Minimal delay" (PA1 NFR3) for dashboard visibility is treated as a 1-minute target (SC-001)
  pending an explicit number from the team; PA0/PA1 do not state a precise figure.
- Only GrabMart, ShopeeFood, and BeMart are in scope; adding further delivery platforms later is
  expected to follow the same webhook-based pattern but is not designed here.
- Duplicate webhook delivery for the same order/event is assumed possible (common for webhook
  systems) and must not cause a double inventory deduction — handled as an edge case rather than a
  first-class user story since PA1 does not name it explicitly.
- Order cancellation initiated from the delivery platform's side is treated as an edge case; PA1
  does not define a dedicated use case for it.
