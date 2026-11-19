# Patterns — VolunTrack

<!-- graffino-agentic:begin v1 -->
> How we build things here. Copy only `approved` entries. `candidate` = seen once or
> not yet confirmed; agents add these freely. Promotion needs the user's OK.
<!-- graffino-agentic:end -->

## Index
- PATTERN-001 · Revizuirea locală a unei machete aprobate · candidate
- PATTERN-002 · Dezvăluirea imaginii o singură dată la intrarea în viewport · candidate
- PATTERN-003 · Panou de filtre pliabil cu focus gestionat · candidate

---

## PATTERN-001 · Revizuirea locală a unei machete aprobate
- **Status:** candidate
- **How:** Păstrează macheta aprobată și capturile ei. Creează un draft separat cu același DS-ID și folosește capturi la aceleași viewport-uri și în aceleași teme pentru comparația înainte și după.
- **Example:** [Revizuirea DS-003 și DS-004](../design/screens/2026-11-19/comparatie.html).

## PATTERN-002 · Dezvăluirea imaginii o singură dată la intrarea în viewport
- **Status:** candidate
- **How:** Observă cadrul cu `IntersectionObserver` și oprește observarea la prima intrare. Retrage masca printr-o transformare CSS și păstrează imaginea fixă în cadru. Afișează direct imaginea când mișcarea este redusă.
- **Example:** [Revizia DS-003](../design/mocks/2026-11-19/DS-003.html) și [revizia DS-004](../design/mocks/2026-11-19/DS-004.html).

## PATTERN-003 · Panou de filtre pliabil cu focus gestionat
- **Status:** candidate
- **How:** Folosește un buton cu `aria-expanded` și `aria-controls`. La închidere, mută focusul din panou înapoi pe buton și scoate imediat controalele din navigare cu `inert`, în timp ce panoul se restrânge.
- **Example:** [Filtrele din revizia DS-003](../design/mocks/2026-11-19/DS-003.html).
