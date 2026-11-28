# Decisions — VolunTrack

<!-- graffino-agentic:begin v1 -->
> Constraints the code must obey. Status: `approved` (obey) · `proposed` (do not
> build on it) · `superseded-by <ID>` (kept to explain old code).
> Adding or changing an entry needs the user's OK (AGENTS.md → The gate).
<!-- graffino-agentic:end -->

## Index
- D-002 · Confirm exact requirements with the partner
- D-003 · Monolit modular și stack-ul VolunTrack
- D-005 · Joburi persistente și dashboard SSE
- D-006 · Separarea istoricului de demonstrație
- D-007 · QR temporar și confirmare opțională la locație
- D-008 · Direcție vizuală pentru VolunTrack
- D-009 · Docker local și PostgreSQL administrat permis la deploy
- D-010 · Temă luminoasă implicită în DS-003 și DS-004
- D-011 · Temă luminoasă implicită în DS-005
- D-018 · Carusele pentru colecții de carduri pe mobil
- D-019 · Fundal pentru secțiunile care grupează carduri
- D-031 · Administrarea, publicarea și stocarea imaginilor

### [Eligibilitate si planificare](decisions/eligibilitate-si-planificare.md)
- D-032 · Ziua locală și politica de pauze planificate
- D-033 · Planificare, acces la evenimente și poziții
- D-034 · Acces, reînnoire și anulare pentru instruiri
- D-035 · Rezultatul verificării de identitate la confirmare

### [Identitate si acces](decisions/identitate-si-acces.md)
- D-020 · Crearea conturilor și continuitatea administrării
- D-021 · Aprobare de cont, delegare și audit
- D-022 · Parole și protecția autentificării
- D-023 · Sesiuni și linkuri de acces
- D-024 · Livrarea emailurilor de verificare și recuperare
- D-025 · Activarea conturilor privilegiate și ultimul administrator activ
- D-026 · Limitele încercărilor de autentificare
- D-027 · Accesul voluntarului în funcție de verificarea emailului
- D-028 · Resend prin API și acceptarea livrării în staging
- D-029 · Probă manuală locală cu expeditorul de test Resend
- D-030 · Stabilirea parolei inițiale la verificarea adresei

### [Inscrieri repartizare si lista de asteptare](decisions/inscrieri-repartizare-si-lista-de-asteptare.md)
- D-036 · Ciclul solicitării, propunerilor și publicării
- D-037 · Eligibilitate FIFO, oferte și schimbarea repartizării

### [Reguli organizatorice](decisions/reguli-organizatorice.md)
- D-012 · Eligibilitatea de vârstă și programul voluntarilor
- D-013 · Evidența instruirilor finalizate
- D-014 · Repartizare propusă de coordonator și rezervări tranzacționale
- D-015 · Validarea automată a pontajelor conforme
- D-016 · Verificarea identității și evidența documentelor
- D-017 · Generarea adeverințelor și semnarea externă

---

## D-002 · Confirm exact requirements with the partner
- **Status:** approved
- **Date:** 2026-11-06
- **Confirmed:** 2026-11-19
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

## D-011 · Temă luminoasă implicită în DS-005
- **Status:** approved
- **Date:** 2026-11-19
- **Confirmed:** 2026-11-19
- **Rule:** În DS-005, pornește în tema luminoasă în lipsa unei alegeri explicite și oferă comutare în tema întunecată.
- **Why:** Programul voluntarului pornește în aceeași temă ca ecranele aprobate de evenimente.
- **Evidence:** Aprobarea planului Graffino pentru DS-005 și a propunerii D-011 în conversația de proiect.
- **Source:** user · confidence high

## D-018 · Carusele pentru colecții de carduri pe mobil
- **Status:** approved
- **Date:** 2026-11-19
- **Confirmed:** 2026-11-19
- **Rule:** La 320–767 px, afișează secțiunile într-o coloană și limitează scrollul orizontal la colecții eligibile de cel puțin două carduri explorabile independent. Păstrează în fluxul paginii acțiunile urgente, informațiile de comparat și instrucțiunile ordonate. De la 768 px folosește layoutul aprobat al ecranului. Urmează interacțiunile și excepțiile din specificația de design.
- **Why:** Swipe-ul scurtează listele de carduri pe mobil, iar acțiunile prioritare rămân la vedere.
- **Evidence:** Aprobarea în conversație a planului „Carusele pentru cardurile VolunTrack pe mobil” și a excepțiilor DS-005. [Reguli responsive](../design/DESIGN.md#breakpoints--window-sizes)
- **Source:** user · confidence high

## D-019 · Fundal pentru secțiunile care grupează carduri
- **Status:** approved
- **Date:** 2026-11-19
- **Confirmed:** 2026-11-19
- **Rule:** Folosește `section-background` pentru benzile care grupează carduri și pentru tranzițiile lor decorative. În light, folosește `#F4EADB`. În dark, folosește `var(--background)`. Folosește `surface` pe carduri și `surface-subtle` pe elementele secundare.
- **Why:** Crește separarea vizuală între card și secțiune în tema luminoasă și păstrează paleta întunecată.
- **Evidence:** Aprobarea în conversație a planului completat și a valorilor tokenului. [Paleta partajată](../design/DESIGN.md#color)
- **Source:** user · confidence high

## D-031 · Administrarea, publicarea și stocarea imaginilor

- **Status:** approved
- **Date:** 2026-11-26
- **Confirmed:** 2026-11-26
- **Rule:** Administratorul gestionează imaginea principală a platformei din interfața web. Coordonatorul autorizat gestionează coperta și galeria evenimentului atribuit. O imagine nouă devine vizibilă publicului autorizat după procesare și publicare explicită. Imaginile din machete sunt orientative.
- **Storage:** Păstrează fișierele în stocare persistentă de obiecte și metadatele și asocierile în PostgreSQL. Folosește Cloudflare R2 Standard în producție, cu jurisdicția `eu` stabilită la crearea bucketului. Pentru dezvoltare și testare locală folosește o soluție compatibilă S3 în Docker. Păstrează interfața de stocare independentă de furnizor. Configurează contul, bucketurile, permisiunile și credențialele în etapa dedicată.
- **Processing:** Validează server-side tipul real al imaginii și limitele de octeți și pixeli. Optimizează cu Sharp și elimină metadatele EXIF. Aplică limite pe imagine, galerie, volum total și frecvența operațiilor relevante, cu monitorizare și alerte de consum. Valorile se stabilesc în planul etapei dedicate. Stocarea imaginilor editoriale este separată de fotografia temporară a actului, reglementată de D-016.
- **Why:** Echipa asociației poate actualiza conținutul din interfață. Stocarea persistă independent de procesul aplicației, iar limitele reduc consumul accidental.
- **Evidence:** [Cerința de produs și ordinea de livrare](PROJECT-BRIEF.md#imagini-ale-platformei-și-ale-evenimentelor) · [Jurisdicții Cloudflare R2](https://developers.cloudflare.com/r2/reference/data-location/) · [Facturare Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) · [Sharp](https://sharp.pixelplumbing.com/api-constructor/)
- **Source:** user · confidence high
