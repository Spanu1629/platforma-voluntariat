# Decisions superseded — VolunTrack

<!-- graffino-agentic:begin v1 -->
> Decisions that no longer apply. **Never obeyed**; read only to explain old code or a
> past choice. Each points to the entry that replaced it. `ledger-lint.py --fix`
> keeps this file in sync: superseded entries move here from `DECISIONS.md`, and
> their index lines move here from its index.
<!-- graffino-agentic:end -->

## Index
- D-001 · Backend services and databases run in Docker · _superseded-by D-009_
- D-004 · Înscrieri și rezervări tranzacționale · _superseded-by D-014_

---

## D-001 · Backend services and databases run in Docker
- **Status:** superseded-by D-009
- **Date:** 2026-11-06
- **Rule:** Run backend services and databases in Docker.
- **Why:** The university laboratory requires Docker for backend services and databases.
- **Rejected:** No alternatives were supplied or evaluated.
- **Evidence:** [Setup report](SETUP-REPORT.md#ledger), initial laboratory constraint.
- **Source:** user · confidence high

## D-004 · Înscrieri și rezervări tranzacționale
- **Status:** superseded-by D-014
- **Date:** 2026-11-18
- **Rule:** Verifică eligibilitatea și capacitatea în tranzacții PostgreSQL care serializează operațiile asupra poziției și programului voluntarului. Oferta activă rezervă un loc exclusiv. Lista de așteptare eligibilă are prioritate față de înscrierile noi.
- **Why:** Prevenim suprarezervarea și înscrierile concurente incompatibile.
- **Rejected:** Blocarea doar a poziției nu protejează programul voluntarului.
- **Evidence:** [Scope VolunTrack](PROJECT-BRIEF.md), planul final aprobat în conversație.
- **Source:** user · confidence high
