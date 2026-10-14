# BrightBuy Agent Rules & Constraints

When writing or modifying code in this project, you MUST strictly adhere to the following rules.

---

## Team Member Identity & Workflow Protocol

### 1. New Session Initialization (Mandatory First Step)
- **Identify the User:** Whenever a new chat is opened, the **very first thing the agent MUST do** is ask the user which team member they are:
  - **A** (Frontend – Storefront: Customer-facing browsing, search, categories, reports UI)
  - **B** (Frontend – Admin/Cart: Auth pages, admin dashboard UI, cart/checkout UI)
  - **C** (Backend – Products: Product/category/image APIs, admin CRUD, report queries)
  - **D** (Backend – Orders: Cart/order/payment/delivery APIs, email notifications)
  - **E** (DevOps + Architecture: Docker, Flyway, scaffolding, auth system, deployment)

### 2. Guide Next Steps
- After the user confirms their identity (A, B, C, D, or E):
  - **Phases Workflow:** Read `Docs/overallplan.md` (Phase Progress Tracker) to find the active phase and the **subphases assigned to that member**. Open `Docs/Phases/PhaseX-<Name>/phaseX-<name>.md` and `Docs/Phases/PhaseX-<Name>/phaseX.Y-<name>.md`.
  - **Fixes Workflow:** If working on fixes, bugs, or patches, read `Docs/Fixes/overallplan.md` (Fix Progress Tracker) to find the active fix group and the **fix items assigned to that member** (e.g., Fix 1 to Fix 5 and subfixes 1.1 to 5.1). Open `Docs/Fixes/FixX-<Name>/fixX-<name>.md` and `Docs/Fixes/FixX-<Name>/fixX.Y-<name>.md`.
- Guide them through their next unfinished subphase or fix item: its tasks, API contracts, shared contracts (e.g. Flyway migrations), and Definition of Done.

### 3. Dependency & Blocker Handling
- **Check Dependencies:** Every subphase and fix doc lists `Depends On` and `Blocks`. Before guiding work, check whether each prerequisite is complete (ticked in `Docs/overallplan.md` or `Docs/Fixes/overallplan.md`).
- **Flag Blockers:** If another team member's subphase or fix is blocking them or has missed a milestone:
  - Clearly tell the user their work is blocked by Member **[A/B/C/D/E]** and name the missing item and deliverable (e.g. "Fix 2.1 UI is blocked by C's 2.1 Price Index Migration").
  - Advise them to **wait until Member [Letter] completes their job** before doing the dependent work.
  - Point them to unblocked work they can do meanwhile: another of their subphases/fixes, or building against documented API contracts with mock data (where allowed).

### 4. Git Branching & Main Branch Protection (STRICT RULE)
- **NEVER push, commit, or merge to the `main` branch without the user's EXPLICIT PERMISSION.**
- All development, feature work, and fixes must be carried out on `dev` or dedicated feature branches.
- The agent is **STRICTLY PROHIBITED** from:
  1. Running `git push origin main` or pushing commits directly to `main`.
  2. Merging any Pull Request targeting `main` (e.g. via `gh pr merge`) without explicit user sign-off.
  3. Creating a merge commit into `main` locally.
- **Rationale:** Merging or pushing to `main` automatically triggers the production Continuous Deployment (CD) pipeline to the live AWS EC2 server. Therefore, `main` is strictly protected, and any deployment-triggering action requires explicit, prior approval from the user.

---

## Architectural Constraints

### 1. Frontend Data Fetching
- **Constraint:** **Do NOT** use abstraction libraries like TanStack Query.
- **Requirement:** Rely exclusively on standard `fetch()` or `Axios` using React `useEffect`.

### 2. Database Queries
- **Constraint:** **NO ORMs** or query builders (e.g., Prisma, TypeORM, Knex) are allowed.
- **Requirement:** You must write pure, raw SQL using the `pg` driver.

### 3. Authentication
- **Constraint:** **NO** third-party authentication services or libraries like Supabase or Better Auth.
- **Requirement:** Implement a fully custom JWT (JSON Web Tokens) solution using `HttpOnly` cookies.

### 4. File & Media Storage
- **Allowed Options:** AWS S3 (Amazon Simple Storage Service) or direct PostgreSQL Binary Data (`BYTEA` column).
- **Lecturer Approval:** Lecturer approved the use of AWS S3 for cloud object storage.

### 5. Frontend Styling & UI
- **Requirement:** Use **Tailwind CSS** for styling and **shadcn/ui** for UI components.
- **State Management:** Use **Zustand** for client-side state management.

---

## Documentation Navigation Process

The project follows a documentation-first approach. **You MUST follow this navigation flow before writing any code:**

1. **Start here → `Docs/overallplan.md`**
   This is the master plan. It contains team assignments, database table ownership, the phase **and subphase** progress tracker, and links to every phase document. Always read this first to understand what has been done and what needs to be done next.

2. **Navigate to the phase overview → `Docs/Phases/PhaseX-<Name>/phaseX-<name>.md`**
   Each phase doc is an overview: status, what's done, members, a subphase table (assignee, dependencies, status), a dependency diagram, shared contracts between members, and phase-level key decisions.

3. **Navigate to the subphase → `Docs/Phases/PhaseX-<Name>/phaseX.Y-<name>.md`**
   Each subphase doc has the assigned member(s), `Depends On` / `Blocks`, task checkboxes, API contracts, Definition of Done, and key decisions. Read it before starting any work.

4. **Refer to the DB schema → `Docs/Database/DB_Schema.md`**
   This is the **single source of truth** for the database schema. All phase docs reference this file. Never create tables or modify schema without updating this file.

5. **Refer to requirements → `Docs/SRS/srs.md`**
   The Software Requirements Specification contains the formal requirements. Cross-reference when implementing features.

6. **Refer to tech stack → `Docs/tech stack/tech stack.md`**
   Contains technology choices and constraints. Ensure all implementation decisions align.

### Document Hierarchy

**Phases Hierarchy:**
```
Docs/overallplan.md                                 ← START HERE for feature development (master plan, progress)
  ↓ links to
Docs/Phases/PhaseX-<Name>/phaseX-<name>.md          ← Phase overview, subphase table, shared contracts
  ↓ links to
Docs/Phases/PhaseX-<Name>/phaseX.Y-<name>.md        ← Subphase: assignee, dependencies, tasks, API contracts
  ↓ references
Docs/Database/DB_Schema.md                          ← Single source of truth for DB schema
Docs/SRS/srs.md                                     ← Formal requirements
Docs/tech stack/tech stack.md                       ← Technology constraints
```

**Fixes & Patches Hierarchy:**
```
Docs/Fixes/overallplan.md                           ← START HERE for bug fixes & patches (master fixes tracker)
  ↓ links to
Docs/Fixes/FixX-<Name>/fixX-<name>.md               ← Fix group overview, fix item table, shared contracts
  ↓ links to
Docs/Fixes/FixX-<Name>/fixX.Y-<name>.md             ← Fix item: assignee, dependencies, tasks, API contracts
  ↓ references
Docs/Database/DB_Schema.md                          ← Single source of truth for DB schema
Docs/overallplan.md                                 ← Master phase tracker
```

---

## Living Documentation Rules

Project documents are **living documents** that MUST always reflect the current state of the project. Follow these rules strictly:

### Tracking Progress
- **Tick task checkboxes:** When a task is completed, change its checkbox from `- [ ]` to `- [x]` in the **subphase doc** or **fix item doc**.
- **Complete a subphase or fix item:** When ALL tasks in a subphase or fix item doc are done:
  1. Set the doc's `Status` to `Complete`.
  2. Update its row in the phase overview table or fix group overview table (`What's Done` section and status count).
  3. Tick the subphase checkbox in `Docs/overallplan.md` or the fix item checkbox in `Docs/Fixes/overallplan.md`.
- **Complete a phase or fix group:** Tick the parent phase in `Docs/overallplan.md` or parent fix group in `Docs/Fixes/overallplan.md` only when ALL of its subphases/fix items are complete.
- **In progress:** Set status to `In Progress` (in both the subphase/fix item doc and overview table) as soon as work starts, so other members can see it.
- **Never leave stale checkboxes:** If a task is partially done, leave it unchecked. Only tick when fully complete and verified.

### Keeping Docs Up to Date
- **Update on decision changes:** If a design decision changes during implementation (e.g., an API contract is modified, a table is restructured, a task or subphase is reassigned, a new approach is chosen), you MUST immediately update the relevant subphase doc, phase doc, and/or overall plan to reflect the new decision.
- **Respect shared contracts:** Shared contracts in phase docs (e.g. the Flyway version map and seed order in `phase1-project-foundation.md`, the payment handler interface in `phase6-payment-integration.md`) keep subphases decoupled. Don't change them without updating the doc and telling the affected members.
- **Update DB_Schema.md:** If any table structure changes during implementation, update `Docs/Database/DB_Schema.md` immediately. It must always be the single source of truth.
- **Document key decisions:** Use the "Key Decisions & Notes" section in each subphase doc (or the phase doc for decisions that span subphases) to record important implementation decisions, trade-offs, or deviations from the original plan.
- **Document all AWS operations:** Every AWS CLI command executed (EC2 provisioning, security group changes, Elastic IP allocation, etc.) and its output (instance IDs, IP addresses, resource IDs) MUST be recorded in `Docs/Deployment/aws-infrastructure.md`. This file is the single source of truth for all provisioned cloud resources. No AWS infrastructure change should go undocumented.
- **These docs define what is true:** The documentation should always accurately describe what has been built AND what remains to be done. An agent reading the docs should immediately understand the current state of the project and what to work on next.

