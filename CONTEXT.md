# Glosar VolunTrack

<!-- graffino-agentic:begin v1 -->
> Folosește termenii de mai jos cu sensul indicat pentru proiect.
<!-- graffino-agentic:end -->

## Organizație și activitate

| Termen | Definiție |
| --- | --- |
| Organizație parteneră (partner organization) | Asociația „Mâini Mici, Suflete Mari”, care organizează evenimente caritabile, activități pentru copii și campanii de sprijin pentru familii în Dumbrăveni, Mediaș și Sibiu. |
| Voluntar (volunteer) | Persoană care sprijină pregătirea, desfășurarea sau încheierea activităților asociației. |
| Coordonator (coordinator) | Persoană care organizează activitatea voluntarilor, stabilește necesarul și comunică programul și responsabilitățile. |
| Eveniment (event) | Activitate de voluntariat organizată de asociație, cum este „Trenulețul Moșului”. |
| Tură (shift) | Interval programat de activitate a voluntarilor în cadrul unui eveniment. Poate include pregătirea, activitățile cu publicul sau strângerea materialelor. |
| Rol de voluntariat | Responsabilitate în cadrul unei ture. Exemple din ediția 2025 sunt verificarea biletelor, sprijinul la ateliere și logistica. Turele unui voluntar nu se pot suprapune. |
| Repartizare | Propunerea coordonatorului de a aloca voluntarul unui rol și unei ture pe baza disponibilității, eligibilității și necesarului evenimentului. După accept și reverificare, se confirmă automat dacă este loc. Dacă locul lipsește, voluntarul eligibil intră în coada rolului și turei autorizate. |
| Instruire | Pregătire desfășurată de asociație, în afara aplicației, prin voluntari cu experiență. Instruirea generală este obligatorie pentru fiecare voluntar. Instruirile specializate se asociază rolurilor relevante. |

Surse pentru activitatea documentată și exemplele de roluri. [Informațiile asociației](INTERVIEW.md), [ediția istorică](EVENT.md)

## Planificare și acces în produs

| Termen | Definiție |
| --- | --- |
| Rol de acces | Rol care stabilește drepturile în aplicație. Voluntarul, coordonatorul și administratorul au drepturi diferite, iar accesul coordonatorului ține și de evenimentele atribuite și de permisiunile delegate. |
| Poziție | Un rol dintr-o tură pentru care se stabilește o capacitate. |
| Capacitate | Numărul maxim de locuri ale unei poziții. Repartizările confirmate și ofertele active ocupă locuri. |
| Disponibilitate | Programul săptămânal în care voluntarul poate participa. Excepția pe dată înlocuiește programul întregii zile. |
| Eligibilitate | Îndeplinirea condițiilor de participare la o poziție, inclusiv aprobarea contului, disponibilitatea pentru întreaga tură, pragurile de vârstă și condițiile aplicabile rolului, instruirea obligatorie și regulile de program. |
| Evidența instruirii (training record) | Confirmarea finalizării, cu tip, domeniu, roluri relevante, dată, persoana care a instruit și coordonatorul care a confirmat. Instruirile nu expiră automat. |
| Solicitare de participare | Cererea voluntarului de a participa la un eveniment, însoțită de disponibilitate. Repartizarea la un rol și o tură este un pas ulterior. |
| Înscriere confirmată (registration) | Participare planificată la o poziție, după acceptarea repartizării și îndeplinirea condițiilor. |
| Listă de așteptare (waiting list) | Coadă FIFO pentru o poziție exactă, formată din voluntari eligibili care au acceptat repartizarea propusă și pentru care a lipsit un loc. Un loc eliberat este oferit primului candidat eligibil. |
| Ofertă | Rezervare exclusivă și temporară a unui loc pentru un voluntar din coadă. Acceptarea confirmă repartizarea deja autorizată după reverificare. Refuzul sau expirarea eliberează locul. |
| Retragere din tură | Renunțarea la repartizarea din tură. Încetarea contractului de voluntariat se gestionează separat de asociație. |

Surse pentru termenii de produs. [Cerințe aprobate](docs/agents/PROJECT-BRIEF.md), [modelul conceptual](docs/agents/ARCHITECTURE.md)

## Prezență, ore și documente

| Termen | Definiție |
| --- | --- |
| Prezență (attendance) | Participarea înregistrată a unui voluntar la o tură, prin intervalele dintre sosiri și plecări. |
| Check-in | Înregistrarea sosirii voluntarului prin scanarea QR în fluxul planificat. |
| Check-out | Înregistrarea plecării voluntarului. În fluxul planificat, închide și pauza aflată în curs. |
| Confirmare la locație | Opțiune configurată pe eveniment prin care coordonatorul atribuit confirmă vizual primul check-in din tură. Confirmarea păstrează ora scanării și permite folosirea ei la calculul orelor validate. |
| Pauză planificată | Pauză stabilită pentru tură, folosită la verificarea orelor la repartizare. |
| Pauză efectuată | Interval marcat de voluntar în timpul turei, dedus din prezență la calculul orelor. |
| Pontaj | Evidența intervalelor de prezență și pauzelor efectuate. Pontajul complet și conform se validează automat pe baza prezenței validate. |
| Ore de voluntariat (volunteering hours) | Timpul de prezență din interiorul turei, cu pauzele efectuate deduse o singură dată. |
| Verificarea identității | Confirmarea identității și vârstei de către coordonatorul autorizat, pe baza fotografiei actului încărcate privat în aplicație și șterse imediat după verificare. Aplicația păstrează rezultatul, data și persoana responsabilă. |
| Contract de voluntariat | Document întocmit, semnat, înregistrat și păstrat manual de asociație. VolunTrack ține evidența administrativă a contractului și a verificării documentelor. |
| Certificat de voluntariat (volunteering certificate) | PDF numerotat, generat pe baza datelor și orelor validate. Coordonatorul autorizat descarcă certificatul și raportul anexat, le semnează extern și le înmânează voluntarului. Documentele demonstrative au serie și marcaj proprii. |
| Raport de activitate | Document anexat certificatului de voluntariat, cu activitățile prestate, atribuțiile asumate și aptitudinile dobândite. |
| Voluntar activ | Voluntar cu cel puțin o prezență validată în perioada selectată. |
| Neprezentare | Înscriere confirmată fără check-in la finalul turei. |

Surse pentru pontaj și raportare. [Cerințe aprobate](docs/agents/PROJECT-BRIEF.md), [întrebări deschise](docs/agents/OPEN-QUESTIONS.md)

## Categorii de date

| Termen | Definiție |
| --- | --- |
| Agregate istorice | Datele documentare ale ediției „Trenulețul Moșului” din 20.12.2025. Sunt disponibile totalul de 24 de voluntari, distribuția pe opt roluri și cele patru intervale. Alocările nominale, capacitățile pe rol și tură, prezențele și pontajele individuale sunt necunoscute. |
| Pilot demonstrativ | Eveniment planificat separat, cu minimum 15 colegi, propriile ture, capacități, repartizări, rezultate și adeverințe demonstrative. Poate include adulți și minori eligibili după verificările asociației. |
| Date sintetice | Date fictive pentru testele automate, păstrate separat de istoric și pilot. Acestea vor fi folosite și la testarea eligibilității minorilor. |

Surse pentru proveniența și separarea datelor. [Ediția 2025](EVENT.md), [criteriile de acceptare](docs/agents/PROJECT-BRIEF.md#istoric-pilot-și-acceptare), [D-006](docs/agents/DECISIONS.md#d-006--separarea-istoricului-de-demonstrație)
