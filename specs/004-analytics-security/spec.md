# Feature Specification: Data Analytics & Security

**Feature Branch**: `004-analytics-security`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Data Analytics and Security for chain and store managers:
role-based login and account provisioning for Cashiers, Store Managers, and Chain Managers via
JWT; sales performance reporting (best/worst sellers); and batch and expiration date tracking for
perishable products with the ability to apply near-expiry discounts. Covers FR4.1-FR4.2 plus
authentication, use cases U001 and U012-U014 from PA1, screens S01-S03 and S10-S19 from PA2."
Extended 2026-08-08 to add User Story 6 (Customer List, S19 — listed in this spec's original
screen range but not previously backed by a user story) and User Story 7 (POS Transactions, S21 —
part of PA2's "Admin Management Portal" section alongside S10-S19 but not previously claimed by
any feature spec), closing both gaps identified while scoping the Admin Management Portal
frontend.

**Source**: `pa/PA0.md` (Table 4), `pa/PA1.md` (FR Group 4, Use Cases U001, U012-U014), `pa/PA2.md`
(screens S01-S03, S10-S19, S21; PA2's "C. Admin Management Portal (Manager / Admin)" section
groups S10-S21 together, of which S20 — Online Orders — belongs to `002-omnichannel-hub`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log in and reach the right role's interface (Priority: P1)

A Cashier, Store Manager, or Chain Manager logs in with their credentials and is routed to the
interface matching their role; unauthorized users cannot reach restricted functions.

**Why this priority**: This is the single entry point for the entire system — every other
feature in every pillar (`pos-checkout`, `omnichannel-hub`, `smart-procurement`, and the rest of
this pillar) depends on it. Nothing else is independently testable through the actual UI without
it.

**Independent Test**: Can be fully tested by logging in with valid credentials for each role and
confirming correct routing, and attempting a restricted action while unauthenticated or
under-permissioned and confirming it is blocked.

**Acceptance Scenarios**:

1. **Given** a user has a valid account, **When** they submit correct credentials, **Then** the
   system authenticates them, creates a secure session, and routes them to the interface matching
   their role.
2. **Given** a user submits incorrect credentials, **When** the system validates them, **Then** it
   rejects the login, shows an error, and lets the user retry.
3. **Given** a user's account is disabled, **When** they attempt to log in, **Then** the system
   denies access and tells them to contact an administrator.
4. **Given** an unauthenticated or under-permissioned request reaches a restricted function,
   **When** the system evaluates it, **Then** it is rejected regardless of what the client sent.
5. **Given** a user has forgotten their password, **When** they request a reset via their
   registered email, **Then** the system sends a reset flow without revealing whether the email is
   registered.

---

### User Story 2 - Provision and manage staff accounts (Priority: P2)

A Chain Manager creates new staff accounts (assigning a role and branch) and views or updates
existing staff profiles.

**Why this priority**: Necessary for onboarding real staff, but the system can be exercised with
seed/admin-provisioned accounts while this story isn't yet built — Story 1 (login) doesn't require
this self-service UI to exist.

**Independent Test**: Can be fully tested by creating a new staff account with a role and branch,
then confirming that account can subsequently log in (Story 1) with the correct role-based
routing.

**Acceptance Scenarios**:

1. **Given** a Chain Manager has permission to manage staff, **When** they create a new staff
   account with name, contact info, role, and branch, **Then** the system stores it and the
   account can be used to log in.
2. **Given** an existing staff account, **When** the Chain Manager views or updates its profile,
   role, or branch assignment, **Then** the system reflects the change.

---

### User Story 3 - View sales performance reports (Priority: P2)

A Chain Manager (or Store Manager, for their branch) selects a reporting period and views sales
performance — best-selling and worst-selling products and sales trends — to support business
decisions.

**Why this priority**: High business value (directly supports purchasing/pricing decisions per
PA1 §2.1) but independent of the other stories in this pillar — it only needs completed order
data (owned by `pos-checkout`/`omnichannel-hub`) and an authenticated manager session.

**Independent Test**: Can be fully tested by seeding completed sales data across a date range,
selecting a reporting period, and confirming the report correctly identifies best/worst sellers
for that period.

**Acceptance Scenarios**:

1. **Given** completed sales data exists for a selected period, **When** a manager requests a
   sales performance report, **Then** the system shows best-selling products, worst-selling
   products, and sales trends for that period.
2. **Given** no sales data exists for the selected period, **When** the report is requested,
   **Then** the system shows an empty-report notification rather than an error.

---

### User Story 4 - Track batch and expiration dates (Priority: P2)

A Store Manager views product batches with their manufacture and expiration dates and current
quantities, and can search or filter to find products approaching expiration.

**Why this priority**: Directly addresses the perishable-goods wastage problem named in PA0/PA1 as
a core business driver; independently valuable as a monitoring tool even before discounting
(Story 5) is built.

**Independent Test**: Can be fully tested by seeding batches with a range of expiration dates and
confirming the Store Manager can filter to see only those approaching expiry, with expired ones
correctly flagged.

**Acceptance Scenarios**:

1. **Given** product batch information exists, **When** a Store Manager views batch management,
   **Then** they see product name, batch number, expiration date, and current quantity for each
   batch.
2. **Given** batches with a range of expiration dates, **When** the Store Manager filters by
   expiration date, **Then** products approaching expiration are shown.
3. **Given** a batch's expiration date has passed, **When** the system evaluates it, **Then** the
   batch is marked as expired.

---

### User Story 5 - Apply discounts to near-expiry items (Priority: P3)

A Store Manager applies a discount to a product approaching its expiration date, reducing waste by
encouraging its sale before it expires.

**Why this priority**: A direct, valuable extension of Story 4, but it cannot exist without the
batch/expiration visibility Story 4 provides — hence sequenced after it.

**Independent Test**: Can be fully tested by selecting a near-expiry product (surfaced via Story
4), applying a valid discount, and confirming the updated price is stored and reflected wherever
the product's price is shown (including at POS checkout).

**Acceptance Scenarios**:

1. **Given** a product is approaching expiration, **When** a Store Manager enters a valid discount
   percentage or new price, **Then** the system validates and applies it, updating the product's
   selling price.
2. **Given** a Store Manager enters an invalid discount value, **When** they submit it, **Then**
   the system rejects the update and lets them enter a valid value.
3. **Given** a product has already expired, **When** a Store Manager attempts to apply a discount
   to it, **Then** the system prevents the discount and recommends removing the product instead.
4. **Given** a discount has been applied, **When** the product is next scanned at POS checkout,
   **Then** the discounted price is what's charged.

---

### User Story 6 - View customer list (Priority: P3)

A Store Manager or Chain Manager views a list of the store's customers with contact information,
status, and when each was last contacted, so they can review the customer base without querying
the database directly.

**Why this priority**: A read-only directory view with lower urgency than login, staff
provisioning, reporting, or expiry tracking — valuable for managers but not blocking any other
story.

**Independent Test**: Can be fully tested by seeding a set of customer records and confirming a
manager can view the list with correct contact info, status, and last-contacted date for each.

**Acceptance Scenarios**:

1. **Given** customer records exist, **When** a manager views the Customer List, **Then** they see
   each customer's contact information, status, and last-contacted date.
2. **Given** no customers exist yet, **When** a manager views the Customer List, **Then** the
   system shows an empty-state message rather than an error.

---

### User Story 7 - View POS transactions (Priority: P3)

A Store Manager or Chain Manager views the store's in-store (POS) payment transactions —
transaction ID, customer, amount, payment method, cashier, and status — to monitor and audit
in-store sales alongside the online orders already visible via the Omnichannel Hub.

**Why this priority**: A read-only monitoring/audit view over data `001-pos-checkout` already
produces; valuable for oversight but not blocking any higher-priority story, and independently
testable against seeded transaction data.

**Independent Test**: Can be fully tested by seeding completed POS transactions with a range of
payment methods and statuses, and confirming a manager can view the list with correct transaction
ID, customer, amount, payment method, cashier, and status for each.

**Acceptance Scenarios**:

1. **Given** completed POS transactions exist, **When** a manager views POS Transactions, **Then**
   they see each transaction's ID, customer, amount, payment method, cashier, and status
   (Completed / Pending / Canceled).
2. **Given** no POS transactions exist for the current view, **When** a manager views POS
   Transactions, **Then** the system shows an empty-state message rather than an error.

### Edge Cases

- What happens when a Cashier's session token expires mid-shift — are they logged out
  immediately, or given a grace period to finish an in-progress transaction?
- How does the system handle a discount being applied to a batch that has multiple different
  expiration sub-lots of the same product?
- What happens if two managers attempt to apply conflicting discounts to the same product at the
  same time?
- How does the system handle a staff account being deactivated while that staff member has an
  active session?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST authenticate Cashiers, Store Managers, and Chain Managers via
  credentials and issue a JSON Web Token establishing their authenticated session.
- **FR-002**: The system MUST route an authenticated user to the interface matching their assigned
  role.
- **FR-003**: The system MUST reject requests to restricted functions from unauthenticated or
  under-permissioned users.
- **FR-004**: The system MUST reject login with invalid credentials, show an error, and allow the
  user to retry.
- **FR-005**: The system MUST deny access and inform the user to contact an administrator when
  their account is disabled.
- **FR-006**: The system MUST let a user request a password reset via their registered email.
- **FR-007**: The system MUST let a Chain Manager create new staff accounts with an assigned role
  and branch.
- **FR-008**: The system MUST let a Chain Manager view and update an existing staff account's
  profile, role, or branch assignment.
- **FR-009**: The system MUST let a manager view sales performance reports — best-selling and
  worst-selling products and sales trends — for a selected reporting period.
- **FR-010**: The system MUST show an empty-report notification, not an error, when no sales data
  exists for a selected reporting period.
- **FR-011**: The system MUST let a Store Manager view product batches with manufacture date,
  expiration date, and current quantity.
- **FR-012**: The system MUST let a Store Manager search or filter products by expiration date.
- **FR-013**: The system MUST mark a batch as expired once its expiration date has passed.
- **FR-014**: The system MUST let a Store Manager apply a validated discount (percentage or new
  price) to a near-expiry product's selling price.
- **FR-015**: The system MUST reject a discount value that fails validation, and let the Store
  Manager correct it.
- **FR-016**: The system MUST prevent applying a discount to an already-expired product, and
  recommend removing it instead.
- **FR-017**: The system MUST apply an updated discounted price immediately, so subsequent POS
  scans of that product reflect the new price.
- **FR-018**: The system MUST record discount changes for tracking purposes.
- **FR-019**: The system MUST let a manager view a list of customers with contact information,
  status, and last-contacted date.
- **FR-020**: The system MUST show an empty-state message, not an error, when no customers exist.
- **FR-021**: The system MUST let a manager view a list of POS transactions with transaction ID,
  customer, amount, payment method, cashier, and status.
- **FR-022**: The system MUST show an empty-state message, not an error, when no POS transactions
  exist for the current view.

### Key Entities *(include if feature involves data)*

- **Staff Account**: A user of the system — credentials, full name, and an assigned Role; the
  subject of authentication and of Story 2's provisioning.
- **Role**: A named permission set (Cashier, Store Manager, Chain Manager) that determines which
  interface and functions a Staff Account can access.
- **Sales Report**: A derived (not separately stored) view over completed orders for a selected
  period, summarizing best/worst sellers and trends. Reads from `Order`/`Order Line Item` owned by
  `pos-checkout`/`omnichannel-hub`.
- **Batch**: A dated lot of a product — manufacture date, expiration date, and current quantity;
  owned conceptually by the shared product/inventory data, surfaced here for tracking and
  discounting.
- **Discount Record**: A record of a price change applied to a near-expiry product, kept for
  tracking purposes (FR-018).
- **Customer**: A store customer — contact information, status, and last-contacted date; surfaced
  read-only by Story 6. Ownership of the underlying customer record (e.g. whether it is created by
  this feature or another) is not specified by PA0/PA1/PA2 and is out of scope here — this feature
  only reads and lists it.
- **POS Transaction**: A completed or in-progress in-store payment — transaction ID, customer,
  amount, payment method, cashier, and status; owned by `001-pos-checkout`, surfaced read-only here
  for manager oversight (Story 7), the same relationship this feature already has with `Order`/
  `Order Line Item` for Story 3's sales reports.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authentication completes (credentials submitted to session established) in under 3
  seconds.
- **SC-002**: 100% of unauthorized attempts to reach a restricted function are blocked.
- **SC-003**: A manager can generate a sales performance report for any selected period and
  identify the top and bottom sellers without needing developer or database assistance.
- **SC-004**: 100% of batches past their expiration date are automatically flagged as expired,
  with no manual review required to notice it.
- **SC-005**: A discount applied to a near-expiry product is reflected at POS checkout on the very
  next scan of that product.
- **SC-006**: A manager can locate a specific customer's contact info or status from the Customer
  List without developer or database assistance.
- **SC-007**: A manager can locate a specific POS transaction (e.g. to answer a customer dispute)
  from the transaction list without developer or database assistance.

## Assumptions

- Password reset (FR-006) does not reveal whether a submitted email is registered, following
  standard security practice; PA1 does not state this explicitly but it is a reasonable default
  consistent with Constitution Principle II (stateless, security-conscious auth).
- Session/token lifetime and renewal behavior are not specified in PA0/PA1 beyond "secure session
  management"; a specific expiry policy is left as an implementation decision, not fixed here.
- Sign-up (self-service account creation, PA2 screen S02) is treated as in scope for a Cashier's
  or Manager's *first* account creation, but real deployments likely rely primarily on Story 2's
  admin-provisioned accounts; both paths are covered by FR-001/FR-007 without contradiction.
- Screens S13-S15 (Product List, Details, Add Product) are treated as the closest PA2 mockups
  supporting batch/expiration tracking and discount entry (their event-handling sections describe
  stock-status badges and an Expiry Date/Batch No. field), even though PA2's screen-to-use-case
  mapping table does not explicitly list them against U013/U014 — PA2 itself notes the prototype
  mapping is not yet fully finalized.
- "Sales trends" (FR-009) is treated as a qualitative visual (e.g., a trend chart) rather than a
  specific forecasting algorithm; PA1 does not specify a calculation method.
- Story 6 (Customer List) and Story 7 (POS Transactions) are read-only monitoring views for this
  feature; creating/editing customers and modifying POS transactions are out of scope here and, if
  needed, belong to whichever feature owns that data's write path.
- Story 7 reads `001-pos-checkout`'s transaction data the same way Story 3 reads its order data —
  no new write path or schema ownership is introduced by this feature.
