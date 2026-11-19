# VolunTrack – Platformă web pentru gestionarea voluntarilor și a evenimentelor caritabile

VolunTrack este un proiect universitar pentru coordonarea voluntarilor Asociației „Mâini Mici, Suflete Mari”. Aplicația web va acoperi planificarea turelor, înscrierea voluntarilor, evidența prezenței și validarea orelor pentru o singură organizație. Asociația organizează evenimente caritabile și activități pentru copii și familii în Dumbrăveni, Mediaș și Sibiu. La data documentării, organizatorii comunicau direct programul și responsabilitățile. [Informații furnizate de asociație](INTERVIEW.md)

**Stadiu.** Repository-ul conține scheletul backendului NestJS și generatorul Prisma, documentația proiectului, regulile Graffino și trei machete aprobate local, DS-003, DS-004 și DS-005. Modelele bazei de date, migrările, seed-ul, configurația Docker și CI, testele aplicației și deploy-ul public sunt planificate. [Registrul de design](docs/design/registry.yaml) · [Scope-ul și clarificările aprobate](docs/agents/PROJECT-BRIEF.md)

## Funcționalități planificate

| Domeniu | Funcționalități aprobate |
| --- | --- |
| Conturi și acces | Autentificare prin email și parolă, verificarea adresei, recuperarea accesului, profil, aprobare, disponibilitate și instruiri. Accesul coordonatorilor depinde de evenimentele atribuite și de permisiunile delegate. |
| Evenimente și ture | Ciorne și publicare, locații, ture, roluri și capacități. Modificările esențiale ale unei ture cu înscrieri, oferte sau intrări în așteptare cer anulare motivată, notificare și recreare. |
| Înscrieri și repartizare | Solicitare la nivel de eveniment, repartizare propusă de coordonator și confirmare automată după acceptare și reverificare. Dacă poziția este ocupată, acceptarea propunerii înscrie voluntarul eligibil în coada FIFO a rolului și turei autorizate. |
| Prezență și ore | Check-in și check-out prin QR temporar, confirmare opțională la locație, pauze, calculul orelor și corecții auditate. Pontajele conforme se validează automat, iar tabloul de prezență se actualizează în timp real. |
| Identitate și documente | Verificare privată a identității, cu ștergerea fotografiei după verificare. Asociația gestionează manual contractele și actele, iar aplicația păstrează evidența verificării. |
| Comunicare | Interfață și șabloane de sistem în română și engleză, anunțuri în aplicație și prin email, conversații private text pe eveniment. |
| Adeverințe și statistici | Certificat de voluntariat și raport de activitate în PDF, după validarea orelor, cu numerotare și semnare externă. Statistici pentru voluntari activi și neprezentări, cu prag configurabil pentru neprezentări repetate. |

## Reguli principale

- Vârsta minimă generală este 15 ani, cu praguri și condiții specifice pe rol. Instruirea generală este obligatorie. Activitățile de coordonare, amenajare/logistică și ateliere creative cer și instruire specializată. Asociația desfășoară instruirile, iar aplicația consemnează finalizarea, fără expirare automată. [Eligibilitate și planificare](docs/agents/PROJECT-BRIEF.md#conturi-eligibilitate-și-planificare)
- Limitele zilnice efective sunt de 4 ore pentru minori și 8 ore pentru adulți, cumulate pe organizație în fusul `Europe/Bucharest`. Pentru adulți, 6–8 ore sunt recomandate și sunt permise ture de 1–3 ore. Turele nu se suprapun, au minimum 30 de minute între ele, iar cele de minimum 4 ore cer o pauză de cel puțin 30 de minute. [Reguli de program](docs/agents/PROJECT-BRIEF.md#conturi-eligibilitate-și-planificare)
- Sistemul oferă automat locul eliberat primului voluntar eligibil din coada FIFO a combinației rol–tură. Acceptarea ofertei confirmă repartizarea deja autorizată, după reverificare tranzacțională. Oferta rezervă locul în exclusivitate, implicit 12 ore și cel târziu până la începutul turei. Voluntarul se poate retrage singur cu cel puțin o oră înainte de tură. Schimbarea turei sau rolului cere accept și reverificare. [Înscrieri și repartizare](docs/agents/PROJECT-BRIEF.md#înscrieri-prezență-și-ore) · [Q-014](docs/agents/OPEN-QUESTIONS.md#q-014--cum-se-leagă-lista-de-așteptare-fifo-de-repartizarea-decisă-de-coordonator)
- QR-ul comun, semnat, se rotește la 60 de secunde. Confirmarea opțională la locație păstrează ora scanării. Validarea prezenței și validarea pontajului sunt distincte. Calculul reflectă timpul efectiv din tură, inclusiv întârzierile și plecările anticipate, și scade doar pauzele efectuate. [Prezență și ore](docs/agents/PROJECT-BRIEF.md#înscrieri-prezență-și-ore)
- Participarea efectivă și check-in-ul cer documente confirmate. Asociația gestionează actele justificative în afara aplicației. Încărcarea privată a fotografiei actului este aprobată pentru verificarea identității și vârstei. Activarea cu date reale depinde de validarea temeiului, a garanțiilor și a verificărilor de acceptare. [Identitate, contracte și documente](docs/agents/PROJECT-BRIEF.md#identitate-contracte-și-documente) · [Verificări GDPR](docs/privacy/GDPR.md#verificări-obligatorii-înainte-de-activarea-cu-date-reale)

## Stack și arhitectură

| Componentă | Alegere aprobată |
| --- | --- |
| Frontend separat | React, TypeScript, Vite și Tailwind, cu interfețe responsive pentru voluntari, coordonatori și administratori |
| Backend | Monolit modular NestJS în TypeScript. REST documentat cu Swagger/OpenAPI și Server-Sent Events (SSE) pentru actualizări în timp real |
| Persistență | PostgreSQL și Prisma, cu tranzacții pentru capacitate și programul voluntarului, plus joburi persistente în PostgreSQL |
| Dezvoltare și verificare | Docker Compose pentru backend și PostgreSQL local, Jest, teste de integrare cu PostgreSQL în Docker și GitHub Actions |
| Deploy public | HTTPS și backend containerizat. PostgreSQL administrat este permis. Furnizorii și fluxul de release rămân deschiși la Q-004 |

Backend-ul va grupa modulele pentru identitate și organizație, eligibilitate, planificare, înscrieri și listă de așteptare, prezență și raportare, documente și comunicare. Joburile își păstrează termenele și progresul la restart și se reiau idempotent. Actualizările SSE se publică după commit, iar interfața recitește starea prin REST după reconectare. [Arhitectură propusă](docs/agents/ARCHITECTURE.md), [decizii aprobate](docs/agents/DECISIONS.md)

## Verificarea scheletului backend

Cu Node.js 24 LTS activ, rulează din `backend/`:

```bash
npm ci
npm run build
node -e "require('./dist/generated/prisma/client.js')"
```

Buildul rulează `npm run prisma:generate` înainte de compilarea TypeScript în CommonJS. Generarea, compilarea și încărcarea clientului funcționează fără PostgreSQL sau credențiale. Pentru a porni scheletul compilat, rulează `npm start`. NestJS ascultă pe portul 3000.

## Date și validare

- **Istoric:** seed-ul planificat folosește agregatele ediției „Trenulețul Moșului” din 20.12.2025, cu 24 de voluntari, opt roluri și patru intervale. Alocările nominale, capacitățile pe rol și tură și pontajele individuale sunt necunoscute. [Datele evenimentului](EVENT.md)
- **Pilot:** minimum 15 colegi vor testa un eveniment demonstrativ separat, inclusiv confirmarea opțională la locație în cel puțin o tură. Pilotul poate include adulți și minori eligibili, după verificările asociației. Adeverințele vor avea serie proprie și marcaj demonstrativ. Raportarea va fi anonimă, iar datele personale din aplicație se vor șterge la 30 de zile după evaluare, cu excepțiile motivate de obligații legale de păstrare. [Criteriile pilotului](docs/agents/PROJECT-BRIEF.md#istoric-pilot-și-acceptare)
- **Teste și predare:** datele sintetice rămân separate de istoric și pilot. Sunt planificate minimum 10 teste automate, dintre care minimum 6 de eligibilitate, precum și verificarea persistenței ofertelor și joburilor la restart pe hosting. Cerințele complete de predare sunt în brief. [D-006](docs/agents/DECISIONS.md#d-006--separarea-istoricului-de-demonstrație), [criterii de acceptare](docs/agents/PROJECT-BRIEF.md#istoric-pilot-și-acceptare)

## Documentație și lucru în repository

- Glosarul proiectului și jurnalul sesiunilor sunt în [CONTEXT.md](CONTEXT.md) și [AI_LOG.md](AI_LOG.md).
- Regulile Graffino și întrebările încă deschise, inclusiv despre capturi, hosting, email și evaluare, sunt în [AGENTS.md](AGENTS.md) și [registrul de întrebări](docs/agents/OPEN-QUESTIONS.md). Designul începe cu DS-004, DS-005 și DS-010, iar token-urile și mock-urile se aprobă înainte de implementarea ecranelor. [Ordinea livrării](docs/agents/PROJECT-BRIEF.md#ordinea-livrării)
- Politica de prelucrare, testul interesului legitim și cerințele de activare sunt în [documentația GDPR](docs/privacy/GDPR.md).
- Registrul se verifică cu `python3 docs/agents/tools/ledger-lint.py`. Comenzile de testare și lint ale aplicației se stabilesc în etapele următoare. [Q-003](docs/agents/OPEN-QUESTIONS.md#q-003--which-installation-run-build-test-and-quality-commands-will-the-selected-stack-provide)
