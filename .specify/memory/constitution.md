<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (initial ratification)
- List of modified principles: n/a (first version; all six principles newly added)
- Added sections: Core Principles (I–VI), Technology Stack & Environment Constraints,
  Development Workflow, Governance
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible as-is (Constitution Check gate references this file)
  - .specify/templates/spec-template.md ✅ compatible as-is (no principle-specific mandatory sections needed)
  - .specify/templates/tasks-template.md ⚠ pending — not yet reviewed against these principles (out of scope for this pass; revisit when /speckit-tasks is first run)
  - .claude/skills/speckit-*/SKILL.md ✅ no CLAUDE-only or other-agent-specific references found
  - CLAUDE.md ✅ Spec Kit section already cross-references this file; no changes needed
- Follow-up TODOs: TODO(RATIFICATION_DATE) — original adoption date not recorded in source documents (PA0/PA1/PA2); team should confirm and replace.
-->

# Convenience Store Chain Management System Constitution

## Core Principles

### I. API-First, Client-Server Architecture

The backend (Django + Django REST Framework) MUST expose functionality exclusively through
RESTful JSON APIs — it MUST NOT render HTML views. Every client (the hotkey-optimized POS SPA,
the Management & Analytics Portal, and any future channel such as a mobile app) consumes the same
API surface. This decoupling is non-negotiable: it is what lets the POS, management portal, and
future clients evolve and scale independently without backend changes.

**Rationale**: PA0 §2.3 and PA2 §3.1.2 mandate an API-first, SPA-consuming architecture so the
system can add channels (e.g., mobile apps) by reusing the same APIs rather than rebuilding
server-rendered views.

### II. Stateless JWT Authentication & Role-Based Access Control

All API requests MUST be authenticated via JSON Web Tokens; the server MUST NOT persist session
state in memory or database session tables. Every endpoint MUST enforce role-based permissions
distinguishing at minimum **Cashier**, **Store Manager**, and **Chain Manager**, per NFR1.
Unauthenticated or under-permissioned requests MUST be rejected by the API Gateway/permission
layer before reaching business logic.

**Rationale**: PA1 NFR1 and PA2's "Stateless Authentication Pattern" require JWT-based RBAC so the
backend can scale horizontally without shared session storage, while still strictly separating
what each role can see and do.

### III. Data Integrity: Third Normal Form + ACID Transactions

The relational schema (PostgreSQL or MySQL) MUST be designed in Third Normal Form. Every
transaction that mutates shared state — most critically real-time inventory deduction across
concurrent sales channels — MUST be wrapped so it is Atomic, Consistent, Isolated, and Durable.
Concurrent stock deductions from POS and omnichannel orders MUST NOT be allowed to race and
corrupt inventory counts.

**Rationale**: PA0 §2.3, PA1 NFR2, and PA2's data design explicitly require 3NF + ACID to prevent
the inventory discrepancies and overselling described as the core business problem in PA1 §2.1.

### IV. Event-Driven Integration via Webhooks, Not Polling

Integrations with external systems — delivery platforms (GrabMart, ShopeeFood, BeMart) and the
banking QR payment gateway — MUST be implemented as webhook listeners that react to pushed
events. Continuous polling of third-party APIs for status changes MUST be avoided; it wastes
server resources and cannot deliver the real-time inventory accuracy the system requires.

**Rationale**: PA2 §3.1.2 names the Observer/Webhook pattern as the key mechanism enabling the
Omnichannel Hub to operate in real time, replacing inefficient polling.

### V. UML-Documented, Version-Controlled Design

System analysis and design decisions MUST be captured using UML artifacts (Use Case, Activity,
and Sequence diagrams at minimum) before or alongside implementation. All source code MUST be
managed in the project's GitHub repository under the structure required by the course, with
changes traceable to the requirement or use case they implement.

**Rationale**: PA0 §2.3 "Documentation and Project Management Constraints" requires UML-standard
analysis/design artifacts and GitHub-managed source control as academic and team-coordination
requirements.

### VI. Hardware & Network Realism

Point-of-sale features MUST account for real retail hardware: barcode scanners and thermal
receipt printers connected via USB/Bluetooth (WebUSB/WebBluetooth from the browser), and a cash
drawer that opens automatically **only** after a payment is confirmed as successful — never
before. Features that depend on real-time synchronization (webhook interception, omnichannel
sync) MUST assume the minimum network baseline of 30 Mbps down / 10 Mbps up at every POS
location, and MUST degrade predictably (clear error, not silent failure) when that connection is
lost.

**Rationale**: PA0 §2.2/§3.2.3 and PA1 §2.2/NFR3/NFR5 define concrete hardware and network
constraints that features must design for rather than assume away.

## Technology Stack & Environment Constraints

- **Backend**: Django + Django REST Framework, Python 3.12 (matches PA0's "Django (Python)"
  constraint and this repository's existing `src/backend/` setup).
- **Frontend**: Single Page Application(s) — the POS client and the Management/Analytics Portal —
  built on modern HTML5/CSS3/TypeScript, compatible with Chrome, Firefox, Safari, and Edge.
- **Database**: PostgreSQL (this repository's existing choice, satisfying PA0's
  PostgreSQL-or-MySQL requirement), 3NF schema, ACID transactions (see Principle III).
- **Local development**: Docker Compose orchestrates backend, frontend, and Postgres (see
  `CLAUDE.md`); there is no supported non-Docker local dev path for application services. Spec
  Kit's own CLI (`specify`) is a host-level tool and is exempt from this constraint (see
  `CLAUDE.md`'s Spec Kit section).
- **Deployment target**: A Linux VPS/cloud instance (Apache or Nginx) is the reference production
  environment per PA0 §3.2.2; minimum viable cluster sizing per PA0 is 4 vCPUs / 8GB RAM / 100GB
  NVMe, with automated daily database snapshots and replication.
- **POS terminal hardware baseline**: Dual-core 2.0GHz, 4GB RAM, 64GB SSD, capable of running an
  HTML5-compatible browser (PA0 §3.2.1 / PA1 NFR5).

## Development Workflow

- Requirements, design, and test artifacts are tracked per feature under `specs/<NNN-feature>/`
  via Spec Kit (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`), following the **flow-forward**
  persistence convention documented in `CLAUDE.md`: a feature's artifacts are frozen once
  implemented, and new requirements get a new feature directory. The original academic proposal,
  requirements analysis, and software design documents remain available in `pa/` (`PA0.md`,
  `PA1.md`, `PA2.md`) as the historical source these feature specs were derived from.
- Task tracking and team communication tools (Jira, Discord) are external to this repository and
  out of scope for this constitution; see the team's own process documentation if that changes.
- Code review MUST check compliance with `.claude/rules/code-style.md` and
  `.claude/rules/api-conventions.md`, per the existing `code-reviewer`, `api-contract-auditor`,
  and `frontend-reviewer` subagents in `.claude/agents/`.

## Governance

This constitution supersedes ad hoc technical decisions for anything it explicitly addresses.
Where this constitution and a PA0/PA1/PA2 document disagree, treat the disagreement as a signal to
reconcile explicitly (update this file or flag the PA document as superseded) rather than silently
picking one.

**Amendment procedure**: Propose changes via `/speckit-constitution` with the specific principle or
section to change and why. Amendments MUST update the version number below and prepend a Sync
Impact Report (as at the top of this file) describing what changed and which downstream templates
were checked.

**Versioning policy** (semantic versioning):
- **MAJOR**: A principle is removed or redefined in a backward-incompatible way.
- **MINOR**: A new principle or materially expanded section is added.
- **PATCH**: Wording, clarification, or typo fixes with no rule-level change.

**Compliance review**: Every `/speckit-plan` run MUST evaluate its Constitution Check gate against
the principles above before proceeding past Phase 0, and re-check after Phase 1 design.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not recorded in
PA0/PA1/PA2 — confirm with the team | **Last Amended**: 2026-08-04
