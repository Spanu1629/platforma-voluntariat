# Contracts — VolunTrack

<!-- graffino-agentic:begin v1 -->
> Promises across a boundary. **Provided:** this repo owns the contract; the text
> lives here only. **Consumed:** a link to the provider's entry plus the fields this
> repo relies on. **External:** what we rely on from a third-party service.
> Changing a provided contract is a PROPOSAL (AGENTS.md → The gate) and the plan
> lists the consumers' files too. Status: `approved` · `proposed` · `superseded-by`.
<!-- graffino-agentic:end -->

## Index
- C-001 · Readiness-ul backendului · provided

---

## Provided

## C-001 · Readiness-ul backendului
- **Status:** approved
- **Confirmed:** 2026-11-19
- **Interface:** `GET /health/ready` în serviciul NestJS.
- **Guarantee:** Rulează prin Prisma o interogare PostgreSQL cu timp limitat, folosind rolul aplicației. Răspunde cu HTTP 200 la succes și HTTP 503 dacă interogarea eșuează. Răspunsul de eroare este generic și nu expune detalii de conexiune.
- **Consumers:** [Healthcheck Compose](../../compose.yaml), [verificări de integrare](../../backend/test/run-integration.sh) și [GitHub Actions](../../.github/workflows/backend-ci.yml).
- **Evidence:** Aprobarea planului final pentru fundația backend VolunTrack.

## Consumed
No provider interfaces have been identified.

## External
No external services have been selected. Docker is a runtime constraint, not an application interface contract.
