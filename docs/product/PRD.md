# Product Requirements Document

> **Status:** Approved — captured via `/init-product` on 2026-08-28.

## Product Overview

**Name:** Change Management System
**One-liner:** A change management system for creating, reviewing, approving, tracking and completing change requests, with role-based actions, comments, status history and a filterable dashboard.
**Target user:** Requesters who need to raise a change and see where it stands, plus the approvers and managers who act on and oversee those requests. Today this runs on email, documents and spreadsheets.

> **Scope note:** this is a *general* change management system. It is deliberately **not** an ITIL/CAB
> tool — there is no change advisory board, no release windows, and no risk assessment,
> implementation plan or rollback plan fields.

## Problem Statement

Change requests are currently handled manually through emails, documents and spreadsheets. There is no single place that holds a request, its current status, and the record of who did what to it. The consequences:

- **Approvals stall and get lost** in inboxes, with no clear owner or queue.
- **Nobody can answer "where is my request?"** without chasing people individually.
- **There is no reliable history.** Decisions and status changes live in scattered email threads, so there is no dependable audit trail.
- **Oversight is guesswork.** Managers cannot see across all in-flight requests to spot what is stuck.

This product replaces that manual process with a single system where a request is raised, decided, tracked and completed — and where its full history is always visible.

## Core Features (MVP)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 1 | Create & submit change requests | Requester creates a request, saves it as a draft, and submits it for review | Must-have |
| 2 | Review & decide | Approver approves, rejects, or sends the request back for changes | Must-have |
| 3 | Lifecycle & status tracking | Request moves through a defined set of statuses; the current status is always visible | Must-have |
| 4 | Comments | Discussion on a request, so context lives with the request rather than in email | Must-have |
| 5 | Status history / audit trail | An append-only record of who did what, and when, for every status change and decision | Must-have |
| 6 | Dashboard with filtering | List view of requests, filterable by status, category, priority and date | Must-have |
| 7 | Role-based actions & basic user/role handling | Available actions depend on the user's role; an admin manages users and role assignment | Must-have |

### Change request fields

| Field | Notes |
|-------|-------|
| Title | Short summary of the change |
| Description | What is changing and why |
| Requester | The user who raised it — set from the signed-in user |
| Created date | Set by the system |
| Category / type | Classifies the change; used for filtering |
| Priority | Used for filtering and triage |
| Target date | When the requester wants the change done by |
| Comments | Discussion attached to the request |

> **Not included:** file attachments; risk assessment, implementation plan or rollback plan fields.

### Lifecycle

```
Draft  ->  Submitted  ->  Under Review  ->  Approved | Rejected | Changes Requested

Changes Requested  ->  Draft                (requester edits and resubmits)
Approved  ->  In Progress  ->  Completed    (driven by the requester)
```

Each transition writes an entry to the status history.

## Out of Scope (MVP)

This product explicitly does **not** do the following in its first version:

- [ ] **File attachments** on change requests
- [ ] **Email or external notifications** — users track status through the dashboard
- [ ] **Multi-step or parallel approval chains**, delegation, or conditional routing — one approver per request
- [ ] **SLA timers**, breach warnings, or auto-escalation of overdue requests
- [ ] **Reporting, analytics, charts, or CSV/PDF export**
- [ ] **External integrations** — no Jira, ServiceNow, Slack, Teams or calendar sync, and no public third-party API

## User Personas

### Primary: Requester
- **Context:** Needs a change made and has to get it approved. Raises requests during the working day, at a desk.
- **Goals:** Submit a change quickly, know it has reached the right person, see its status without asking anyone, and mark it done once the work is complete.
- **Frustrations:** Today the request goes out by email or in a document. There is no confirmation it was received, no visible queue position, and no record of what was decided or when.
- **Owns:** Creating and editing drafts, submitting, resubmitting after changes are requested, and moving an approved request to `In Progress` and then `Completed`.

### Secondary: Approver
- **Context:** Receives requests assigned to them for a decision.
- **Goals:** See what is waiting on them, read the detail, and record a decision with a reason.
- **Frustrations:** Requests arrive buried in email with no consistent format, and there is no single list of what is outstanding.
- **Differs from primary:** Does not create requests as part of this role. Can **approve**, **reject**, or **request changes** — the last of which returns the request to the requester as a draft. One approver per request in the MVP.

### Secondary: Manager
- **Context:** Accountable for change activity across the organisation rather than for individual requests.
- **Goals:** See all requests in one place, filter to what matters, and spot anything stalled.
- **Frustrations:** No cross-cutting view today; status has to be assembled by asking people.
- **Differs from primary:** Read-and-oversee rather than act. Sees every request regardless of who raised it, and uses the dashboard and filters as the main working surface.

### Secondary: Admin
- **Context:** Maintains the system rather than using the change workflow.
- **Goals:** Keep users and their role assignments correct.
- **Frustrations:** Not applicable — this role exists because role-based actions need someone to administer them.
- **Differs from primary:** Manages users and roles. Does not participate in the approval workflow by virtue of this role.

## User Flows

### Flow 1: Requester raises a change request
1. User signs in.
2. User selects **New Request**.
3. User completes the form — title, description, category/type, priority, target date.
4. User either **saves as Draft** to finish later, or **submits** the request.
5. On submit, status becomes `Submitted` and a history entry is written.
6. The request appears on the user's dashboard with its current status.
7. User checks the dashboard to see the decision once it has been made.
8. Once approved, the user moves the request to `In Progress`, and to `Completed` when the work is done.

### Flow 2: Approver decides on a request
1. Approver signs in.
2. Approver sees the requests awaiting their decision.
3. Approver opens a request and reads the detail and comments.
4. Approver adds a comment explaining their reasoning.
5. Approver selects **Approve**, **Reject**, or **Request Changes**.
6. Status updates accordingly and a history entry is written recording who decided, what, and when.
7. If changes were requested, the request returns to `Draft` for the requester to edit and resubmit.

### Flow 3: Manager oversight
1. Manager signs in.
2. Manager opens the dashboard showing all change requests across the organisation.
3. Manager filters by status, category, priority or date.
4. Manager identifies a request that appears stalled.
5. Manager opens it and reads the full status history to see where it stopped and who last acted.

## Success Metrics

- [ ] Users can create, submit, review, approve and track a change request end-to-end without relying on email or spreadsheets
- [ ] Current status and full history are always visible in the system for any request
- [ ] **Quantitative targets to be defined** — revisit before MVP launch

> **Note:** the first two criteria above are capability statements — they define when the MVP is
> functionally complete, not whether it is succeeding in use. Measurable targets (for example
> adoption count, or time-to-decision compared with the current email process) still need to be
> agreed. This is recorded as an open item rather than left implicit.

## Design Preferences

- [x] **Desktop-first**, dashboard-style
- [x] Data-dense list views with filters and clear status indicators
- [ ] Brand colors / style references: not yet specified

Rationale: all three user journeys describe someone working at a desk during the working day — filtering lists, reading detail, recording decisions. Density and filtering matter more than a mobile-optimised layout.

> For full visual direction, brand voice, and interaction principles, see [design-system.md](design-system.md) (populated by the optional `/init-design-system` step).

## Reference Products / Mental Model

Closest to a lightweight version of the change-request workflow found in a general-purpose work tracker — much simpler, and focused only on managing change requests.

- **Jira** — a useful reference for the request-with-status-and-comments model and the filterable queue view. This product is far narrower: one item type, one workflow, no projects, boards, sprints or configurable issue schemes.
- **ServiceNow (change request module)** — a useful reference for the request → review → decision → implementation lifecycle. This product takes the shape of that flow without the ITIL apparatus around it: no CAB, no risk scoring, no release calendar, no integration surface.

The mental model to hold: *"the approval workflow, and only the approval workflow."*

## Constraints

- **Timeline:** not specified during discovery
- **Compliance:** none specified for the MVP
- **Technical:** the provided `next-azure-postgres` paved-road stack — Next.js, PostgreSQL, Azure (documented in [../architecture/tech-stack.md](../architecture/tech-stack.md))
- **Scope:** keep the MVP simple and role-based, within the agreed scope — no external integrations, no advanced reporting
