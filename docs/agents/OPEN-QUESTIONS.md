# Open questions — platforma-voluntariat

<!-- graffino-agentic:begin v1 -->
> Unknowns. Work that depends on an open question is out of scope until it is
> answered. Only the user answers; an agent never answers by guessing. An agent may
> write a `Proposed answer` the evidence supports; the question stays
> `investigating` until the user confirms it.
> Answered entries stay, with the answer and date, and usually become a D- or PATTERN-.
<!-- graffino-agentic:end -->

## Index
- Q-001 · Which technologies and architecture will the application use? · _answered_
- Q-002 · What are the partner-confirmed workflows and business rules?
- Q-003 · Which installation, run, build, test and quality commands will the selected stack provide?
- Q-004 · How will deployment, versioning and releases work?
- Q-005 · What visual tokens and supported viewport sizes should the application use?
- Q-006 · Which screens and shared components should be designed first?
- Q-007 · How will mocks and the running application be rendered and screenshotted?
- Q-008 · Which Figma file will host Codex design review?
- Q-009 · What partner dataset structure and handling rules are confirmed?
- Q-010 · Ce condiții trebuie verificate înainte de înregistrarea minorilor reali?
- Q-011 · Ce expeditor va livra emailurile reale ale pilotului?
- Q-012 · Ce dovezi suplimentare sunt necesare pentru evaluare?
- Q-013 · Cum poate fi folosit oficial modelul de adeverință?

---

## Q-001 · Which technologies and architecture will the application use?
- **Status:** answered
- **Blocks:** None.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Answer:** 2026-11-18 — Separate React frontend and modular NestJS backend, PostgreSQL and Prisma, REST/OpenAPI, SSE, persistent PostgreSQL jobs, Jest, GitHub Actions and Docker Compose.
- **Recorded as:** D-003, D-005 and D-009.

## Q-002 · What are the partner-confirmed workflows and business rules?
- **Status:** open
- **Blocks:** Implementation of rules attributed to the partner that lack confirmation.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** The project scope records rules confirmed by the owner separately from facts documented by the association. The operational details that require partner confirmation stay open under D-002.
- **Answer:** Pending.
- **Recorded as:** None.

## Q-003 · Which installation, run, build, test and quality commands will the selected stack provide?
- **Status:** open
- **Blocks:** Executable application checks and application definition of done.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** None. No package manifests, source files or test runner exist.
- **Answer:** Pending.
- **Recorded as:** None.

## Q-004 · How will deployment, versioning and releases work?
- **Status:** open
- **Blocks:** Deployment and release configuration.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** Public HTTPS with a containerized backend and managed PostgreSQL permitted under D-009. Render and Neon are candidates. Validate suspension, restart, SSE and persistence before the pilot. Release process and provider selection remain open.
- **Answer:** Pending.
- **Recorded as:** None.

## Q-005 · What visual tokens and supported viewport sizes should the application use?
- **Status:** open
- **Blocks:** Authoritative design tokens and responsive mocks.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** D-008 fixes the visual direction. Exact tokens, accessible color pairs and viewport sizes remain open.
- **Answer:** Pending.
- **Recorded as:** None.

## Q-006 · Which screens and shared components should be designed first?
- **Status:** open
- **Blocks:** Screen registry entries and initial mock scope.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** D-008 prioritizes DS-004, DS-005 and DS-010. Authenticated volunteer, coordinator and administrator screens are mapped in ARCHITECTURE.md. Shared component inventory awaits design.
- **Answer:** Pending.
- **Recorded as:** None.

## Q-007 · How will mocks and the running application be rendered and screenshotted?
- **Status:** open
- **Blocks:** Required visual comparison and implementation verification.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** Use the approved frontend stack in D-003. Renderer and screenshot tooling remain open.
- **Answer:** Pending.
- **Recorded as:** None.

## Q-008 · Which Figma file will host Codex design review?
- **Status:** open
- **Blocks:** Publication and review of future mocks.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** None. No file URL or creation destination has been supplied. Ask before creating a review file.
- **Answer:** Pending.
- **Recorded as:** None.

## Q-009 · What partner dataset structure and handling rules are confirmed?
- **Status:** open
- **Blocks:** Dataset import, storage schemas and data handling implementation.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** The seed scope is the historical aggregate documented in EVENT.md, separated from pilot and synthetic test data under D-006. Additional partner data formats and handling rules remain open.
- **Answer:** Pending.
- **Recorded as:** None.

## Q-010 · Ce condiții trebuie verificate înainte de înregistrarea minorilor reali?
- **Status:** open
- **Blocks:** Înregistrarea minorilor reali. Pilotul cu adulți și testele sintetice pot continua.
- **Who answers:** Responsabilul proiectului, împreună cu organizația și cu sprijin calificat privind condițiile legale, după caz.
- **Answer:** Pending. Aprobarea manuală prevăzută în scope este un flux al produsului, iar activarea lui pentru minori reali depinde de verificarea condițiilor legale.

## Q-011 · Ce expeditor va livra emailurile reale ale pilotului?
- **Status:** open
- **Blocks:** Pilotul cu conturi reale și testarea livrării de email în mediul public.
- **Proposed answer:** Testare locală cu o căsuță de test. Brevo este candidat, iar expeditorul și livrarea către căsuțe externe trebuie verificate înainte de pilot.
- **Answer:** Pending.

## Q-012 · Ce dovezi suplimentare sunt necesare pentru evaluare?
- **Status:** open
- **Blocks:** Stabilirea calendarului evaluării și a eventualelor dovezi suplimentare. Planificarea urmează cerințele universitare furnizate în prompt.
- **Answer:** Pending.

## Q-013 · Cum poate fi folosit oficial modelul de adeverință?
- **Status:** open
- **Blocks:** Utilizarea oficială a modelului proiectului. Modelul demonstrativ poate fi proiectat și verificat separat.
- **Answer:** Pending.
