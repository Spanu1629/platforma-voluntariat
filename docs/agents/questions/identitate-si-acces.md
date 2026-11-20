# Întrebări despre identitate și acces

## Q-016 · Cum se activează și se administrează conturile privilegiate?
- **Status:** answered
- **Answer:** 2026-11-20 — Inițializează explicit primul administrator printr-o comandă operațională care primește secretul de la runtime. Un administrator activ creează conturile privilegiate ulterioare pentru persoanele desemnate. Destinatarul își stabilește parola prin activare cu link unic. Definește administratorul activ ca activat, cu email verificat și cont nedezactivat. Verifică tranzacțional păstrarea cel puțin a unuia la dezactivare și la retragerea rolului.
- **Recorded as:** [D-025](../decisions/identitate-si-acces.md#d-025--activarea-conturilor-privilegiate-și-ultimul-administrator-activ).
- **Confirmed:** 2026-11-20

## Q-017 · Ce limite inițiale folosim pentru încercările repetate de autentificare?
- **Status:** answered
- **Answer:** 2026-11-20 — Aplică temporizare progresivă după 5 încercări eșuate pe cont în 15 minute și o limită de 50 de încercări pe IP în aceeași fereastră. Păstrează contoarele în PostgreSQL, cu expirare și fără blocare permanentă. Folosește răspunsuri generice și confirmă limitele pentru utilizatorii care împart o adresă IP înainte de pilot.
- **Recorded as:** [D-026](../decisions/identitate-si-acces.md#d-026--limitele-încercărilor-de-autentificare).
- **Confirmed:** 2026-11-20

## Q-018 · Ce acces are voluntarul înainte de verificarea emailului?
- **Status:** answered
- **Answer:** 2026-11-20 — Înainte de verificare, contul poate parcurge fluxul de verificare a adresei. După verificare, voluntarul își poate completa profilul chiar dacă aprobarea este în așteptare. Participarea necesită aprobarea contului conform D-021.
- **Recorded as:** [D-027](../decisions/identitate-si-acces.md#d-027--accesul-voluntarului-în-funcție-de-verificarea-emailului).
- **Confirmed:** 2026-11-20
