# Patterns — VolunTrack

<!-- graffino-agentic:begin v1 -->
> How we build things here. Copy only `approved` entries. `candidate` = seen once or
> not yet confirmed; agents add these freely. Promotion needs the user's OK.
<!-- graffino-agentic:end -->

## Index
- PATTERN-001 · Revizuirea locală a unei machete aprobate · candidate
- PATTERN-002 · Dezvăluirea imaginii o singură dată la intrarea în viewport · candidate
- PATTERN-003 · Panou de filtre pliabil cu focus gestionat · candidate
- PATTERN-004 · Ceas controlat pentru stările temporizate ale machetelor · candidate
- PATTERN-005 · Proiect Compose temporar pentru testele de integrare · candidate
- PATTERN-006 · Scroll nativ pentru listele de carduri pe mobil · candidate
- PATTERN-007 · Job tranzacțional cu idempotency și termen de reluare · candidate
- PATTERN-008 · Probă manuală cu furnizor extern în Compose · candidate
- PATTERN-009 · Reevaluare înregistrată odată cu schimbarea condițiilor de eligibilitate · candidate
- PATTERN-010 · Citiri relaționale secvențiale în tranzacții Prisma · candidate

---

## PATTERN-001 · Revizuirea locală a unei machete aprobate
- **Status:** candidate
- **How:** Păstrează macheta aprobată și capturile ei. Creează un draft separat cu același DS-ID și folosește capturi la aceleași viewport-uri și în aceleași teme pentru comparația înainte și după.
- **Example:** [Revizuirea DS-003 și DS-004](../design/screens/review/2026-11-19/comparatie.html).

## PATTERN-002 · Dezvăluirea imaginii o singură dată la intrarea în viewport
- **Status:** candidate
- **How:** Observă cadrul cu `IntersectionObserver` și oprește observarea la prima intrare. Retrage masca printr-o transformare CSS și păstrează imaginea fixă în cadru. Afișează direct imaginea când mișcarea este redusă.
- **Example:** [Revizia DS-003](../design/mocks/archive/pre-mobile-carousels/DS-003.html) și [revizia DS-004](../design/mocks/archive/pre-mobile-carousels/DS-004.html).

## PATTERN-003 · Panou de filtre pliabil cu focus gestionat
- **Status:** candidate
- **How:** Folosește un buton cu `aria-expanded` și `aria-controls`. La închidere, mută focusul din panou înapoi pe buton și scoate imediat controalele din navigare cu `inert`, în timp ce panoul se restrânge.
- **Example:** [Filtrele din revizia DS-003](../design/mocks/archive/pre-mobile-carousels/DS-003.html).

## PATTERN-004 · Ceas controlat pentru stările temporizate ale machetelor
- **Status:** candidate
- **How:** Fixează ora în fiecare scenariu fictiv și oferă un control de avansare în zona de revizuire. Folosește același ceas pentru termene, intervalele de prezență și pauze, astfel încât verificarea vizuală și cea de interacțiune să fie repetabile.
- **Example:** [Programul și scenariile DS-005](../design/mocks/archive/pre-mobile-carousels/DS-005.html).

## PATTERN-005 · Proiect Compose temporar pentru testele de integrare
- **Status:** candidate
- **How:** Pornește serviciile într-un proiect Compose cu nume unic, credențiale temporare și volum propriu. Rulează migrările și testele cu date sintetice în acel proiect și elimină la final doar containerele și volumul lui.
- **Example:** [Verificările fundației backend](../../backend/test/run-integration.sh).

## PATTERN-006 · Scroll nativ pentru listele de carduri pe mobil
- **Status:** candidate
- **How:** Folosește lista semantică existentă drept zonă de scroll-snap. Leagă butoanele de listă, sincronizează indicatorul cu poziția aliniată și adu în vedere cardul al cărui control primește focus. Folosește aceeași listă în layoutul de tabletă și desktop.
- **Example:** [Stilurile caruselului](../design/mocks/carousel.css) și [navigarea comună celor trei drafturi](../design/mocks/carousel.js).

## PATTERN-007 · Job tranzacțional cu idempotency și termen de reluare
- **Status:** candidate
- **How:** Scrie jobul în tranzacția care creează acțiunea, revendică-l pentru un interval limitat și reutilizează cheia stabilă la fiecare încercare. Oprește reluarea la expirarea acțiunii și urmărește separat rezultatele ambigue. Verifică restartul cu un transport simulat.
- **Example:** [Workerul de email](../../backend/src/identity/identity-mail.ts) și [testele de identitate](../../backend/test/identity.integration.test.js).

## PATTERN-008 · Probă manuală cu furnizor extern în Compose
- **Status:** candidate
- **How:** Activează integrarea printr-un fișier Compose explicit, într-un proiect cu volum propriu. Transmite credențialele dintr-un fișier local ignorat de Git, doar serviciului care apelează furnizorul. Validează configurația cu valori fictive și folosește transportul simulat în suita automată.
- **Example:** [Configurația probei locale Resend](../../compose.resend.local.yaml).

## PATTERN-009 · Reevaluare înregistrată odată cu schimbarea condițiilor de eligibilitate
- **Status:** candidate
- **How:** Înregistrează în aceeași tranzacție cu modificarea eligibilității și auditul identificatorul subiectului și cauza reevaluării. Consumatorul poate reciti condițiile înainte de efectele asupra repartizărilor viitoare și poate trimite notificările prin joburile persistente. Păstrează datele personale în evidențele autorizate, fără a le copia în înregistrarea de reevaluare.
- **Example:** [Invalidarea verificării din profil](../../backend/src/identity/identity.service.ts), [anularea instruirii](../../backend/src/eligibility/training.service.ts) și [schimbările din planificare](../../backend/src/planning/planning.service.ts).

## PATTERN-010 · Citiri relaționale secvențiale în tranzacții Prisma
- **Status:** candidate
- **How:** Așteaptă pe rând citirile care folosesc aceeași conexiune tranzacțională. Pentru o colecție de părinți, citește fiecare tip de relație în lot și grupează rezultatele după cheia părintelui. Testează atât suprapunerea comenzilor pe conexiune, cât și numărul de comenzi pentru mai mulți părinți.
- **Example:** [Citirea planului și verificarea publicării](../../backend/src/planning/planning.service.ts), [testele de integrare](../../backend/test/planning.integration.test.js).
