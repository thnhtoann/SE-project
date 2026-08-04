# Feature Specification: POS Checkout

**Feature Branch**: `001-pos-checkout`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Hotkey-optimized POS checkout for cashiers: scan or search
products, apply discounts including near-expiry markdowns, accept cash or bank QR payment, print
thermal receipts, and trigger the cash drawer only after confirmed payment. Covers FR1.1-FR1.3,
use cases U002-U006 from PA1, screens S04-S09 from PA2."

**Source**: `pa/PA0.md` (Table 1), `pa/PA1.md` (FR Group 1, Use Cases U002-U006), `pa/PA2.md`
(screens S04-S09)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete a cash sale (Priority: P1)

A Cashier scans or looks up products for a customer, sees a running total, and completes the sale
by accepting cash. The system deducts the sold quantities from inventory as soon as payment is
confirmed.

**Why this priority**: This is the core revenue-generating workflow. Without it, the store cannot
process a single sale — every other POS capability is secondary to this.

**Independent Test**: Can be fully tested by scanning/adding products to a new transaction,
completing checkout with cash, and confirming the transaction is recorded and inventory is
deducted — with no other story implemented.

**Acceptance Scenarios**:

1. **Given** a Cashier has started a new transaction, **When** they scan a product barcode that
   exists and is in stock, **Then** the product's name, price, and quantity are added to the
   current transaction and the running total updates.
2. **Given** a transaction has one or more items, **When** the Cashier confirms cash payment
   equal to or greater than the total, **Then** the system marks the transaction complete,
   deducts the purchased quantities from inventory, and stores the transaction record.
3. **Given** a Cashier scans a barcode with no matching product, **When** the scan completes,
   **Then** the system shows "Product not found" and does not add anything to the transaction.
4. **Given** a Cashier scans a product that is out of stock, **When** the scan completes, **Then**
   the system shows an error and prevents the product from being added.
5. **Given** the system loses connection to the server mid-transaction, **When** the Cashier
   attempts to complete checkout, **Then** the system shows a connection error and the transaction
   is not marked complete until connectivity is restored.

---

### User Story 2 - Print a receipt and open the cash drawer (Priority: P1)

After a cash sale is completed, the system prints a receipt for the customer and automatically
opens the cash drawer so the Cashier can handle change — but only once payment is verified.

**Why this priority**: Required for physical cash handling and receipt compliance in every retail
transaction; a store cannot legally or practically operate without it. It is listed separately
from Story 1 because it is a distinct hardware-integration slice that can be built and tested
against a completed-transaction record independently of the checkout UI itself.

**Independent Test**: Can be fully tested by completing a transaction (e.g., via Story 1 or a
seeded completed transaction) and confirming a receipt prints and the drawer opens exactly once,
after and not before payment confirmation.

**Acceptance Scenarios**:

1. **Given** a cash payment has been confirmed, **When** the transaction completes, **Then** the
   system sends a receipt to the connected thermal printer and stores the receipt information.
2. **Given** a cash payment has been confirmed, **When** the transaction completes, **Then** the
   system sends an open command to the cash drawer and the drawer opens automatically.
3. **Given** no payment has been confirmed yet, **When** any prior step of checkout is in
   progress, **Then** the cash drawer MUST NOT open.
4. **Given** the receipt printer is disconnected, **When** the system attempts to print, **Then**
   it shows a printer error and lets the Cashier retry without losing the completed transaction.
5. **Given** the cash drawer is disconnected, **When** the system attempts to open it, **Then** it
   shows a hardware error and the Cashier can open the drawer manually.

---

### User Story 3 - Pay by Bank QR code (Priority: P2)

A Customer completes payment by scanning a bank QR code shown at checkout, as an alternative to
cash.

**Why this priority**: Expands payment options and is explicitly required (FR1.3), but the core
checkout flow (Story 1) already delivers a usable MVP without it — QR payment is an additive
payment method on top of an existing transaction flow.

**Independent Test**: Can be fully tested by reaching the payment step of an existing transaction,
selecting QR payment, and confirming the transaction completes only after the banking service
confirms payment.

**Acceptance Scenarios**:

1. **Given** a Cashier has reached the payment step, **When** they select Bank QR payment,
   **Then** the system generates a QR code for the exact transaction total.
2. **Given** a Customer has scanned and confirmed the QR payment in their banking app, **When**
   the payment service confirms the transaction, **Then** the system updates the transaction
   status to completed and continues checkout (receipt, drawer, inventory deduction).
3. **Given** the payment service rejects the QR transaction, **When** the rejection is received,
   **Then** the system notifies the Cashier and lets them select another payment method without
   losing the current transaction.
4. **Given** the payment service is unreachable, **When** the Cashier selects QR payment,
   **Then** the system shows a connection error and offers another payment method.
5. **Given** a QR payment has already been confirmed for a transaction, **When** any duplicate
   confirmation is received for that same transaction, **Then** the system MUST NOT process the
   payment a second time.

---

### User Story 4 - Look up a past order or check stock mid-shift (Priority: P3)

A Cashier searches for a previous transaction (by customer, code, date, or channel) or checks a
product's on-hand/incoming/available stock at the current branch without leaving the POS screen.

**Why this priority**: Useful for handling customer questions and stock queries during a shift,
but not required to process a sale — the store can operate on Stories 1-3 alone.

**Independent Test**: Can be fully tested by searching for a known past transaction or a known
product and confirming the correct details are displayed, independent of an active checkout.

**Acceptance Scenarios**:

1. **Given** past transactions exist, **When** a Cashier searches by name, code, or date range,
   **Then** matching orders are listed with enough detail to identify the correct one.
2. **Given** a Cashier searches for a product by name or SKU, **When** the search completes,
   **Then** the product's on-hand, incoming, and available quantities at the current branch are
   shown.

---

### User Story 5 - Manage a cash shift and view the end-of-day report (Priority: P3)

A Cashier opens and closes their register shift and can view a same-day revenue summary broken
down by payment method and hour.

**Why this priority**: Operational bookkeeping that supports reconciliation and reporting, but not
required for any individual sale to succeed.

**Independent Test**: Can be fully tested by opening a shift, recording sales against it (or using
seeded transaction data), closing the shift, and confirming the cash-in-shift and end-of-day
totals match the underlying transactions.

**Acceptance Scenarios**:

1. **Given** no shift is currently open for a register, **When** a Cashier opens a shift, **Then**
   subsequent transactions on that register are attributed to the open shift.
2. **Given** an open shift with recorded transactions, **When** the Cashier closes the shift,
   **Then** the system shows cash-in-shift totals broken down by payment method.
3. **Given** completed transactions exist for the current day, **When** a Cashier requests the
   end-of-day report, **Then** the system shows total revenue, an hourly breakdown, and top-selling
   products for that day.

### Edge Cases

- What happens when a Cashier scans the same product barcode multiple times in one transaction?
  (System increments quantity rather than adding duplicate line items.)
- How does the system handle a transaction abandoned mid-checkout (e.g., customer leaves)?
- What happens if inventory drops to exactly zero mid-transaction due to a concurrent sale on
  another channel (see `omnichannel-hub`) before this transaction's payment is confirmed?
- How does the system handle a partial/short cash payment (amount tendered less than total)?
- What happens when the QR payment is confirmed by the bank but the confirmation webhook arrives
  after the Cashier has already cancelled the transaction locally?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a checkout interface that a Cashier can operate entirely
  via keyboard hotkeys, without requiring mouse interaction for the core scan-total-pay flow.
- **FR-002**: The system MUST integrate with a barcode scanner to add products to the current
  transaction by scanning, supporting common 1D and 2D barcode formats.
- **FR-003**: The system MUST show "Product not found" and take no action when a scanned barcode
  does not match any product.
- **FR-004**: The system MUST prevent adding a product to a transaction when it is out of stock,
  and MUST show an error to the Cashier.
- **FR-005**: The system MUST support completing payment by cash.
- **FR-006**: The system MUST support completing payment by Bank QR code, including generating a
  QR code for the transaction's exact total and waiting for the payment service's confirmation
  before marking the transaction paid.
- **FR-007**: The system MUST NOT process the same confirmed payment twice for one transaction.
- **FR-008**: The system MUST deduct the purchased quantities from inventory immediately once a
  transaction's payment is confirmed as successful.
- **FR-009**: The system MUST keep a transaction pending (not lost) if payment fails or the
  connection to the server is lost, and MUST let the Cashier retry or choose another payment
  method.
- **FR-010**: The system MUST print a receipt to a connected thermal printer and store the
  receipt information once a transaction completes.
- **FR-011**: The system MUST send an open command to the cash drawer only after payment for the
  current transaction is confirmed successful — never before.
- **FR-012**: The system MUST show a clear hardware error (without losing the completed
  transaction) if the receipt printer or cash drawer cannot be reached.
- **FR-013**: The system MUST let a Cashier search past transactions by customer, code, or date
  range, and view a selected transaction's details.
- **FR-014**: The system MUST let a Cashier search for a product and see its on-hand, incoming,
  and available quantity at the current branch.
- **FR-015**: The system MUST let a Cashier open and close a cash shift on a register, and MUST
  attribute transactions to the currently open shift.
- **FR-016**: The system MUST provide a same-day (end-of-day) revenue summary with an hourly
  breakdown and top-selling products.

### Key Entities *(include if feature involves data)*

- **Transaction (Order)**: A single customer sale — records when it happened, which branch and
  Cashier processed it, the payment method used, the total amount, and its status
  (completed/pending/cancelled). Every transaction contains one or more line items.
- **Transaction Line Item**: One product within a transaction — the product, quantity, unit price
  at time of sale, and line subtotal (unit price may reflect a near-expiry discount applied
  elsewhere in the system).
- **Product**: The item being sold — identified by a scannable barcode, with a name and current
  selling price. Owned/maintained outside this feature (see `smart-procurement` and the shared
  catalog).
- **Receipt**: The printed/stored record of a completed transaction, derived from the transaction
  and its line items.
- **Shift**: A Cashier's working session on a register, bounding which transactions count toward
  its cash-in-shift totals.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Cashier can complete a standard cash transaction (3-5 items, already in stock) in
  under 30 seconds using only the keyboard.
- **SC-002**: A scanned barcode for an in-stock product is added to the transaction, with name and
  price displayed, in under 1 second.
- **SC-003**: The cash drawer opens within 1 second of a payment being confirmed successful, and
  in 100% of observed cases does not open before confirmation.
- **SC-004**: Receipts print successfully for at least 99% of completed transactions under normal
  (connected) hardware conditions.
- **SC-005**: A Cashier is never left without a clear next action (retry, alternate payment
  method, or manual fallback) when a payment, printer, or drawer failure occurs.

## Assumptions

- Product catalog, pricing, and current inventory levels already exist before checkout begins;
  managing that catalog is out of scope for this feature (see `smart-procurement`).
- Near-expiry discount pricing is applied by another feature before the product reaches checkout;
  this feature simply reflects whatever price is on the product at scan time.
- "Card" payment shown in the PA2 prototype mockup (`Payment` screen) is out of scope: PA0/PA1's
  FR1.3 names only Bank QR as the additional payment method beyond cash, so card processing is not
  a stated requirement.
- Order Lookup, Inventory Lookup, Shift Management, and End-of-Day Report (User Stories 4-5,
  PA2 screens S06-S09) are included based on PA2's Figma-to-system screen mapping table; PA1 does
  not define full use-case specifications for them (unlike U002-U006), so their acceptance
  scenarios here are reasonable inferred defaults rather than transcribed line-by-line from a
  source use case.
- A stable broadband connection (per the project constitution's Principle VI) is assumed at the
  POS location; this feature must degrade with a clear error, not silently, when that assumption
  breaks.
- Multi-currency support is out of scope; all amounts are in a single store currency.
