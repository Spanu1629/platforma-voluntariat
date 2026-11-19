# Reguli organizatorice — VolunTrack

## D-012 · Eligibilitatea de vârstă și programul voluntarilor
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Aplică pragul general de 15 ani și pragurile pe rol din brief, cu supravegherea și restricțiile aplicabile minorilor. Pilotul poate include adulți și minori eligibili, cu documentele și condițiile aplicabile gestionate de asociație. Limitează timpul efectiv zilnic la 4 ore pentru minori și 8 ore pentru adulți, cumulat pe organizație. Păstrează minimum 30 de minute între ture și minimum 30 de minute de pauză în turele de cel puțin 4 ore. Înregistrează separat pauza planificată și cea efectuată. Pentru adulți, 6–8 ore sunt o recomandare și turele de 1–3 ore sunt permise.
- **Why:** Responsabilul proiectului a clarificat regulile organizatorice. Aplicarea lor în pilot pentru minori reali depinde de [verificările înainte de activare](../../privacy/GDPR.md#verificări-obligatorii-înainte-de-activarea-cu-date-reale).
- **Evidence:** Clarificările 1–2 din conversația de proiect. [Eligibilitate și planificare](../PROJECT-BRIEF.md#conturi-eligibilitate-și-planificare)
- **Source:** user · confidence high

## D-013 · Evidența instruirilor finalizate
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Asociația desfășoară instruirile în afara aplicației, prin voluntari cu experiență. Instruirea generală inițială este obligatorie pentru fiecare voluntar. Pentru coordonare, amenajare/logistică și ateliere creative se cere și instruire specializată, asociabilă cu mai multe roluri. Voluntarul poate avea mai multe instruiri generale și specializate. Coordonatorul autorizat confirmă instruirile în profil. Fiecare înregistrare include tipul, domeniul, rolurile relevante, data, persoana care a instruit și coordonatorul care a confirmat. Instruirile nu expiră automat. Coordonatorul poate cere reînnoirea când se schimbă regulile organizației. Auditează corecțiile și anulările și verifică instruirile necesare înaintea activării repartizării.
- **Why:** Repartizarea depinde de instruirea efectuată în cadrul organizației.
- **Evidence:** Clarificarea finală privind instruirile, aprobată de responsabilul proiectului la 19.11.2026. [Evidența instruirilor](../PROJECT-BRIEF.md#evidența-instruirilor)
- **Source:** user · confidence high

## D-014 · Repartizare propusă de coordonator și rezervări tranzacționale
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Voluntarul solicită participarea la eveniment. Coordonatorul propune rolul și tura. La acceptare, confirmă automat dacă voluntarul este eligibil și are loc după aplicarea priorității FIFO. Dacă este eligibil și locul lipsește, înscrie-l în coada FIFO a combinației exacte rol–tură autorizate. Schimbarea rolului sau turei urmează același accept și aceleași reverificări. Retragerea voluntarului din tură este permisă cu cel puțin o oră înainte. Coordonatorul gestionează excepțiile ulterioare. Păstrează oferta automată a locului eliberat pentru primul candidat eligibil FIFO, rezervarea exclusivă și termenul configurabil de 12 ore implicit, limitat de începutul turei. Serializează verificările și operațiile asupra poziției și programului voluntarului în tranzacții PostgreSQL. Păstrează prioritatea cozii eligibile față de cererile noi. Acceptarea ofertei confirmă repartizarea deja autorizată fără aprobare suplimentară, după reverificarea tranzacțională. Refuzul sau expirarea eliberează rezervarea și permite continuarea procesării cozii.
- **Why:** Coordonatorul stabilește repartizarea, voluntarul o acceptă, iar tranzacția previne suprarezervarea și turele incompatibile.
- **Rejected:** Înscrierea directă la un loc liber este înlocuită de solicitarea de participare. Blocarea doar a poziției nu protejează programul voluntarului.
- **Evidence:** Fluxul final aprobat de responsabilul proiectului la 19.11.2026, consemnat la Q-014. [Înscrieri și repartizare](../PROJECT-BRIEF.md#înscrieri-prezență-și-ore)
- **Source:** user · confidence high

## D-015 · Validarea automată a pontajelor conforme
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Calculează orele efective din prezența din interiorul turei, cu pauzele efectuate deduse o singură dată. Reflectă întârzierile și plecările anticipate. Validează automat pontajele complete și conforme, folosind prezență validată, și trimite pontajele incomplete sau neconforme la verificarea coordonatorului. Coordonatorul poate face corecții justificate și auditate. Păstrează QR-ul și confirmarea opțională la locație conform D-007.
- **Why:** Confirmarea prezenței și validarea orelor rezolvă verificări distincte.
- **Evidence:** Clarificarea 6 din conversația de proiect. [Prezență și ore](../PROJECT-BRIEF.md#înscrieri-prezență-și-ore)
- **Source:** user · confidence high

## D-016 · Verificarea identității și evidența documentelor
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Permite încărcarea privată prin HTTPS a fotografiei actului în VolunTrack. Numai coordonatorul autorizat pentru verificarea respectivă o accesează și verifică identitatea și vârsta. Păstrează numai rezultatul, data și coordonatorul responsabil. Șterge fotografia imediat după aprobare sau respingere, expiră automat încărcările abandonate și auditează accesul fără conținutul actului. Exclude fotografia din backupuri, loguri, exporturi, notificări și rapoarte. CNP-ul, seria și numărul actului nu se stochează în baza de date doar pentru confirmarea identității. Asociația păstrează manual contractele, fișele și documentele minorilor. Aplicația ține doar evidența administrativă a verificării și a contractului. Participarea efectivă și check-in-ul cer documente confirmate și îndeplinirea condițiilor aplicabile.
- **Why:** Verificarea susține eligibilitatea și previne folosirea identităților false. Interesul legitim propus și garanțiile trebuie demonstrate înainte de activarea cu date reale. [Documentația GDPR](../../privacy/GDPR.md)
- **Evidence:** Fluxurile finale aprobate de responsabilul proiectului la 19.11.2026, consemnate la Q-010 și Q-015. [Identitate, contracte și documente](../PROJECT-BRIEF.md#identitate-contracte-și-documente)
- **Source:** user · confidence high

## D-017 · Generarea adeverințelor și semnarea externă
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Generează PDF-urile certificatului de voluntariat și raportului de activitate pe baza datelor și orelor validate, cu informațiile legal aplicabile. Coordonatorul autorizat le descarcă, le semnează în afara aplicației și le înmânează voluntarului. Fluxul nu include semnătură electronică sau încărcarea documentelor semnate. Păstrează numerotarea, auditul, anularea justificată, reemiterea cu număr nou și legătura cu documentul anterior. Folosește serie distinctă și marcajul „DEMONSTRAȚIE — nu atestă activitate de voluntariat” pentru pilot.
- **Why:** Aplicația generează documentele, iar asociația asigură semnarea și eliberarea.
- **Evidence:** Fluxul final aprobat de responsabilul proiectului la 19.11.2026, consemnat la Q-013. [Documente și statistici](../PROJECT-BRIEF.md#comunicare-documente-și-statistici)
- **Source:** user · confidence high
