# Plan — Identitate și acces VolunTrack

**Stare:** Cerințele de mai jos sunt confirmate. Pornirea implementării așteaptă aprobarea explicită a responsabilului proiectului.

## Dimensiune și punct de plecare

M, un singur builder. Schema, autorizarea și testele sunt comune fluxurilor.
Planul pornește de la `main` la `7e1bf4f`. Refolosește fundația NestJS,
`PrismaService`, rolurile PostgreSQL, runnerul Jest/Compose și Backend CI.
Păstrează migrarea, seed-ul istoric și contractul de readiness. [Arhitectura](../ARCHITECTURE.md) · [C-001](../CONTRACTS.md#c-001--readiness-ul-backendului)

## Abordare

Adaugă modulul de identitate în monolit și o migrare Prisma aditivă. Acordă
rolului aplicației doar privilegiile necesare pe noile tabele. Documentează
API-ul prin REST/OpenAPI și conectează adaptorul Resend la joburile persistente
PostgreSQL pentru verificarea emailului și recuperarea parolei. Dependențele
noi deservesc Argon2id și documentația Swagger în backendul existent.

| Zonă | Criteriu |
|---|---|
| Conturi și profil | Autoînregistrare liberă pentru voluntari în așteptare. Înainte de verificarea adresei este disponibil fluxul de verificare. După confirmare, voluntarul se poate autentifica și își poate completa propriul profil, inclusiv în așteptarea aprobării. Participarea cere cont aprobat. Profilul expune doar câmpurile permise operației, cu acces restrâns la data nașterii. |
| Conturi privilegiate | Primul administrator se inițializează explicit prin comandă cu secret la runtime. Administratorii activi creează coordonatorii și administratorii ulteriori pentru persoanele desemnate. Destinatarii își stabilesc parola prin activare cu link unic. Administrator activ înseamnă cont activat, cu email verificat și nedezactivat. Dezactivarea și retragerea rolului păstrează tranzacțional cel puțin unul activ. Contul de dezvoltare al dezvoltatorului este separat de operațiunile asociației. |
| Aprobare și delegare | Administratorul acordă și revocă delegarea. Un coordonator delegat aprobă doar voluntari din propria organizație. Emailul trebuie verificat înaintea aprobării. Aprobările și modificările de permisiuni se auditează. |
| Parole și limitare | Argon2id, 10–128 de caractere, minimum o majusculă A–Z și o cifră 0–9. Caracterele speciale sunt opționale. Temporizare progresivă după 5 eșecuri pe cont în 15 minute, cu limită de 50 de încercări pe IP în aceeași fereastră, contoare PostgreSQL cu expirare și răspunsuri generice. Verifică efectul asupra utilizatorilor cu IP comun înainte de pilot. |
| Sesiuni și linkuri | Sesiuni opace și revocabile în PostgreSQL. Cookie HttpOnly, Secure și SameSite=Lax, cu protecție CSRF. Sesiunea expiră după 24 de ore de inactivitate sau cel târziu la 7 zile de la emitere. Linkurile de verificare și resetare expiră la 24 de ore, respectiv 30 de minute. Consumă fiecare link o singură dată, printr-o acțiune explicită. Resetarea revocă toate sesiunile în aceeași tranzacție. |
| Livrare | Adaptor Resend API în prima livrare, selectabil și configurabil prin variabile de mediu. Șabloane RO/EN și transport simulat în testele automate. Joburile reiau livrarea după erori și restart, cu aceeași cheie de idempotency pentru același mesaj. Rezultatele ambigue se verifică înaintea unei noi trimiteri după expirarea ferestrei de deduplicare. Logurile omit credențialele, tokenurile și URL-urile complete ale linkurilor. |

## Fișiere planificate

| Cale | Scop |
|---|---|
| `backend/prisma/schema.prisma`, `backend/prisma/migrations/` | Modelele și migrarea aditivă pentru conturi, profil, sesiuni, linkuri, permisiuni, audit, limitare și livrare. |
| `backend/src/identity/`, `backend/src/app.module.ts`, `backend/src/main.ts`, manifestul și lockfile-ul backend | Modulul, comanda de inițializare, adaptorul Resend și integrarea OpenAPI. Rutele acoperă înregistrarea, autentificarea, logout, profilul, verificarea, recuperarea, administrarea conturilor, aprobarea și delegarea. |
| `backend/test/identity.integration.test.js`, `backend/test/foundation.integration.test.js` | Teste cu date sintetice. În testul de fundație se adaugă migrarea de identitate la lista exactă de migrări așteptate, cu acordul explicit al responsabilului proiectului. |
| `docs/agents/CONTRACTS.md`, `docs/agents/ARCHITECTURE.md`, `README.md`, `.env.example` | Contractele, arhitectura implementată și instrucțiunile de configurare. Exemplele de configurare documentează variabilele fără credențiale sau valori externe inventate. |

Consumatorii existenți ai C-001 sunt Compose, runnerul de integrare și CI.
Contractele noi nu au încă un client frontend în repository.

## Verificări și secvență

| Verificare | Unde |
|---|---|
| Migrare peste baza existentă, lista exactă a migrărilor, păstrarea datelor istorice, privilegii și readiness | Jest cu PostgreSQL izolat |
| Autoînregistrare, profil propriu, stările de verificare și aprobare, aprobări, delegare și audit, operații concurente asupra ultimilor administratori | Teste HTTP și PostgreSQL cu utilizatori sintetici |
| Politica de parolă, Argon2id, temporizare, limita IP, cookie, CSRF, expirarea sesiunilor și revocarea după resetare | Teste automate cu timp controlat |
| Expirarea și consumul concurent al linkurilor, reluare după restart, șabloane RO/EN, cheie stabilă și lipsa tokenurilor din loguri | Transport simulat, fără rețea sau credențiale Resend în CI |
| Primire și utilizare reală pentru verificarea emailului și recuperarea accesului | Probă manuală în staging, cu adrese de test controlate |

După aprobarea implementării, rulează testele noi înaintea codului și verifică
motivul eșecului. Adaugă migrarea, modulul și verificările de regresie. Rulează
`bash backend/test/run-integration.sh`, `ledger-lint` și `git diff --check`.

### Acceptarea livrării în staging

1. După confirmarea Q-011, configurează separat domeniul, expeditorul, URL-ul
   HTTPS și secretul staging. Verifică domeniul la Resend. Păstrează secretul în
   variabile de mediu sau în mecanismul securizat al mediului. Păstrează
   credențialele din production independente și transportul de test în development
   și CI.
2. Trimite și primește ambele tipuri de email pe adrese de test controlate.
   Accesează linkurile HTTPS și confirmă efectul în aplicație. Verifică
   expirarea și respingerea reutilizării pentru fiecare flux. Pentru resetare,
   verifică și revocarea sesiunilor existente.
3. Consemnează rezultatele fără linkuri complete, adrese de test sau secrete
   și confirmă acceptarea modulului după proba reală. Testele automate validează
   logica și preced acceptarea în staging.

[Configurație externă rămasă · Q-011](../OPEN-QUESTIONS.md#q-011--ce-expeditor-va-livra-emailurile-reale-ale-pilotului) · [API Resend](https://resend.com/docs/api-reference/emails/send-email) · [Deduplicare Resend](https://resend.com/docs/dashboard/emails/idempotency-keys)

## Riscuri și delimitări

Operațiile concurente pot afecta ultimul administrator activ sau consumul
unic al unui link. Verifică invarianta în tranzacții și în testele de
concurență. Un timeout după acceptarea mesajului poate ascunde reușita.
Reia cu aceeași cheie cât timp furnizorul deduplică și verifică starea în
afara acelei ferestre. Confirmă originea HTTPS de staging pentru verificările
de cookie, CSRF și linkuri.

Interfețele, accesul coordonatorilor bazat pe atribuirea la evenimente,
eligibilitatea, instruirile, verificarea documentară și activarea cu date
reale au livrări separate.

## Cunoștințe folosite

- D-002, D-003, D-005, D-006, D-009, C-001, Q-001, Q-003 și Q-009 rămân
  confirmate în limitele lor. Q-003 păstrează întrebările frontend deschise.
  Q-009 păstrează sursa aprobată pentru agregatele istorice.
- D-020–D-028 sunt confirmate tehnic și funcțional de responsabilul proiectului.
  Q-016–Q-018 au răspunsuri consemnate. Q-011 rămâne deschisă pentru domeniu,
  expeditor și URL-ul HTTPS de staging.
- D-012, D-013 și D-016 delimitează livrările de eligibilitate, instruiri și
  verificare documentară. Q-004 rămâne întrebarea de deploy. PATTERN-005 este
  candidat, iar verificările folosesc scriptul Compose existent.

[Decizii de identitate](../decisions/identitate-si-acces.md) · [Întrebări de identitate](../questions/identitate-si-acces.md) · [Registrul Graffino](../DECISIONS.md)
