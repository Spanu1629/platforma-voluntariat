# VolunTrack – Platformă web pentru gestionarea voluntarilor și a evenimentelor caritabile

VolunTrack este un proiect universitar pentru coordonarea voluntarilor Asociației „Mâini Mici, Suflete Mari”. Aplicația web va acoperi planificarea turelor, înscrierea voluntarilor, evidența prezenței și validarea orelor pentru o singură organizație. Asociația organizează evenimente caritabile și activități pentru copii și familii în Dumbrăveni, Mediaș și Sibiu. La data documentării, organizatorii comunicau direct programul și responsabilitățile. [Informații furnizate de asociație](INTERVIEW.md)

**Stadiu:** repository-ul conține documentația proiectului și regulile Graffino. Aplicația, schema bazei de date, migrările, seed-ul, configurația Docker și CI, testele aplicației și deploy-ul public sunt planificate. Review-ul vizual, demonstrația și pilotul urmează în etapele de livrare. [Scope aprobat la 18.11.2026](docs/agents/PROJECT-BRIEF.md)

## Funcționalități planificate

| Domeniu | Funcționalități aprobate |
| --- | --- |
| Conturi și acces | Autentificare prin email și parolă, verificarea adresei, recuperarea accesului, profil, aprobare, disponibilitate și instruiri. Accesul coordonatorilor depinde de evenimentele atribuite și de permisiunile delegate. |
| Evenimente și ture | Ciorne și publicare, locații, ture, roluri și capacități. Modificările esențiale ale unei ture cu înscrieri, oferte sau intrări în așteptare cer anulare motivată, notificare și recreare. |
| Înscrieri și repartizare | Confirmare automată a unui loc pentru voluntarii eligibili, cu prioritate pentru lista de așteptare. Repartizarea propusă de coordonator necesită acceptarea voluntarului. |
| Prezență și ore | Check-in și check-out prin QR temporar, confirmare opțională la locație, pauze, calculul orelor și corecții auditate. Tabloul de prezență se actualizează în timp real. |
| Comunicare | Interfață și șabloane de sistem în română și engleză, anunțuri în aplicație și prin email, conversații private text pe eveniment. |
| Adeverințe și statistici | Adeverințe PDF numerotate după validarea orelor. Statistici pentru voluntari activi și neprezentări, cu prag configurabil pentru neprezentări repetate. |

## Reguli principale

- Înscrierea cere un cont aprobat, disponibilitate pentru întreaga tură și instruire valabilă pe întreaga tură, când aceasta este obligatorie. Rolurile principale suprapuse sunt excluse. Limitele zilnice implicite sunt de 6 ore pentru minori și 8 ore pentru adulți, cumulate pe organizație în fusul `Europe/Bucharest`. Intervalul minim implicit între ture consecutive este de 20 de minute. Aceste valori sunt configurabile și provin din regulile de produs aprobate. [Eligibilitate și planificare](docs/agents/PROJECT-BRIEF.md#conturi-eligibilitate-și-planificare), [reguli între ture](docs/agents/PROJECT-BRIEF.md#înscrieri-prezență-și-ore)
- Lista de așteptare urmează ordinea intrării și acordă oferta primului voluntar eligibil. Oferta rezervă locul în exclusivitate, implicit până la 12 ore și cel târziu până la începutul turei. Eligibilitatea se verifică din nou la acceptare. [D-004](docs/agents/DECISIONS.md#d-004--înscrieri-și-rezervări-tranzacționale)
- QR-ul comun, semnat, se rotește la 60 de secunde. Dacă evenimentul cere confirmare la locație, primul check-in din tură contribuie la orele validate după confirmarea coordonatorului atribuit, cu păstrarea orei scanării. Calculul folosește prezența din interiorul turei și scade pauzele efectuate. Pontajele incomplete și pauzele insuficiente se verifică înainte de emiterea adeverinței. [D-007](docs/agents/DECISIONS.md#d-007--qr-temporar-și-confirmare-opțională-la-locație), [reguli de pontaj](docs/agents/PROJECT-BRIEF.md#înscrieri-prezență-și-ore)
- Cerințele atribuite asociației se confirmă cu partenerul înaintea implementării care depinde de ele. Regulile aprobate ale produsului prevăd aplicarea de la 14 ani și roluri de organizare sau supraveghere de la 18 ani. Pilotul este exclusiv pentru adulți. Înregistrarea minorilor reali rămâne dezactivată până la verificarea condițiilor legale, iar regulile de produs pentru minori se testează cu date sintetice. [D-002](docs/agents/DECISIONS.md#d-002--confirm-exact-requirements-with-the-partner), [Q-010](docs/agents/OPEN-QUESTIONS.md#q-010--ce-condiții-trebuie-verificate-înainte-de-înregistrarea-minorilor-reali)

## Stack și arhitectură

| Componentă | Alegere aprobată |
| --- | --- |
| Frontend separat | React, TypeScript, Vite și Tailwind, cu interfețe responsive pentru voluntari, coordonatori și administratori |
| Backend | Monolit modular NestJS în TypeScript. REST documentat cu Swagger/OpenAPI și Server-Sent Events (SSE) pentru actualizări în timp real |
| Persistență | PostgreSQL și Prisma, cu tranzacții pentru capacitate și programul voluntarului, plus joburi persistente în PostgreSQL |
| Dezvoltare și verificare | Docker Compose pentru backend și PostgreSQL local, Jest, teste de integrare cu PostgreSQL în Docker și GitHub Actions |
| Deploy public | HTTPS și backend containerizat. PostgreSQL administrat este permis. Furnizorii și fluxul de release rămân deschiși la Q-004 |

Backend-ul va grupa modulele pentru identitate și organizație, eligibilitate, planificare, înscrieri și listă de așteptare, prezență și raportare, documente și comunicare. Joburile își păstrează termenele și progresul la restart și se reiau idempotent. Actualizările SSE se publică după commit, iar interfața recitește starea prin REST după reconectare. [Arhitectură propusă](docs/agents/ARCHITECTURE.md), [decizii aprobate](docs/agents/DECISIONS.md)

## Date și validare

- **Istoric:** seed-ul planificat folosește agregatele ediției „Trenulețul Moșului” din 20.12.2025, cu 24 de voluntari, opt roluri și patru intervale. Alocările nominale, capacitățile pe rol și tură și pontajele individuale sunt necunoscute. [Datele evenimentului](EVENT.md)
- **Pilot:** minimum 15 colegi adulți vor testa un eveniment demonstrativ separat, inclusiv confirmarea opțională la locație în cel puțin o tură. Adeverințele vor avea serie proprie și marcaj demonstrativ. Raportarea va fi anonimă, iar datele personale se vor șterge la 30 de zile după evaluare. [Criteriile pilotului](docs/agents/PROJECT-BRIEF.md#istoric-pilot-și-acceptare)
- **Teste și predare:** datele sintetice rămân separate de istoric și pilot. Sunt planificate minimum 10 teste automate, dintre care minimum 6 de eligibilitate, precum și verificarea persistenței ofertelor și joburilor la restart pe hosting. Cerințele complete de predare sunt în brief. [D-006](docs/agents/DECISIONS.md#d-006--separarea-istoricului-de-demonstrație), [criterii de acceptare](docs/agents/PROJECT-BRIEF.md#istoric-pilot-și-acceptare)

## Documentație și lucru în repository

- Glosarul proiectului și jurnalul sesiunilor sunt în [CONTEXT.md](CONTEXT.md) și [AI_LOG.md](AI_LOG.md).
- Regulile Graffino și întrebările încă deschise, inclusiv despre design, hosting, email și adeverințe oficiale, sunt în [AGENTS.md](AGENTS.md) și [registrul de întrebări](docs/agents/OPEN-QUESTIONS.md). Designul începe cu DS-004, DS-005 și DS-010, iar token-urile și mock-urile se aprobă înainte de implementarea ecranelor. [Ordinea livrării](docs/agents/PROJECT-BRIEF.md#ordinea-livrării)
- Registrul se verifică cu `python3 docs/agents/tools/ledger-lint.py`. Comenzile de instalare, pornire, build și testare a aplicației rămân de stabilit. [Q-003](docs/agents/OPEN-QUESTIONS.md#q-003--which-installation-run-build-test-and-quality-commands-will-the-selected-stack-provide)
