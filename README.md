# VolunTrack – Platformă web pentru gestionarea voluntarilor și a evenimentelor caritabile

VolunTrack este un proiect universitar pentru coordonarea voluntarilor Asociației „Mâini Mici, Suflete Mari”. Aplicația web va acoperi planificarea turelor, înscrierea voluntarilor, evidența prezenței și validarea orelor pentru o singură organizație. Asociația organizează evenimente caritabile și activități pentru copii și familii în Dumbrăveni, Mediaș și Sibiu. La data documentării, organizatorii comunicau direct programul și responsabilitățile. [Informații furnizate de asociație](INTERVIEW.md)

**Stadiu.** Fundația backendului include NestJS, PostgreSQL și Prisma în Docker Compose, migrarea inițială, seed-ul istoric și verificările de integrare. Repository-ul conține și trei machete aprobate local, DS-003, DS-004 și DS-005. Backendul include API-ul de identitate și acces. Validarea emailurilor reale în staging și deploy-ul public sunt etape ulterioare. [Registrul de design](docs/design/registry.yaml) · [Scope-ul și clarificările aprobate](docs/agents/PROJECT-BRIEF.md)

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

## Pornirea backendului

Din rădăcina repository-ului, pornește Docker Engine și setează în mediu trei valori distincte pentru `POSTGRES_PASSWORD`, `MIGRATOR_PASSWORD` și `APP_PASSWORD`. Poți genera fiecare valoare cu `openssl rand -hex 32`. Folosește numai caractere nerezervate în URL. Bootstrapul configurează rolurile pe un volum gol. Pentru un volum existent, folosește aceleași credențiale. [Variabilele necesare](.env.example)

```bash
docker compose config --quiet
docker compose up -d --build --wait
curl -i http://127.0.0.1:3000/health/ready
```

Backendul este disponibil local pe portul 3000, cu opțiunea `VOLUNTRACK_PORT` pentru un alt port pe host. PostgreSQL rulează în rețeaua Compose. `docker compose down` oprește proiectul și păstrează volumul bazei de date. [Contractul de readiness](docs/agents/CONTRACTS.md#c-001--readiness-ul-backendului)

După migrare, încarcă explicit agregatele istorice aprobate cu `docker compose run --rm migrate npm run db:seed`. Poți rula comanda de mai multe ori. Pentru verificarea istoricului de migrări în baza shadow locală, folosește `docker compose run --rm migrate npm exec -- prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`. [Agregatele aprobate](EVENT.md#9-utilizarea-datelor-în-voluntrack)

## Operarea modulului de identitate

- Configurează `IDENTITY_PUBLIC_URL` cu originea HTTPS a aplicației și
  `IDENTITY_SECRET` cu o valoare unică de 32 de octeți în format hex.
  Folosește secrete distincte pe medii. Păstrează secretul stabil cât timp
  linkurile emise sunt valabile. Backendul publică schema JSON la
  `/openapi.json`. Clientul și API-ul folosesc aceeași origine pentru cookie
  și CSRF. Dacă un proxy de încredere termină TLS, setează
  `IDENTITY_TRUSTED_PROXIES` cu IP-urile sau CIDR-urile sale explicite.
- Pentru primul administrator, validează adresa persoanei desemnate în afara
  aplicației. Rulează o singură dată `node dist/identity/bootstrap-admin.js`
  în mediul backend cu `IDENTITY_ADMIN_EMAIL` furnizat la runtime și parola
  transmisă pe stdin din mecanismul de secrete. Comanda refuză repetarea când
  există deja un administrator. Contul dezvoltatorului se inițializează
  separat în baza de dezvoltare.
- Suita de integrare folosește transportul simulat. Proba manuală locală
  urmează instrucțiunile de mai jos. Pentru staging, confirmă Q-011 și
  configurează `IDENTITY_MAIL_TRANSPORT=resend`, `IDENTITY_MAIL_FROM` și
  `RESEND_API_KEY` cu expeditorul de pe domeniul verificat la furnizor.
  Producția folosește propriul set de variabile și credențiale. Păstrează
  urmărirea clickurilor dezactivată pentru emailurile de acces.
- Un link deschis prin GET păstrează acțiunea disponibilă. Clientul trimite
  fragmentul `token` în corpul POST, împreună cu dovada CSRF și, la resetare
  sau activare, parola nouă. O probă manuală de staging poate folosi un client
  API cu cookie jar. Consemnează numai rezultatele, fără tokenuri sau linkuri
  complete. Pentru joburi în starea `REVIEW`, verifică starea la furnizor
  înaintea unei noi trimiteri.

[Contractul de identitate](docs/agents/CONTRACTS.md#c-002--api-de-identitate-și-acces) · [Acceptarea în staging](docs/agents/plans/identitate-si-acces.md#acceptarea-livrării-în-staging) · [Q-011](docs/agents/OPEN-QUESTIONS.md#q-011--ce-expeditor-va-livra-emailurile-reale-ale-pilotului)

### Testare locală cu Resend

Pornește din rădăcina worktree-ului. Creează fișierul privat
`.env.resend.local` dacă lipsește. Git îl ignoră.

```bash
if [ ! -e .env.resend.local ]; then
  (umask 077 && touch .env.resend.local)
fi
```

Deschide fișierul într-un editor local. Adaugă următoarele câmpuri și completează
valorile după semnul `=`. Generează separat fiecare dintre cele patru valori hex
cu `openssl rand -hex 32`. Păstrează aceleași valori pentru volumul local
existent și pentru linkurile active.

```dotenv
POSTGRES_PASSWORD=
MIGRATOR_PASSWORD=
APP_PASSWORD=
IDENTITY_SECRET=
RESEND_API_KEY=
```

Introdu la `RESEND_API_KEY` o cheie cu permisiunea **Sending access**.
Fișierul Compose suplimentar setează `IDENTITY_MAIL_TRANSPORT=resend`,
`IDENTITY_MAIL_FROM=onboarding@resend.dev` și
`IDENTITY_PUBLIC_URL=https://localhost:3443`. Destinatarul este adresa
asociată contului tău Resend. Introdu-o când înregistrezi contul local
de probă. [Restricția expeditorului de test](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)

```bash
resend_compose() (
  unset POSTGRES_PASSWORD MIGRATOR_PASSWORD APP_PASSWORD IDENTITY_SECRET RESEND_API_KEY
  docker compose --project-name voluntrack-resend-local --env-file .env.resend.local \
    -f compose.yaml -f compose.resend.local.yaml "$@"
)
resend_compose config --quiet
resend_compose up -d --build --wait
resend_ca_dir="$(mktemp -d)"
resend_compose cp caddy:/data/caddy/pki/authorities/local/root.crt "$resend_ca_dir/root.crt"
curl --fail --silent --show-error --retry 5 --retry-connrefused \
  --cacert "$resend_ca_dir/root.crt" https://localhost:3443/health/ready
```

Folosește certificatul `root.crt` și un client API cu cookie jar pentru
`https://localhost:3443`. Păstrează numai rezultatele, fără istoricul
cererilor, capturi sau valori sensibile. Folosește `config --quiet` la
validarea Compose pentru a evita afișarea configurației cu secrete.

1. Cere `GET /identity/csrf` și păstrează cookie-ul emis. La fiecare POST
   trimite acel cookie, `Origin: https://localhost:3443` și valoarea
   `token` din răspuns în headerul `X-CSRF-Token`.
2. Trimite `POST /identity/register` cu `email` și `password` în corpul
   JSON. Așteaptă HTTP 202 și mesajul de verificare. În
   `POST /identity/email/verify` trimite în JSON câmpul `token` cu
   valoarea de după `#token=` din link. Așteaptă HTTP 204.
3. Trimite `POST /identity/password/request` cu `email` în corpul JSON.
   Așteaptă HTTP 202 și mesajul de resetare. În
   `POST /identity/password/reset` trimite în JSON câmpurile `token`
   și `password` cu tokenul nou și parola nouă. Așteaptă HTTP 204.
   Dacă un mesaj lipsește, verifică starea trimiterii în dashboardul Resend.

Oprește proiectul cu `resend_compose down`. Volumul bazei locale și
certificatul se păstrează între rulări. Proba locală urmează D-029.
Acceptarea livrării în staging rămâne condiționată de Q-011, iar deploymentul
public de Q-004. [D-029](docs/agents/decisions/identitate-si-acces.md#d-029--probă-manuală-locală-cu-expeditorul-de-test-resend)

#### Rezultatul probei locale din 25 noiembrie 2026

Backendul a răspuns cu HTTP 200 prin HTTPS. Resend a acceptat ambele mesaje la prima încercare, iar destinatarul a confirmat primirea lor.

- Verificarea adresei a returnat HTTP 202 la înregistrare, 200 la deschiderea linkului, 204 la confirmare și 400 la refolosire.
- Resetarea parolei pe același cont a returnat HTTP 202 la solicitare, 200 la deschiderea linkului, 204 la resetare și 400 la refolosire. Cu parola nouă, autentificarea și accesul la profil au returnat HTTP 200, iar deconectarea a returnat 204.

## Verificarea backendului

Rulează `bash backend/test/run-integration.sh` din rădăcina repository-ului. Suita creează un proiect Compose temporar, aplică migrarea pe un volum separat și folosește numai date sintetice. Aceeași comandă rulează în GitHub Actions. [Workflowul de integrare](.github/workflows/backend-ci.yml)

Cu Node.js 24 LTS activ, rulează din `backend/`:

```bash
npm ci
npm run build
node -e "require('./dist/generated/prisma/client.js')"
```

Buildul rulează `npm run prisma:generate` înainte de compilarea TypeScript în CommonJS. Generarea, compilarea și încărcarea clientului funcționează fără PostgreSQL sau credențiale.

## Date și validare

- **Istoric:** seed-ul folosește agregatele ediției „Trenulețul Moșului” din 20.12.2025, cu 24 de voluntari, opt roluri și patru intervale. Alocările nominale, capacitățile pe rol și tură și pontajele individuale sunt necunoscute. [Datele evenimentului](EVENT.md)
- **Pilot:** minimum 15 colegi vor testa un eveniment demonstrativ separat, inclusiv confirmarea opțională la locație în cel puțin o tură. Pilotul poate include adulți și minori eligibili, după verificările asociației. Adeverințele vor avea serie proprie și marcaj demonstrativ. Raportarea va fi anonimă, iar datele personale din aplicație se vor șterge la 30 de zile după evaluare, cu excepțiile motivate de obligații legale de păstrare. [Criteriile pilotului](docs/agents/PROJECT-BRIEF.md#istoric-pilot-și-acceptare)
- **Teste și predare:** datele sintetice rămân separate de istoric și pilot. Sunt planificate minimum 10 teste automate, dintre care minimum 6 de eligibilitate, precum și verificarea persistenței ofertelor și joburilor la restart pe hosting. Cerințele complete de predare sunt în brief. [D-006](docs/agents/DECISIONS.md#d-006--separarea-istoricului-de-demonstrație), [criterii de acceptare](docs/agents/PROJECT-BRIEF.md#istoric-pilot-și-acceptare)

## Documentație și lucru în repository

- Glosarul proiectului și jurnalul sesiunilor sunt în [CONTEXT.md](CONTEXT.md) și [AI_LOG.md](AI_LOG.md).
- Regulile Graffino și întrebările încă deschise, inclusiv despre capturi, hosting, email și evaluare, sunt în [AGENTS.md](AGENTS.md) și [registrul de întrebări](docs/agents/OPEN-QUESTIONS.md). Designul începe cu DS-004, DS-005 și DS-010, iar token-urile și mock-urile se aprobă înainte de implementarea ecranelor. [Ordinea livrării](docs/agents/PROJECT-BRIEF.md#ordinea-livrării)
- Politica de prelucrare, testul interesului legitim și cerințele de activare sunt în [documentația GDPR](docs/privacy/GDPR.md).
- Analiza avizelor și remedierile backendului sunt în [documentația de securitate a dependențelor](docs/security/DEPENDENCIES.md).
- Registrul se verifică cu `python3 docs/agents/tools/ledger-lint.py`. Comenzile frontend și lint-ul de aplicație rămân deschise. [Q-003](docs/agents/OPEN-QUESTIONS.md#q-003--which-installation-run-build-test-and-quality-commands-will-the-selected-stack-provide)
