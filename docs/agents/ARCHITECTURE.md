# Architecture — VolunTrack

<!-- graffino-agentic:begin v1 -->
> This document distinguishes the current repository from the approved direction.
> Once application code exists, update this page to match the code.
<!-- graffino-agentic:end -->

The repository contains project and design documentation. Application code, migrations, API contracts and runtime configuration have yet to be implemented.

The approved direction is a separate React frontend (TypeScript, Vite, Tailwind) and a NestJS modular monolith (TypeScript) with REST/OpenAPI, SSE and PostgreSQL through Prisma. Docker Compose serves local development. Jest and PostgreSQL integration tests run in GitHub Actions. D-003 through D-009 describe the approved constraints. [Scope and acceptance criteria](PROJECT-BRIEF.md)

| Module | Conceptual entities and responsibilities |
|---|---|
| Identity and organization | Account, session, volunteer profile, permission, coordinator assignment and organization policy |
| Eligibility | Weekly availability, date exception, skill, training and training validation |
| Planning | Event, location, shift, volunteer role and position with capacity |
| Registration and waiting list | Registration, waiting-list entry, offer and persistent job |
| Attendance and reporting | Attendance interval, on-site confirmation, planned break, actual break and audit entry |
| Documents and communication | Certificate, template, announcement, conversation, message, notification and email delivery |

REST governs authenticated actions. The backend enforces access by event and permission. Access roles and volunteer roles are separate concepts. Registration, capacity and offer changes use PostgreSQL transactions. Job state and deadlines persist in PostgreSQL. The dashboard receives SSE updates after commit and retrieves the current state through REST after reconnecting. Historical aggregates, pilot activity and synthetic data remain distinct.

D-009 requires Docker locally and PostgreSQL in Docker for integration tests. It permits managed PostgreSQL for public deployment while keeping the public backend containerized. Render and Neon are candidates pending hosted verification. A sleeping process cannot deliver the next offer until it resumes. Expired offers are rejected using the stored deadline. Email delivery requires a verified sender before the pilot.

## Proposed screen inventory

These IDs are planning references. The design registry gains entries when the corresponding mocks are created under the Graffino procedure.

| ID | Screen |
|---|---|
| DS-001 | Access and account recovery |
| DS-002 | Profile, approval status, availability and training |
| DS-003 | Available events |
| DS-004 | Event detail and registration |
| DS-005 | My schedule, offers, QR and breaks |
| DS-006 | My hours and certificates |
| DS-007 | Messages, notifications and announcements by permission |
| DS-008 | Managed events, drafts, editing and capacity |
| DS-009 | Registrations, waiting list and assignments |
| DS-010 | Live attendance, on-site confirmation, corrections and certificate issuance |
| DS-011 | Users, approvals, training, permissions and assignments |
| DS-012 | Organization policies and statistics |
