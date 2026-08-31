# Feature Specification: Marketplace Channel Integration (Lazada, TikTok Shop, Shopee)

**Feature Branch**: `005-marketplace-integration`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "omnichannel hub alternative shopeefood , bemart, grabmart with lazada, tiktokshop and shopee"

**Source**: Extends the Omnichannel Hub delivered in `specs/002-omnichannel-hub/` (which covers
GrabMart, ShopeeFood, and BeMart per PA1 FR2.1-FR2.2, use cases U007-U008, screen S20) to add
three additional e-commerce marketplace channels: Lazada, TikTok Shop, and Shopee. Per this
project's flow-forward convention (`CLAUDE.md`), 002's artifacts are not modified; this is a new
feature directory.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View marketplace orders on the unified dashboard (Priority: P1)

A Store Manager opens the existing Omnichannel Order Dashboard and sees incoming orders from
Lazada, TikTok Shop, and Shopee appearing alongside the already-integrated GrabMart, ShopeeFood,
and BeMart orders, instead of checking each marketplace's own seller app separately.

**Why this priority**: Extends the core value of the Omnichannel Hub (eliminating per-platform
monitoring) to three more channels the store now sells through. Without this, the dashboard is
incomplete and the manager must still check three more apps manually.

**Independent Test**: Can be fully tested by simulating incoming orders from each of the three new
platforms and confirming they appear on the existing dashboard view with correct details and
source platform identified, without affecting existing GrabMart/ShopeeFood/BeMart order display.

**Acceptance Scenarios**:

1. **Given** the store is connected to Lazada, TikTok Shop, and Shopee, **When** a new order
   arrives from any of them, **Then** it appears on the Omnichannel Order Dashboard with its order
   details and source platform identified.
2. **Given** orders exist from all six connected platforms (GrabMart, ShopeeFood, BeMart, Lazada,
   TikTok Shop, Shopee), **When** the Store Manager views the dashboard, **Then** all orders are
   listed together and can be filtered or identified by source platform.

---

### User Story 2 - Real-time inventory deduction from marketplace sales (Priority: P1)

As soon as a sales transaction completes on Lazada, TikTok Shop, or Shopee, the system deducts the
sold quantity from inventory immediately, using the same real-time deduction mechanism already
applied to POS, GrabMart, ShopeeFood, and BeMart sales, so stock isn't oversold across any of the
six channels.

**Why this priority**: This is the other half of the core omnichannel value (accurate, race-free
stock) and is required for the new channels to be safely sellable at all; without it, adding these
channels increases the risk of overselling rather than reducing operational overhead.

**Independent Test**: Can be fully tested by completing a seeded order on each new channel and
confirming inventory for the affected product(s) decreases immediately and correctly, including
under concurrent orders from a new channel and an existing channel for the same product.

**Acceptance Scenarios**:

1. **Given** a customer purchase completes on Lazada, TikTok Shop, or Shopee, **When** the system
   identifies the purchased product(s), **Then** it deducts the sold quantity from inventory and
   the updated stock is immediately visible store-wide.
2. **Given** the same product is sold concurrently on a new marketplace channel and an existing
   channel (e.g., POS), **When** both transactions are processed, **Then** inventory is decremented
   correctly for both with no overselling and no lost update.

---

### User Story 3 - Reflect cancellations and returns from marketplace channels (Priority: P2)

When an order from Lazada, TikTok Shop, or Shopee is cancelled or returned before the store has
shipped it, the system restores the previously deducted inventory automatically and updates the
order's status on the dashboard.

**Why this priority**: Marketplace orders (unlike instant delivery-app orders) commonly pass
through a shippable "confirmed → packed → shipped" flow with a real cancellation/return window;
without this, cancelled marketplace orders would leave inventory incorrectly understocked.

**Independent Test**: Can be fully tested by seeding an order from a new channel, deducting its
inventory, then simulating a cancellation/return webhook event and confirming inventory is
restored and the dashboard reflects the new status.

**Acceptance Scenarios**:

1. **Given** an order from Lazada, TikTok Shop, or Shopee has already deducted inventory, **When**
   the platform sends a cancellation or return event for that order, **Then** the system restores
   the deducted quantity to inventory and marks the order as cancelled/returned on the dashboard.

---

### Edge Cases

- What happens when a marketplace webhook (Lazada, TikTok Shop, or Shopee) is unreachable or the
  store's connection to it drops? The dashboard must surface a clear per-channel connectivity
  error rather than silently showing stale or missing orders (per constitution Principle VI).
- How does the system handle an order for a product whose remaining stock is insufficient to
  fulfill it (a marketplace listing went stale)? The order must still be recorded and visible, but
  flagged so the Store Manager can act (e.g., cancel on the platform), rather than allowing
  inventory to go negative.
- How does the system handle duplicate or out-of-order webhook delivery (e.g., a cancellation
  event arriving before the original order-created event)? Inventory adjustments must remain
  correct regardless of delivery order.
- What happens if the same order identifier is reused or collides across two different new
  channels? Orders must remain distinguishable by the combination of source platform and
  platform-native order ID.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST aggregate incoming orders from Lazada, TikTok Shop, and Shopee onto the
  existing Omnichannel Order Dashboard, alongside GrabMart, ShopeeFood, and BeMart orders.
- **FR-002**: System MUST identify and display the source platform for every order, across all six
  supported channels (POS, GrabMart, ShopeeFood, BeMart, Lazada, TikTok Shop, Shopee).
- **FR-003**: System MUST deduct sold inventory quantities in real time when an order is placed on
  Lazada, TikTok Shop, or Shopee, using the same atomic, race-safe deduction mechanism used for
  existing channels.
- **FR-004**: System MUST prevent overselling when concurrent orders across any combination of the
  six channels target the same product's stock.
- **FR-005**: System MUST ingest order lifecycle events (e.g., placed, cancelled, returned) from
  Lazada, TikTok Shop, and Shopee via webhook listeners, consistent with the event-driven
  integration approach already used for existing channels — not by polling those platforms' APIs.
- **FR-006**: System MUST restore previously deducted inventory when a new-channel order is
  cancelled or returned before fulfillment.
- **FR-007**: Store Managers MUST be able to filter or distinguish dashboard orders by source
  platform, including the three new channels.
- **FR-008**: System MUST surface a clear, visible error state for a given channel when its
  webhook connection is lost or a received event cannot be processed, rather than failing
  silently.
- **FR-009**: System MUST record each new-channel order with enough platform-native identifying
  information (source platform + platform order ID) to avoid ambiguity with orders from other
  channels.
- **FR-010**: Pushing product listings, prices, or stock levels *to* Lazada, TikTok Shop, or Shopee
  (marketplace catalog/listing management) is explicitly OUT OF SCOPE for this feature. Scope is
  limited to ingesting orders and deducting inventory, matching the existing
  GrabMart/ShopeeFood/BeMart integration pattern, which likewise does not manage listings on those
  platforms.

### Key Entities *(include if feature involves data)*

- **Sales Channel**: Represents an integrated storefront the store sells through. Existing values
  (POS, GrabMart, ShopeeFood, BeMart) are extended with three new values: Lazada, TikTok Shop,
  Shopee. Attributes: channel name, channel category (in-store / delivery app / marketplace),
  webhook connection status.
- **Order**: Existing entity from the base Omnichannel Hub, extended so its source-channel
  attribute accepts the three new channel values; carries source platform, platform-native order
  ID, status (placed/confirmed/shipped/delivered/cancelled/returned), and line items.
- **Inventory Adjustment**: Existing entity/record produced when an order deducts or restores
  stock; extended to be produced by events from the three new channels using the same mechanism as
  existing channels.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Orders placed on Lazada, TikTok Shop, or Shopee appear on the unified dashboard
  within 30 seconds of being placed, matching the responsiveness of existing channels.
- **SC-002**: Zero overselling incidents occur across concurrent transactions spanning any
  combination of the six sales channels during a full trading day.
- **SC-003**: 100% of cancellation/return events received from the three new channels result in
  correct inventory restoration, verified against the pre-deduction stock level.
- **SC-004**: A Store Manager can identify which of the six channels any given order came from
  without leaving the unified dashboard.
- **SC-005**: When a new channel's connection drops, the Store Manager is shown a clear notice for
  that channel within 1 minute, rather than discovering missing orders after the fact.

## Assumptions

- This feature extends the Omnichannel Hub delivered in `specs/002-omnichannel-hub/`; all six
  channels (POS, GrabMart, ShopeeFood, BeMart, Lazada, TikTok Shop, Shopee) coexist rather than
  the new channels replacing the existing three.
- "Shopee" refers to the general Shopee e-commerce marketplace, distinct from "ShopeeFood" (the
  food-delivery arm already integrated in spec 002).
- Business/seller accounts and API credentials for Lazada, TikTok Shop, and Shopee's open
  platforms are assumed to already be obtainable by store administrators; the seller-account
  approval process with each marketplace is out of scope for this spec.
- Integration reuses the webhook-based, event-driven pattern and the atomic inventory-deduction
  mechanism already established for the existing three channels, per the project constitution,
  rather than introducing a different integration style.
- Shipping-label generation, marketplace ad/promotion management, and seller performance-metric
  dashboards specific to Lazada/TikTok Shop/Shopee are out of scope; this feature covers order
  visibility and inventory accuracy only.
- Catalog/listing management (pushing product listings, prices, or stock levels to Lazada, TikTok
  Shop, or Shopee) is explicitly out of scope (confirmed); products are assumed to already be
  listed on each marketplace through that marketplace's own seller tools, independent of this
  system.
