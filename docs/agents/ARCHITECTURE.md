# Architecture — VolunTrack

<!-- graffino-agentic:begin v1 -->
> This document distinguishes the current repository from the approved direction.
> Once application code exists, update this page to match the code.
<!-- graffino-agentic:end -->

The backend foundation in `backend/` uses NestJS 11 on Node.js 24 LTS. The build generates the Prisma 7 client before TypeScript 5.9 compiles the application and client to CommonJS. Docker Compose uses PostgreSQL 17 on a named volume and starts the compiled backend after the one-shot migrator exits successfully. The backend connects with the application role. The bootstrap account creates the roles, and the migrator owns the application and local shadow databases and runs the explicit seed. [Readiness contract](CONTRACTS.md#c-001--readiness-ul-backendului)

The initial migration creates only the three historical relations. Q-009 supplies their seed. The application role can read the historical tables. Jest runs against a separate Compose volume with synthetic data, through the same command locally and in GitHub Actions. [Local commands](../../README.md#pornirea-backendului)

The additive identity migration creates separate relations for accounts, profiles,
sessions, email challenges, delivery jobs, login counters and audit. The application
role can insert audit entries, and reading them requires a separate authorized
database role. The NestJS identity module shares the existing Prisma provider.
PostgreSQL transactions keep challenge consumption, initial password setup,
password resets, approvals and audit atomic. An advisory lock serializes staff
and delegation changes that affect the last active administrator or permission
checks. [API contract](CONTRACTS.md#c-004--api-de-identitate-și-acces)

Identity email jobs are created in the same transaction as their challenges. The
worker takes a short database lease and rebuilds the same signed link on retry,
using a runtime secret. D-029 permits a manual Resend check in a dedicated local
Compose project with a separate PostgreSQL volume and a loopback HTTPS proxy.
Automated tests use an in-process simulated transport. Staging and production
have their own configuration and credentials. Real staging verification remains
a release criterion under Q-011. [Delivery contract](CONTRACTS.md#c-003--livrarea-tranzacțională-prin-resend) · [Local setup](../../README.md#testare-locală-cu-resend)

The approved direction is a separate React frontend (TypeScript, Vite, Tailwind) and a NestJS modular monolith (TypeScript) with REST/OpenAPI, SSE and PostgreSQL through Prisma. Docker Compose serves local development. Jest and PostgreSQL integration tests run in GitHub Actions. D-003 and D-005 through D-009 describe the approved technical and design constraints. D-012 through D-017 record the organizational clarifications. [Scope and acceptance criteria](PROJECT-BRIEF.md)

| Module | Conceptual entities and responsibilities |
|---|---|
| Identity and organization | Account, session, volunteer profile, permission, coordinator assignment, organization policy and administrative records of identity and document verification |
| Eligibility | Weekly availability, date exception, skill, general and specialized training confirmations and role associations |
| Planning | Event, location, shift, volunteer role and position with capacity |
| Participation and waiting list | Participation request, proposed and confirmed assignment, waiting-list entry, offer and persistent job |
| Attendance and reporting | Attendance interval, on-site confirmation, planned break, actual break, timesheet validation and audit entry |
| Documents and communication | Certificate, template, announcement, conversation, message, notification and email delivery |

REST governs authenticated actions. The backend enforces access by event and permission. Access roles and volunteer roles are separate concepts. Assignment, capacity and offer changes use PostgreSQL transactions. Each FIFO queue belongs to an exact role and shift. An eligible volunteer who accepts a coordinator-authorized assignment enters that queue when capacity is unavailable. Accepting a FIFO offer confirms that authorized assignment after transactional revalidation. Job state and deadlines persist in PostgreSQL. The dashboard receives SSE updates after commit and retrieves the current state through REST after reconnecting. Historical aggregates, pilot activity and synthetic data remain distinct.

D-009 requires Docker locally and PostgreSQL in Docker for integration tests. It permits managed PostgreSQL for public deployment while keeping the public backend containerized. Render and Neon are candidates pending hosted verification. A sleeping process cannot deliver the next offer until it resumes. Expired offers are rejected using the stored deadline. Email delivery requires a verified sender before the pilot.

Contracts and required documents remain with the association. The identity photo is temporary and outside the profile. D-016 approves a private upload, access limited to the assigned coordinator, and immediate deletion after verification. Activation with real data requires documented evidence and tested controls. D-017 covers generation of the official certificate and activity report, with signing outside VolunTrack. [Data protection and activation checks](../privacy/GDPR.md)

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
