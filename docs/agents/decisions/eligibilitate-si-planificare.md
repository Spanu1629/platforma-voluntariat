# Eligibilitate și planificare

## D-032 · Ziua locală și politica de pauze planificate

- **Status:** approved
- **Date:** 2026-11-26
- **Confirmed:** 2026-11-26
- **Rule:** Stochează momentele în UTC. O tură se încadrează într-o singură zi locală în `Europe/Bucharest`, cu final permis exact la miezul nopții următoare. Calculează vârsta la data locală de început pentru rol, plafonul zilnic și supraveghere. Recalculează eligibilitatea la schimbarea datei. Păstrează intervalul minim de 30 de minute între ture.
- **Policy:** Inițializează politica în PostgreSQL. Turele de cel puțin 240 de minute cer o pauză continuă de cel puțin 30 de minute. Scade toate pauzele planificate. Evaluatorul citește pragurile din baza de date. DS-012 va administra modificările validate și auditate, aplicate fără efect retroactiv asupra participărilor finalizate.
- **Why:** Disponibilitatea, aniversările și cumulul zilnic urmează calendarul organizației, iar durata efectivă trebuie să fie corectă inclusiv la schimbarea orei.
- **Evidence:** D-012 și clarificările de calendar și pauze din planul aprobat la 26.11.2026. [Brief](../PROJECT-BRIEF.md#conturi-eligibilitate-și-planificare)
- **Source:** user · confidence high

## D-033 · Planificare, acces la evenimente și poziții

- **Status:** approved
- **Date:** 2026-11-26
- **Confirmed:** 2026-11-26
- **Rule:** Administratorul creează, editează și publică în organizație. Coordonatorul creator este atribuit automat, iar atribuirea activă este obligatorie pentru editare și publicare de către coordonatori. Numai administratorul atribuie sau revocă alți coordonatori. Revocarea retrage accesul imediat. Auditează atribuirile, revocările, publicarea și editările relevante.
- **Publication:** Ciorna poate rămâne incompletă. Publicarea cere titlu, descriere și cel puțin o tură. Fiecare tură are dată, interval valid, locație și cel puțin o poziție cu capacitate pozitivă. Catalogul public expune numai datele aprobate ale evenimentelor publicate. Coperta și galeria sunt opționale, iar interfața afișează o imagine implicită dacă lipsește coperta.
- **Positions:** Citește din baza de date cele opt roluri aprobate și cerințele lor. Validarea și administrarea rolurilor noi se livrează ulterior. Capacitatea zero păstrează istoricul, elimină poziția din catalogul disponibil și cere altă poziție pozitivă în aceeași tură și soluționarea repartizărilor confirmate și a ofertelor active. Înscrierile suspendă propunerile și intrările FIFO, permit retragerea și reiau aceeași ordine după redeschidere și reevaluare. Solicitarea rămâne la nivel de eveniment.
- **Minors:** Coordonatorul atribuit confirmă separat adecvarea sarcinilor pentru minori și supravegherea aplicabilă. Păstrează autorul și data. Adecvarea cere activități potrivite vârstei, fără sarcini periculoase, coordonarea individuală a echipei sau supravegherea individuală a copiilor. Schimbarea sarcinilor invalidează adecvarea și cere reevaluarea repartizărilor viitoare. Retragerea supravegherii cere reevaluare și avertizarea coordonatorului.
- **Why:** Publicarea păstrează o planificare utilizabilă, iar atribuirea limitează operațiile la coordonatorii responsabili.
- **Evidence:** Clarificările despre evenimente, catalog, capacitate și minori din planul aprobat la 26.11.2026. [Brief](../PROJECT-BRIEF.md#conturi-eligibilitate-și-planificare)
- **Source:** user · confidence high

## D-034 · Acces, reînnoire și anulare pentru instruiri

- **Status:** approved
- **Date:** 2026-11-26
- **Confirmed:** 2026-11-26
- **Rule:** Un voluntar cu email verificat poate gestiona disponibilitatea proprie înainte de aprobarea contului. Doar voluntarul aprobat trimite solicitări. Instruirile obligatorii se verifică înainte de repartizare. Coordonatorul gestionează instruiri dacă are permisiunea distinctă și o atribuire activă la un eveniment pentru care voluntarul are o legătură activă.
- **Access:** Legăturile active sunt solicitarea deschisă, propunerea în așteptare, intrarea FIFO inclusiv suspendată, oferta activă și repartizarea confirmată la o tură viitoare sau în desfășurare. Permisiunea și legătura se verifică la fiecare operație. Închiderea ultimei legături retrage imediat accesul și păstrează instruirile și istoricul.
- **Records:** Solicitarea de reînnoire menține confirmarea valabilă. Noua confirmare leagă evidența înlocuitoare de cea anterioară. Un coordonator autorizat poate anula și o instruire confirmată la alt eveniment, cu motiv obligatoriu și audit. Anularea notifică voluntarul și cere reevaluarea repartizărilor viitoare și notificarea coordonatorilor responsabili. Participările finalizate își păstrează evidența.
- **Delivery:** Serviciul și testele PostgreSQL sunt în modulul de eligibilitate. Rutele de gestionare a instruirilor se activează cu stările persistente ale înscrierilor.
- **Why:** Instruirea se confirmă după solicitare și înainte de repartizare, iar accesul urmează relația curentă cu voluntarul.
- **Evidence:** D-013 și clarificările despre disponibilitate și instruiri din planul aprobat la 26.11.2026.
- **Source:** user · confidence high

## D-035 · Rezultatul verificării de identitate la confirmare

- **Status:** approved
- **Date:** 2026-11-26
- **Confirmed:** 2026-11-26
- **Rule:** Folosește data nașterii declarată pentru evaluarea preliminară. Confirmarea repartizării cere verificarea identității și a vârstei. Modificarea numelui, prenumelui sau datei nașterii invalidează verificarea atomic și se auditează fără valori personale. Modificarea datelor de contact menține rezultatul. Invalidarea notifică voluntarul și coordonatorii responsabili și cere reevaluarea repartizărilor viitoare. Participările finalizate își păstrează evidența.
- **Delivery:** Eligibilitatea furnizează modelul rezultatului și verificarea obligatorie. Fluxul D-016 va furniza rezultatul verificat după încărcarea privată, verificarea manuală și ștergerea fotografiei. Activarea în producție a confirmării urmează după verificarea completă a fluxului D-016. Verificarea documentelor de participare rămâne distinctă conform Q-010.
- **Why:** Verificarea trebuie să reprezinte profilul curent, iar evaluarea preliminară poate sprijini planificarea înainte de verificarea actului.
- **Evidence:** D-016, Q-010 și clarificările despre identitate din planul aprobat la 26.11.2026. [Reguli GDPR](../../privacy/GDPR.md)
- **Source:** user · confidence high
