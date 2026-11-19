# Decisions — VolunTrack

<!-- graffino-agentic:begin v1 -->
> Constraints the code must obey. Status: `approved` (obey) · `proposed` (do not
> build on it) · `superseded-by <ID>` (kept to explain old code).
> Adding or changing an entry needs the user's OK (AGENTS.md → The gate).
<!-- graffino-agentic:end -->

## Index
- D-002 · Confirm exact requirements with the partner
- D-003 · Monolit modular și stack-ul VolunTrack
- D-004 · Înscrieri și rezervări tranzacționale
- D-005 · Joburi persistente și dashboard SSE
- D-006 · Separarea istoricului de demonstrație
- D-007 · QR temporar și confirmare opțională la locație
- D-008 · Direcție vizuală pentru VolunTrack
- D-009 · Docker local și PostgreSQL administrat permis la deploy
- D-010 · Temă luminoasă implicită în DS-003 și DS-004

---

## D-002 · Confirm exact requirements with the partner
- **Status:** approved
- **Date:** 2026-11-06
- **Rule:** Confirm exact business rules and requirements with the partner organization before implementing dependent behavior.
- **Why:** The application serves a real volunteer organization; its exact business rules are not yet confirmed.
- **Rejected:** No alternatives were supplied or evaluated.
- **Evidence:** [Project brief](PROJECT-BRIEF.md), partner requirements and scope.
- **Source:** user · confidence high

## D-003 · Monolit modular și stack-ul VolunTrack
- **Status:** approved
- **Date:** 2026-11-18
- **Confirmed:** 2026-11-18
- **Rule:** Folosește React, TypeScript, Vite și Tailwind în frontend și NestJS în backend, cu REST documentat în Swagger/OpenAPI, PostgreSQL și Prisma. Folosește Jest, teste de integrare și GitHub Actions.
- **Why:** Un monolit modular păstrează tranzacțiile comune și simplifică operarea pilotului.
- **Rejected:** Microserviciile adaugă cost operațional.
- **Evidence:** [Scope VolunTrack](PROJECT-BRIEF.md), planul final aprobat în conversație.
- **Source:** user · confidence high

## D-004 · Înscrieri și rezervări tranzacționale
- **Status:** approved
- **Date:** 2026-11-18
- **Confirmed:** 2026-11-18
- **Rule:** Verifică eligibilitatea și capacitatea în tranzacții PostgreSQL care serializează operațiile asupra poziției și programului voluntarului. Oferta activă rezervă un loc exclusiv. Lista de așteptare eligibilă are prioritate față de înscrierile noi.
- **Why:** Prevenim suprarezervarea și înscrierile concurente incompatibile.
- **Rejected:** Blocarea doar a poziției nu protejează programul voluntarului.
- **Evidence:** [Scope VolunTrack](PROJECT-BRIEF.md), planul final aprobat în conversație.
- **Source:** user · confidence high

## D-005 · Joburi persistente și dashboard SSE
- **Status:** approved
- **Date:** 2026-11-18
- **Confirmed:** 2026-11-18
- **Rule:** Păstrează joburile, termenele și progresul în PostgreSQL. Recuperează lucrul după restart, cu procesare idempotentă. Publică actualizările SSE după commit și recitește starea prin REST la reconectare.
- **Why:** Termenele și dashboard-ul trebuie să rămână corecte după întreruperi.
- **Rejected:** Timerele în memorie pierd progresul. O coadă externă adaugă infrastructură.
- **Evidence:** [Scope VolunTrack](PROJECT-BRIEF.md), planul final aprobat în conversație.
- **Source:** user · confidence high

## D-006 · Separarea istoricului de demonstrație
- **Status:** approved
- **Date:** 2026-11-18
- **Confirmed:** 2026-11-18
- **Rule:** Păstrează datele istorice ca agregate documentare. Demonstrația are propriile înscrieri, drepturi de acces, statistici și serie de adeverințe. Testele automate folosesc date sintetice separate.
- **Why:** Datele disponibile nu identifică voluntari și nu conțin pontaje.
- **Rejected:** Înscrierile istorice nominale ar inventa date.
- **Evidence:** [Scope VolunTrack](PROJECT-BRIEF.md), planul final aprobat în conversație.
- **Source:** user · confidence high

## D-007 · QR temporar și confirmare opțională la locație
- **Status:** approved
- **Date:** 2026-11-18
- **Confirmed:** 2026-11-18
- **Rule:** Voluntarul scanează QR-ul comun semnat, rotit la 60 de secunde. Backend-ul validează și înregistrează imediat scanarea. Dacă verificarea la locație este activată pentru eveniment, primul check-in la tură necesită confirmarea coordonatorului atribuit înainte de a contribui la orele validate. Păstrează momentul scanării la confirmare.
- **Why:** Un cod comun poate fi transmis de la distanță în intervalul de valabilitate. Confirmarea la locație reduce acest risc fără geolocație.
- **Rejected:** Scanarea fiecărui cod de către coordonator ar adăuga lucru manual la fiecare sosire și plecare.
- **Evidence:** [Scope VolunTrack](PROJECT-BRIEF.md), planul final aprobat în conversație.
- **Source:** user · confidence high

## D-008 · Direcție vizuală pentru VolunTrack
- **Status:** approved
- **Date:** 2026-11-18
- **Confirmed:** 2026-11-18
- **Rule:** Folosește crem, verde închis, accent teracotă și text cărbune ca direcție pentru design. Verifică accesibilitatea și stările în ambele teme. Prioritizează DS-004, DS-005 și DS-010. Tokens și mock-uri trec separat prin aprobarea Graffino.
- **Why:** Direcția răspunde stilului cerut pentru asociație și fixează ordinea de design.
- **Rejected:** Paleta albastră are un ton mai instituțional.
- **Evidence:** [Scope VolunTrack](PROJECT-BRIEF.md), planul final aprobat în conversație.
- **Source:** user · confidence high

## D-009 · Docker local și PostgreSQL administrat permis la deploy
- **Status:** approved
- **Date:** 2026-11-18
- **Confirmed:** 2026-11-18
- **Rule:** Rulează backend-ul și PostgreSQL în Docker Compose pentru dezvoltare și rulează testele de integrare cu PostgreSQL în Docker. Păstrează backend-ul public containerizat. PostgreSQL administrat este permis pentru deploy-ul public.
- **Why:** Excepția permite stocarea persistentă independentă de procesul web gratuit.
- **Rejected:** PostgreSQL în container și în cloud ar necesita stocare persistentă și administrare suplimentară.
- **Evidence:** [Scope VolunTrack](PROJECT-BRIEF.md), planul final aprobat în conversație.
- **Source:** user · confidence high

## D-010 · Temă luminoasă implicită în DS-003 și DS-004
- **Status:** approved
- **Date:** 2026-11-19
- **Confirmed:** 2026-11-19
- **Rule:** În reviziile DS-003 și DS-004, pornește în tema luminoasă când utilizatorul nu a ales explicit o temă. Păstrează comutatorul de temă și transmiterea temei din catalog către detaliul evenimentului.
- **Why:** Voluntarii intră în experiența luminoasă inclusiv când sistemul lor preferă tema întunecată.
- **Rejected:** Inițializarea pe baza preferinței de sistem poate deschide macheta în tema întunecată fără o alegere în VolunTrack.
- **Evidence:** Aprobarea deciziei D-010 în conversația de revizuire a DS-003 și DS-004 la 2026-11-19.
- **Source:** user · confidence high
