# Identitate și acces

Decizii tehnice și funcționale confirmate de responsabilul proiectului. Confirmarea D-002 rămâne aplicabilă cerințelor atribuite asociației.

## D-020 · Crearea conturilor și continuitatea administrării
- **Status:** approved
- **Date:** 2026-11-20
- **Confirmed:** 2026-11-20
- **Rule:** Permite autoînregistrarea liberă pentru voluntari, cu cont în așteptarea aprobării. Administratorul creează coordonatorii. Inițializează securizat primul administrator, fără credențiale implicite. După inițializare, menține cel puțin un administrator activ inclusiv când există mai mulți administratori. Administratorii operaționali sunt desemnați de asociație. Dezvoltatorul poate avea un cont administrativ separat în mediul de dezvoltare.
- **Why:** Conturile operaționale rămân sub controlul persoanelor desemnate, iar administrarea poate continua când se schimbă personalul.
- **Evidence:** Confirmarea explicită a responsabilului proiectului în planul de identitate și acces, punctul 1.
- **Source:** user · confidence high

## D-021 · Aprobare de cont, delegare și audit
- **Status:** approved
- **Date:** 2026-11-20
- **Confirmed:** 2026-11-20
- **Rule:** Administratorul acordă și revocă delegările. Administratorii și coordonatorii delegați aprobă conturi de voluntar după verificarea emailului. Coordonatorul delegat aprobă doar voluntari din propria organizație și nu aprobă coordonatori sau administratori. Auditează toate aprobările și modificările de permisiuni. Voluntarii în așteptare își pot completa profilul și nu pot participa la activități.
- **Why:** Verificarea adresei, aprobarea contului și delegarea sunt controale distincte. Auditul permite urmărirea acțiunilor privilegiate.
- **Evidence:** Confirmarea explicită a responsabilului proiectului, punctul 2, și [cerințele de acces din brief](../PROJECT-BRIEF.md#conturi-eligibilitate-și-planificare).
- **Source:** user · confidence high

## D-022 · Parole și protecția autentificării
- **Status:** approved
- **Date:** 2026-11-20
- **Confirmed:** 2026-11-20
- **Rule:** Acceptă parole între 10 și 128 de caractere, cu cel puțin o majusculă A–Z și o cifră 0–9. Caracterele speciale sunt opționale. Stochează hash-uri Argon2id. Protejează autentificarea împotriva încercărilor repetate.
- **Why:** Politica stabilește condițiile de acceptare a parolelor și protejează atât stocarea, cât și verificarea lor.
- **Evidence:** Confirmarea explicită a responsabilului proiectului, punctul 3.
- **Source:** user · confidence high

## D-023 · Sesiuni și linkuri de acces
- **Status:** approved
- **Date:** 2026-11-20
- **Confirmed:** 2026-11-20
- **Rule:** Păstrează sesiuni opace și revocabile în PostgreSQL. Folosește cookie HttpOnly, Secure și SameSite=Lax, cu protecție CSRF. Expiră sesiunea după 24 de ore de inactivitate și după cel mult 7 zile de la emitere. Linkul de verificare a emailului este valabil 24 de ore, iar cel de resetare a parolei 30 de minute. Consumă fiecare link o singură dată. Revocă toate sesiunile contului după resetarea parolei.
- **Why:** Duratele și revocarea limitează utilizarea unei sesiuni sau a unui link compromis.
- **Evidence:** Confirmarea explicită a responsabilului proiectului, punctul 4.
- **Source:** user · confidence high

## D-024 · Livrarea emailurilor de verificare și recuperare
- **Status:** approved
- **Date:** 2026-11-20
- **Confirmed:** 2026-11-20
- **Rule:** Integrează un furnizor tranzacțional SMTP sau API și validează livrarea și primirea ambelor tipuri de email pe adrese de test controlate. Verifică linkurile, expirarea și consumul unic. Separă configurarea development, staging și production. Păstrează cheile și credențialele exclusiv în variabile de mediu sau într-un mecanism securizat de secrete. Testele locale și CI folosesc transport de test. Reia livrările după erori și restart fără a duplica acțiunile sau a expune tokenurile în loguri. Confirmă furnizorul, domeniul și adresa expeditorului înainte de configurarea externă.
- **Why:** Fluxurile de acces trebuie verificate cu livrare reală, iar verificările automate trebuie să fie repetabile și izolate.
- **Evidence:** Confirmarea explicită a responsabilului proiectului, punctul 5. [Q-011](../OPEN-QUESTIONS.md#q-011--ce-expeditor-va-livra-emailurile-reale-ale-pilotului) urmărește selecția și activarea.
- **Source:** user · confidence high

## D-025 · Activarea conturilor privilegiate și ultimul administrator activ
- **Status:** approved
- **Date:** 2026-11-20
- **Confirmed:** 2026-11-20
- **Rule:** Inițializează explicit primul administrator printr-o comandă operațională care primește secretul la runtime. Un administrator activ creează conturile privilegiate ulterioare pentru persoanele desemnate. Destinatarul își stabilește parola prin activare cu link unic. Administratorul activ are contul activat, emailul verificat și contul nedezactivat. Verifică tranzacțional păstrarea cel puțin a unui administrator activ la dezactivare și retragerea rolului.
- **Why:** Procedura controlează acordarea privilegiilor și păstrează accesul administrativ inclusiv la schimbări concurente.
- **Evidence:** Responsabilul proiectului a confirmat [Q-016](../questions/identitate-si-acces.md#q-016--cum-se-activează-și-se-administrează-conturile-privilegiate).
- **Source:** user · confidence high

## D-026 · Limitele încercărilor de autentificare
- **Status:** approved
- **Date:** 2026-11-20
- **Confirmed:** 2026-11-20
- **Rule:** Aplică temporizare progresivă după 5 încercări eșuate pe cont în 15 minute și o limită de 50 de încercări pe IP în aceeași fereastră. Păstrează contoarele în PostgreSQL, cu expirare. Evită blocarea permanentă și folosește răspunsuri generice. Verifică efectul limitelor asupra utilizatorilor care împart un IP înainte de pilot.
- **Why:** Limitele reduc încercările repetate, iar expirarea permite reluarea autentificării.
- **Evidence:** Responsabilul proiectului a confirmat [Q-017](../questions/identitate-si-acces.md#q-017--ce-limite-inițiale-folosim-pentru-încercările-repetate-de-autentificare).
- **Source:** user · confidence high

## D-027 · Accesul voluntarului în funcție de verificarea emailului
- **Status:** approved
- **Date:** 2026-11-20
- **Confirmed:** 2026-11-20
- **Rule:** Înainte de verificarea emailului, voluntarul poate parcurge fluxul de verificare a adresei. Sesiunea obișnuită și accesul la profil devin disponibile după verificare, inclusiv dacă aprobarea contului este în așteptare. Participarea cere aprobarea contului conform D-021.
- **Why:** Verificarea adresei permite accesul la profil, iar aprobarea rămâne condiția separată pentru participare.
- **Evidence:** Responsabilul proiectului a confirmat [Q-018](../questions/identitate-si-acces.md#q-018--ce-acces-are-voluntarul-înainte-de-verificarea-emailului).
- **Source:** user · confidence high

## D-028 · Resend prin API și acceptarea livrării în staging
- **Status:** approved
- **Date:** 2026-11-20
- **Confirmed:** 2026-11-20
- **Rule:** Integrează Resend prin API din prima livrare a modulului, configurabil prin variabile de mediu. Testele automate folosesc transportul simulat. Acceptarea modulului cere verificarea trimiterii, primirii și utilizării reale a ambelor tipuri de email în staging, pe adrese de test controlate. Configurează livrarea externă după confirmarea domeniului, a adresei expeditorului și a URL-ului HTTPS de staging din Q-011.
- **Why:** Alegerea furnizorului permite implementarea adaptorului, iar proba în staging verifică fluxul inclusiv după ce mesajul părăsește aplicația.
- **Evidence:** Responsabilul proiectului a confirmat Resend și criteriul de acceptare în staging. [Documentația API Resend](https://resend.com/docs/api-reference/emails/send-email) · [Planul modulului](../plans/identitate-si-acces.md#acceptarea-livrării-în-staging).
- **Source:** user · confidence high
