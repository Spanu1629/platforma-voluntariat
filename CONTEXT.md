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
| Rol de voluntariat | Responsabilitate în cadrul unei ture. Exemple din ediția 2025 sunt verificarea biletelor, sprijinul la ateliere și logistica. Un voluntar poate avea cel mult un rol principal în același interval. |
| Repartizare | Alocarea unui voluntar la o responsabilitate și un interval. Asociația ia în calcul preferințele, experiența, abilitățile, vârsta, disponibilitatea și necesarul activității. |
| Instruire | Pregătirea propusă înaintea evenimentului, despre program, responsabilități, siguranță, urgențe, comunicarea cu părinții și copiii și protejarea datelor personale și a intimității copiilor. |

Surse pentru activitatea documentată și exemplele de roluri. [Informațiile asociației](INTERVIEW.md), [ediția istorică](EVENT.md)

## Planificare și acces în produs

| Termen | Definiție |
| --- | --- |
| Rol de acces | Rol care stabilește drepturile în aplicație. Voluntarul, coordonatorul și administratorul au drepturi diferite, iar accesul coordonatorului ține și de evenimentele atribuite și de permisiunile delegate. |
| Poziție | Un rol dintr-o tură pentru care se stabilește o capacitate. |
| Capacitate | Numărul maxim de locuri ale unei poziții. Înscrierile confirmate și ofertele active ocupă locuri. |
| Disponibilitate | Programul săptămânal în care voluntarul poate participa. Excepția pe dată înlocuiește programul întregii zile. |
| Eligibilitate | Îndeplinirea condițiilor de participare la o poziție, inclusiv aprobarea contului, disponibilitatea pentru întreaga tură, cerințele de vârstă aplicabile, instruirea obligatorie și regulile de program. |
| Evidența instruirii (training record) | Informațiile despre instruirea voluntarului și starea validării. Pentru o poziție cu instruire obligatorie, aceasta trebuie să fie valabilă pe întreaga tură. |
| Înscriere (registration) | Înregistrarea participării planificate a unui voluntar la o poziție. Un loc disponibil se confirmă pentru un voluntar eligibil după respectarea priorității listei de așteptare. |
| Listă de așteptare (waiting list) | Ordinea voluntarilor care așteaptă un loc. Când se eliberează un loc, oferta merge la primul candidat eligibil în ordinea intrării. |
| Ofertă | Rezervare exclusivă și temporară a unui loc pentru un voluntar, până la acceptare, refuz sau expirare. |

Surse pentru termenii de produs. [Cerințe aprobate](docs/agents/PROJECT-BRIEF.md), [modelul conceptual](docs/agents/ARCHITECTURE.md)

## Prezență, ore și documente

| Termen | Definiție |
| --- | --- |
| Prezență (attendance) | Participarea înregistrată a unui voluntar la o tură, prin intervalele dintre sosiri și plecări. |
| Check-in | Înregistrarea sosirii voluntarului prin scanarea QR în fluxul planificat. |
| Check-out | Înregistrarea plecării voluntarului. În fluxul planificat, închide și pauza aflată în curs. |
| Confirmare la locație | Opțiune configurată pe eveniment prin care coordonatorul atribuit confirmă vizual primul check-in din tură. Confirmarea păstrează ora scanării și permite folosirea ei la calculul orelor validate. |
| Pauză planificată | Pauză stabilită pentru tură, folosită la verificarea orelor la înscriere. |
| Pauză efectuată | Interval marcat de voluntar în timpul turei, dedus din prezență la calculul orelor. |
| Pontaj | Evidența intervalelor de prezență și a pauzelor efectuate, folosită pentru calculul și verificarea orelor. |
| Ore de voluntariat (volunteering hours) | Timpul de prezență din interiorul turei, cu pauzele efectuate deduse o singură dată. |
| Adeverință de voluntariat (volunteering certificate) | Document PDF numerotat, emis explicit pentru un voluntar și un eveniment după validarea orelor. Adeverința demonstrativă are serie și marcaj proprii. Utilizarea oficială a modelului rămâne de clarificat la Q-013. |
| Voluntar activ | Voluntar cu cel puțin o prezență validată în perioada selectată. |
| Neprezentare | Înscriere confirmată fără check-in la finalul turei. |

Surse pentru pontaj și raportare. [Cerințe aprobate](docs/agents/PROJECT-BRIEF.md), [întrebări deschise](docs/agents/OPEN-QUESTIONS.md)

## Categorii de date

| Termen | Definiție |
| --- | --- |
| Agregate istorice | Datele documentare ale ediției „Trenulețul Moșului” din 20.12.2025. Sunt disponibile totalul de 24 de voluntari, distribuția pe opt roluri și cele patru intervale. Alocările nominale, capacitățile pe rol și tură, prezențele și pontajele individuale sunt necunoscute. |
| Pilot demonstrativ | Eveniment planificat separat, cu minimum 15 colegi adulți, propriile ture, capacități, înscrieri, rezultate și adeverințe demonstrative. |
| Date sintetice | Date fictive pentru testele automate, păstrate separat de istoric și pilot. Acestea vor fi folosite și la testarea eligibilității minorilor. |

Surse pentru proveniența și separarea datelor. [Ediția 2025](EVENT.md), [criteriile de acceptare](docs/agents/PROJECT-BRIEF.md#istoric-pilot-și-acceptare), [D-006](docs/agents/DECISIONS.md#d-006--separarea-istoricului-de-demonstrație)
