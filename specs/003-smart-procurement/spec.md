# Feature Specification: Smart Procurement

**Feature Branch**: `003-smart-procurement`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Smart Procurement for chain managers: automatically trigger alerts
when any item's inventory reaches its configured minimum threshold, and centrally manage the
supplier list and purchase orders, tracking the real-time status of incoming shipments. Covers
FR3.1-FR3.2, use cases U009-U011 from PA1."

**Source**: `pa/PA0.md` (Table 3), `pa/PA1.md` (FR Group 3, Use Cases U009-U011)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive minimum inventory alerts (Priority: P1)

The system continuously watches each product's inventory level and automatically notifies the
Chain Manager as soon as a product's stock falls to or below its configured minimum threshold.

**Why this priority**: Directly prevents the out-of-stock situations for best-selling items named
as a headline pain point in PA0's proposed solution. It is valuable and independently testable
using only existing inventory data — no supplier or purchase-order functionality is required for
it to work.

**Independent Test**: Can be fully tested by setting a product's inventory below its minimum
threshold and confirming the Chain Manager receives an alert, with no supplier/PO data involved.

**Acceptance Scenarios**:

1. **Given** a product's inventory is above its configured minimum threshold, **When** the system
   checks its level, **Then** no alert is generated.
2. **Given** a product's inventory drops to or below its configured minimum threshold, **When**
   the system detects this, **Then** it generates an alert and sends it to the Chain Manager.
3. **Given** an alert is generated, **When** the Chain Manager reviews it, **Then** they can decide
   whether to create a purchase order in response (see Story 3).
4. **Given** the notification service fails to deliver an alert, **When** the failure occurs,
   **Then** the system stores the alert so it is not lost and can be delivered or viewed later.

---

### User Story 2 - Manage the supplier list (Priority: P1)

The Chain Manager maintains a central list of suppliers — adding, updating, and removing supplier
records — as the foundation for all purchasing activity.

**Why this priority**: Every purchase order depends on an existing, accurate supplier record;
without this, procurement has no data to work from. It is independently testable on its own
(supplier data management doesn't require a purchase order to exist).

**Independent Test**: Can be fully tested by adding, updating, and removing a supplier record and
confirming the changes are correctly stored and retrievable, independent of any purchase order.

**Acceptance Scenarios**:

1. **Given** the Chain Manager accesses supplier management, **When** they add a new supplier
   with valid information, **Then** the system stores it and it becomes available for purchase
   orders.
2. **Given** the Chain Manager enters invalid or incomplete supplier information, **When** they
   submit it, **Then** the system rejects it and requests correction.
3. **Given** an existing supplier record, **When** the Chain Manager updates or removes it,
   **Then** the system reflects the change.

---

### User Story 3 - Create and manage purchase orders (Priority: P2)

The Chain Manager creates a purchase order against a supplier, selecting the products and
quantities needed, and the system calculates and stores the order.

**Why this priority**: The direct response to a minimum-inventory alert (Story 1) and the reason
a supplier list (Story 2) exists — but it is a distinct, later slice: a store could theoretically
place orders by phone/email while only using Stories 1-2 for tracking, so this is additive rather
than blocking.

**Independent Test**: Can be fully tested by selecting an existing supplier and products,
creating a purchase order, and confirming it is stored with correctly calculated totals.

**Acceptance Scenarios**:

1. **Given** an existing supplier and available products, **When** the Chain Manager selects
   products and quantities and creates a purchase order, **Then** the system calculates the order
   totals and stores the purchase order.
2. **Given** the Chain Manager attempts to create a purchase order referencing a product that
   cannot be found, **When** they submit it, **Then** the system prevents the order from
   completing.

---

### User Story 4 - Track shipment status (Priority: P2)

The Chain Manager monitors the delivery status of incoming shipments tied to purchase orders, and
the system automatically flags shipments that have passed their expected delivery date.

**Why this priority**: Builds directly on Story 3's purchase orders; not usable until a purchase
order exists, which is why it is sequenced after it.

**Independent Test**: Can be fully tested by advancing a purchase order's expected delivery date
into the past and confirming the shipment is automatically marked delayed and the Chain Manager is
notified.

**Acceptance Scenarios**:

1. **Given** purchase orders with associated shipments exist, **When** the Chain Manager accesses
   shipment tracking, **Then** they see a list of ongoing shipments with supplier, products,
   quantity, and delivery status.
2. **Given** the Chain Manager selects a shipment, **When** they update its status, **Then** the
   system saves the change.
3. **Given** a shipment's expected delivery date has passed without confirmed delivery, **When**
   the system detects this, **Then** it marks the shipment as delayed and notifies the Chain
   Manager.
4. **Given** the Chain Manager requests shipment information that cannot be found, **When** the
   request is made, **Then** the system notifies them and directs them to check the purchase order
   information again.

### Edge Cases

- What happens when a product's minimum threshold is changed while its inventory is already below
  the new threshold — does an alert fire immediately, or only on the next check cycle?
- How does the system handle a purchase order that spans multiple suppliers, or is a single
  purchase order always tied to exactly one supplier? (Assumed one supplier per PO, per PA2 data
  design — see Key Entities.)
- What happens if a purchase order's associated product is discontinued after the order was
  placed but before the shipment arrives?
- How does the system prevent duplicate alerts from firing repeatedly for the same still-low
  product before the Chain Manager has acted on the first one?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST continuously monitor each product's inventory level against its
  configured minimum threshold.
- **FR-002**: The system MUST generate and send an alert to the Chain Manager when a product's
  inventory falls to or below its minimum threshold.
- **FR-003**: The system MUST NOT generate an alert when a product's inventory is above its
  minimum threshold.
- **FR-004**: The system MUST store an alert for later delivery if the notification service fails,
  rather than losing it.
- **FR-005**: The system MUST let the Chain Manager add, update, and remove supplier records.
- **FR-006**: The system MUST validate supplier information on entry and request correction when
  it is invalid or incomplete.
- **FR-007**: The system MUST let the Chain Manager create a purchase order against a supplier,
  selecting products and quantities.
- **FR-008**: The system MUST calculate purchase order totals from the selected products,
  quantities, and unit costs.
- **FR-009**: The system MUST prevent completing a purchase order that references a product that
  cannot be found.
- **FR-010**: The system MUST let the Chain Manager view the real-time status of shipments tied to
  purchase orders, including supplier, products, quantity, and delivery status.
- **FR-011**: The system MUST let the Chain Manager update a shipment's status.
- **FR-012**: The system MUST automatically mark a shipment as delayed and notify the Chain
  Manager when its expected delivery date has passed without confirmed delivery.
- **FR-013**: The system MUST notify the Chain Manager when requested shipment information cannot
  be found, and direct them to verify the associated purchase order.

### Key Entities *(include if feature involves data)*

- **Supplier**: A vendor the chain purchases from — name and contact information; supplies zero
  or more purchase orders.
- **Purchase Order**: A request to a single supplier for goods — order date, expected delivery
  date, and status (e.g., preparing, delivered, delayed); contains one or more purchase order line
  items.
- **Purchase Order Line Item**: A product, quantity, and unit cost within a purchase order.
- **Minimum Inventory Threshold**: A per-product configured value (owned by product catalog data,
  consumed here) that triggers an alert when current stock reaches or falls below it.
- **Inventory Alert**: A record of a threshold breach for a product, including whether it has been
  delivered/reviewed by the Chain Manager.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Chain Manager is notified of a below-threshold product within 1 hour of its
  inventory crossing that threshold.
- **SC-002**: 0% of generated alerts are permanently lost when notification delivery fails — every
  failed delivery is retrievable later.
- **SC-003**: A Chain Manager can create a correctly-totaled purchase order for a 10-line order in
  under 5 minutes.
- **SC-004**: 100% of shipments that pass their expected delivery date without confirmed delivery
  are automatically flagged as delayed, with no manual tracking required by the Chain Manager to
  notice it.

## Assumptions

- Setting or editing a product's minimum inventory threshold is treated as part of product catalog
  management, out of scope for this feature — this feature only consumes existing threshold
  values and reacts to them (PA1 does not assign threshold configuration to any specific use
  case or pillar).
- A purchase order is tied to exactly one supplier, matching PA2's data design (`PURCHASE_ORDER`
  has a single `SupplierID` foreign key); multi-supplier purchase orders are out of scope.
- Shipment status updates are assumed to be entered manually by the Chain Manager (per U010's main
  scenario), not received via an automated supplier/logistics integration — PA0's tech stack does
  not name any shipment-tracking API integration.
- "1 hour" (SC-001) and "5 minutes" (SC-003) are reasonable default targets, not numbers sourced
  directly from PA0/PA1, which describe "continuous monitoring" without a precise SLA.
- Alert de-duplication (not re-alerting for a product that remains below threshold) is assumed
  desirable but is not specified in PA1; treated as an edge case for the implementation to resolve
  rather than a stated requirement.
