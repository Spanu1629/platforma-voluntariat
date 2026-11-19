# Open questions — VolunTrack

<!-- graffino-agentic:begin v1 -->
> Unknowns. Work that depends on an open question is out of scope until it is
> answered. Only the user answers; an agent never answers by guessing. An agent may
> write a `Proposed answer` the evidence supports; the question stays
> `investigating` until the user confirms it.
> Answered entries stay, with the answer and date, and usually become a D- or PATTERN-.
<!-- graffino-agentic:end -->

## Index
- Q-001 · Which technologies and architecture will the application use? · _answered_
- Q-002 · Ce reguli organizatorice de bază au fost confirmate? · _answered_
- Q-003 · Which installation, run, build, test and quality commands will the selected stack provide? · _investigating_
- Q-004 · How will deployment, versioning and releases work?
- Q-005 · What visual tokens and supported viewport sizes should the application use? · _answered_
- Q-006 · Which screens and shared components should be designed first? · _answered_
- Q-007 · How will mocks and the running application be rendered and screenshotted?
- Q-008 · Which Figma file will host Codex design review? · _answered_
- Q-009 · Ce date istorice ale partenerului sunt aprobate pentru seed? · _answered_
- Q-010 · Cum se verifică documentele minorilor înainte de participare? · _answered_
- Q-011 · Ce expeditor va livra emailurile reale ale pilotului?
- Q-012 · Ce dovezi suplimentare sunt necesare pentru evaluare?
- Q-013 · Cum se generează și se eliberează documentele de voluntariat? · _answered_
- Q-014 · Cum se leagă lista de așteptare FIFO de repartizarea decisă de coordonator? · _answered_
- Q-015 · Cum se încarcă, verifică și șterge fotografia actului? · _answered_

---

## Q-001 · Which technologies and architecture will the application use?
- **Status:** answered
- **Blocks:** None.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Answer:** 2026-11-18 — Separate React frontend and modular NestJS backend, PostgreSQL and Prisma, REST/OpenAPI, SSE, persistent PostgreSQL jobs, Jest, GitHub Actions and Docker Compose.
- **Recorded as:** D-003, D-005 and D-009.
- **Confirmed:** 2026-11-19

## Q-002 · Ce reguli organizatorice de bază au fost confirmate?
- **Status:** answered
- **Blocks:** Niciun blocaj funcțional pentru regulile documentate.
- **Who answers:** Responsabilul proiectului.
- **Answer:** 2026-11-19 — Responsabilul proiectului a confirmat vârstele și rolurile, programul și pauzele, instruirile, fluxul de repartizare, retragerile, prezența și pontajul, evidența documentelor și emiterea adeverințelor. Confirmarea privește regulile funcționale. D-002 rămâne aplicabil cerințelor atribuite partenerului care mai necesită confirmare.
- **Recorded as:** [D-012–D-017](decisions/reguli-organizatorice.md) și [brief-ul actualizat](PROJECT-BRIEF.md).

## Q-003 · Which installation, run, build, test and quality commands will the selected stack provide?
- **Status:** investigating
- **Blocks:** Application test and lint commands and the full application definition of done.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** For the backend scaffold, use Node.js 24 and run `npm ci`, `npm run prisma:generate`, `npm run build` and `npm start` from `backend/`. The build generates the client before compiling TypeScript. Application test and lint commands are pending.
- **Answer:** Pending.
- **Recorded as:** [Backend scaffold commands](../../backend/package.json) and [verification instructions](../../README.md#verificarea-scheletului-backend).

## Q-004 · How will deployment, versioning and releases work?
- **Status:** open
- **Blocks:** Deployment and release configuration.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Proposed answer:** Public HTTPS with a containerized backend and managed PostgreSQL permitted under D-009. Render and Neon are candidates. Validate suspension, restart, SSE and persistence before the pilot. Release process and provider selection remain open.
- **Answer:** Pending.
- **Recorded as:** None.

## Q-005 · What visual tokens and supported viewport sizes should the application use?
- **Status:** answered
- **Blocks:** None.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Answer:** 2026-11-18 — The project owner approved the light and dark palettes, Fraunces and DM Sans, the spacing and interaction tokens, the responsive breakpoints and the 320 × 720 and 1440 × 900 reference viewports.
- **Recorded as:** [Design tokens and reference viewports](../design/DESIGN.md#tokens), under D-008.
- **Confirmed:** 2026-11-18

## Q-006 · Which screens and shared components should be designed first?
- **Status:** answered
- **Blocks:** None.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Answer:** 2026-11-18 — The project owner approved the shared component inventory and all twelve conceptual screens. The first mock sequence is DS-004, DS-005 and DS-010. Each screen enters the active registry as `draft` when its mock is created.
- **Recorded as:** [Component inventory](../design/DESIGN.md#component-inventory) and [conceptual screen inventory](../design/registry.yaml), under D-008.
- **Confirmed:** 2026-11-18

## Q-007 · How will mocks and the running application be rendered and screenshotted?
- **Status:** open
- **Blocks:** The screenshot procedure for the running application.
- **Who answers:** Project owner; partner organization or laboratory staff where applicable.
- **Answer:** 2026-11-18 — The project owner approved Playwright and Chromium for local DS-004 mock verification. The screenshot procedure for the running application remains open.
- **Recorded as:** [Local mock verification](../design/CODEX.md#repo-owned-codex-review-record).

## Q-008 · Which Figma file will host Codex design review?
- **Status:** answered
- **Blocks:** None. Publicarea, accesul reviewerilor și comparația reviziilor se verifică la etapa de design.
- **Who answers:** Responsabilul proiectului.
- **Answer:** 2026-11-19 — Responsabilul proiectului a indicat [fișierul Figma existent](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe) ca destinație de review pentru Codex.
- **Recorded as:** [Registrul local de review Codex](../design/CODEX.md#repo-owned-codex-review-record).
- **Confirmed:** 2026-11-19

## Q-009 · Ce date istorice ale partenerului sunt aprobate pentru seed?
- **Status:** answered
- **Blocks:** Niciun blocaj pentru agregatele confirmate. Datele personale și fluxul de verificare rămân tratate separat la Q-010 și Q-015.
- **Who answers:** Responsabilul proiectului.
- **Answer:** 2026-11-19 — Folosim exclusiv agregatele reale din EVENT.md pentru ediția din 20.12.2025, separate de pilot și datele sintetice. Setul confirmat cuprinde evenimentul, totalul de 24 de voluntari, distribuția pe opt roluri și cele patru intervale. Exclude înregistrările nominale, pontajele individuale, alocările și capacitățile pe combinație rol–tură, precum și orice date suplimentare indisponibile.
- **Recorded as:** [EVENT.md](../../EVENT.md#9-utilizarea-datelor-în-voluntrack) și D-006.
- **Confirmed:** 2026-11-19

## Q-010 · Cum se verifică documentele minorilor înainte de participare?
- **Status:** answered
- **Who answers:** Responsabilul proiectului.
- **Answer:** 2026-11-19 — Asociația întocmește și păstrează manual contractele, acordurile parentale unde sunt necesare și celelalte acte obligatorii. Coordonatorul le verifică înainte de participare și înregistrează în VolunTrack rezultatul, data și persoana responsabilă. Actele justificative nu se încarcă. Documentele neconfirmate sau condițiile legale neîndeplinite blochează participarea efectivă și check-in-ul. Responsabilul proiectului declară că organizația îndeplinește condițiile aplicabile. Declarația consemnează poziția sa.
- **Recorded as:** [D-012 și D-016](decisions/reguli-organizatorice.md) · [Criterii de acceptare înainte de folosirea datelor reale](../privacy/GDPR.md#verificări-obligatorii-înainte-de-activarea-cu-date-reale).

## Q-011 · Ce expeditor va livra emailurile reale ale pilotului?
- **Status:** open
- **Blocks:** Pilotul cu conturi reale și testarea livrării de email în mediul public.
- **Proposed answer:** Testare locală cu o căsuță de test. Brevo este candidat, iar expeditorul și livrarea către căsuțe externe trebuie verificate înainte de pilot.
- **Answer:** Pending.

## Q-012 · Ce dovezi suplimentare sunt necesare pentru evaluare?
- **Status:** open
- **Blocks:** Stabilirea calendarului evaluării și a eventualelor dovezi suplimentare. Planificarea urmează cerințele universitare furnizate în prompt.
- **Answer:** Pending.

## Q-013 · Cum se generează și se eliberează documentele de voluntariat?
- **Status:** answered
- **Who answers:** Responsabilul proiectului.
- **Answer:** 2026-11-19 — VolunTrack generează certificatul de voluntariat și raportul de activitate pe baza datelor și orelor validate, cu câmpurile legale aplicabile. Coordonatorul autorizat descarcă documentele, le semnează extern și le înmânează voluntarului. Aplicația nu oferă semnătură electronică și nu cere încărcarea documentelor semnate. Numerotarea, auditul, anularea, reemiterea și marcajul demonstrativ sunt păstrate.
- **Recorded as:** [D-017](decisions/reguli-organizatorice.md#d-017--generarea-adeverințelor-și-semnarea-externă) · [Cerințele PDF](PROJECT-BRIEF.md#comunicare-documente-și-statistici) · [Verificări înainte de folosirea modelului oficial](../privacy/GDPR.md#verificări-obligatorii-înainte-de-activarea-cu-date-reale).

## Q-014 · Cum se leagă lista de așteptare FIFO de repartizarea decisă de coordonator?
- **Status:** answered
- **Who answers:** Responsabilul proiectului.
- **Answer:** 2026-11-19 — Voluntarul solicită participarea și declară disponibilitatea. Coordonatorul propune rolul și tura. La acceptare, un voluntar eligibil este confirmat automat dacă are loc sau intră în coada FIFO a combinației exacte rol–tură dacă locul lipsește. La eliberarea unui loc, sistemul oferă poziția primului candidat eligibil din acea coadă. Acceptarea ofertei confirmă repartizarea deja autorizată, fără altă aprobare, după reverificarea tranzacțională a eligibilității și capacității. Refuzul sau expirarea eliberează rezervarea și permite procesarea următorului candidat. Termenul configurabil este implicit 12 ore și cel târziu până la începutul turei. Retragerea individuală este permisă cu minimum o oră înainte, iar schimbarea rolului sau turei cere accept.
- **Recorded as:** [D-014](decisions/reguli-organizatorice.md#d-014--repartizare-propusă-de-coordonator-și-rezervări-tranzacționale) · [Fluxul din brief](PROJECT-BRIEF.md#înscrieri-prezență-și-ore).

## Q-015 · Cum se încarcă, verifică și șterge fotografia actului?
- **Status:** answered
- **Who answers:** Responsabilul proiectului.
- **Answer:** 2026-11-19 — Încărcarea în VolunTrack este aprobată pentru verificarea identității și vârstei. Fotografia se transmite privat prin HTTPS și este accesibilă exclusiv coordonatorului autorizat pentru verificare. După aprobare sau respingere se șterge imediat, iar încărcările abandonate expiră automat. Rămân rezultatul, data și coordonatorul responsabil. Fotografia este exclusă din backupuri, loguri, exporturi, notificări și rapoarte. Accesul și operațiunile sunt auditate fără conținutul actului.
- **Recorded as:** [D-016](decisions/reguli-organizatorice.md#d-016--verificarea-identității-și-evidența-documentelor) · [Politica de prelucrare și evaluarea temeiului propus](../privacy/GDPR.md) · [Verificări obligatorii înainte de activarea cu date reale](../privacy/GDPR.md#verificări-obligatorii-înainte-de-activarea-cu-date-reale).
