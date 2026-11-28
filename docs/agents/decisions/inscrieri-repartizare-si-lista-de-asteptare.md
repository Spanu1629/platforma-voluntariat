# Înscrieri, repartizare și listă de așteptare

## D-036 · Ciclul solicitării, propunerilor și publicării

- **Status:** approved
- **Date:** 2026-11-28
- **Confirmed:** 2026-11-28
- **Rule:** Voluntarul are cel mult o solicitare activă pentru același eveniment. Solicitarea poate alimenta mai multe propuneri și repartizări în ture compatibile. Refuzul unei propuneri lasă solicitarea deschisă.
- **Request closure:** Voluntarul poate retrage solicitarea la nivel de eveniment. Retragerea închide propunerile în așteptare, intrările FIFO și ofertele active și eliberează rezervările ofertelor. Repartizările confirmate urmează fluxul separat de retragere. Solicitarea rămasă deschisă se închide la finalul ultimei ture a evenimentului.
- **Proposal validity:** Propunerea poate fi acceptată înainte de începutul turei. Revocarea atribuirii coordonatorului îi retrage imediat accesul. Propunerile emise anterior își păstrează valabilitatea.
- **Publication:** Anularea motivată a ultimei ture dintr-un eveniment publicat retrage evenimentul din catalogul public și păstrează istoricul. Evenimentul poate fi republicat după configurarea unei ture valide și verificarea cerințelor D-033.
- **Why:** O solicitare urmărește participarea la eveniment, iar propunerile și repartizările au termene și efecte distincte.
- **Evidence:** Confirmările responsabilului proiectului din conversația de planificare din 28.11.2026, care completează [D-014](reguli-organizatorice.md#d-014--repartizare-propusă-de-coordonator-și-rezervări-tranzacționale) și [D-033](eligibilitate-si-planificare.md#d-033--planificare-acces-la-evenimente-și-poziții).
- **Source:** user · confidence high

## D-037 · Eligibilitate FIFO, oferte și schimbarea repartizării

- **Status:** approved
- **Date:** 2026-11-28
- **Confirmed:** 2026-11-28
- **Rule:** Verificarea identității este obligatorie la intrarea în coada FIFO, la emiterea ofertei și la confirmarea repartizării. Solicitarea și propunerea pot preceda verificarea identității.
- **Schedule:** Verifică suprapunerea și intervalul minim de 30 de minute inclusiv pentru pozițiile din coadă. Aplică plafonul zilnic repartizărilor confirmate și ofertelor active. Pentru o mutare verifică separat programul curent și programul după mutare, inclusiv plafonul zilnic.
- **Reassignment:** Repartizarea sursă păstrează locul cât timp voluntarul așteaptă mutarea. După reverificarea eligibilității și a capacității, confirmă locul nou și eliberează locul vechi în aceeași tranzacție.
- **Offer eligibility:** Respinge acceptarea unei oferte când candidatul a devenit neeligibil. Pentru o cauză temporară și remediabilă, păstrează rezervarea până la refuz sau expirare. Dacă eligibilitatea se restabilește, oferta poate fi acceptată în termen după reverificare. Pentru o cauză definitivă pentru tura respectivă, închide oferta, eliberează locul și continuă FIFO.
- **Why:** Rezervările rămân predictibile în timpul mutării, iar o cauză definitivă permite cozii să avanseze.
- **Evidence:** Confirmările responsabilului proiectului din conversația de planificare din 28.11.2026, care completează [D-014](reguli-organizatorice.md#d-014--repartizare-propusă-de-coordonator-și-rezervări-tranzacționale), [D-032](eligibilitate-si-planificare.md#d-032--ziua-locală-și-politica-de-pauze-planificate) și [D-035](eligibilitate-si-planificare.md#d-035--rezultatul-verificării-de-identitate-la-confirmare).
- **Source:** user · confidence high
