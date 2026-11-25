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
- C-002 · API de identitate și acces · provided · _superseded-by C-004_
- C-004 · API de identitate și acces · provided
- C-003 · Livrarea tranzacțională prin Resend · external

---

## Provided

## C-001 · Readiness-ul backendului
- **Status:** approved
- **Confirmed:** 2026-11-19
- **Interface:** `GET /health/ready` în serviciul NestJS.
- **Guarantee:** Rulează prin Prisma o interogare PostgreSQL cu timp limitat, folosind rolul aplicației. Răspunde cu HTTP 200 la succes și HTTP 503 dacă interogarea eșuează. Răspunsul de eroare este generic și nu expune detalii de conexiune.
- **Consumers:** [Healthcheck Compose](../../compose.yaml), [verificări de integrare](../../backend/test/run-integration.sh) și [GitHub Actions](../../.github/workflows/backend-ci.yml).
- **Evidence:** Aprobarea planului final pentru fundația backend VolunTrack.

## C-002 · API de identitate și acces
- **Status:** superseded-by C-004
- **Interface:** HTTP JSON sub `/identity`. Schema OpenAPI generată de backend este disponibilă la `GET /openapi.json`.
- **Guarantee:** `GET /identity/csrf` emite un token și cookie-ul CSRF host-only. Cererile care modifică starea folosesc aceeași origine HTTPS configurată, cookie-ul și headerul `X-CSRF-Token`. `POST /identity/login` emite cookie-ul de sesiune host-only, Secure, HttpOnly și SameSite=Lax. Profilul autenticat reprezintă propriul cont. Verificarea adresei și aprobarea voluntarului sunt stări distincte. Aprobarea, delegarea și administrarea se autorizează server-side în organizația utilizatorului.
- **Links:** Linkurile din email folosesc fragmentul URL pentru token. Deschiderea prin GET păstrează tokenul valid. Clientul trimite tokenul în corpul JSON la POST pe aceeași cale, cu parola nouă la resetare sau activare. Răspunsurile de succes la confirmare au cod 204. Solicitările de email și înregistrare răspund generic cu 202 pentru intrări valide.
- **Consumers:** [Teste HTTP sintetice](../../backend/test/identity.integration.test.js). Clientul de produs va folosi schema OpenAPI.
- **Evidence:** [Planul de identitate](plans/identitate-si-acces.md) și D-020–D-028.

## C-004 · API de identitate și acces
- **Status:** approved
- **Confirmed:** 2026-11-25
- **Interface:** HTTP JSON sub `/identity`. Schema OpenAPI generată este disponibilă la `GET /openapi.json`.
- **Guarantee:** `GET /identity/csrf` emite un token și cookie-ul CSRF host-only. Cererile care modifică starea folosesc aceeași origine HTTPS configurată, cookie-ul și headerul `X-CSRF-Token`. `POST /identity/login` emite cookie-ul de sesiune host-only, Secure, HttpOnly și SameSite=Lax. Profilul autenticat reprezintă propriul cont. Aprobarea, delegarea și administrarea se autorizează server-side în organizația utilizatorului.
- **Registration:** `POST /identity/register` primește `email` și opțional `locale`. Creează voluntarul în așteptare fără hash de parolă. Solicitările valide de înregistrare și de email răspund generic cu HTTP 202.
- **Links:** Tokenul se află în fragmentul URL, iar deschiderea prin GET îl păstrează disponibil. Clientul trimite `token` și `password` în corpul JSON la POST pe aceeași cale pentru verificarea voluntarului, resetare și activarea personalului. Verificarea voluntarului stabilește parola inițială și consumă tokenul în aceeași tranzacție cu activarea. Aprobarea voluntarului este separată. Confirmările reușite răspund cu HTTP 204.
- **Logout:** `POST /identity/logout` necesită aceeași dovadă CSRF. Sesiunea este opțională. Dacă sesiunea indicată există, backendul o revocă, iar răspunsul HTTP 204 expiră cookie-ul de sesiune, inclusiv când sesiunea lipsește, a expirat sau a fost deja revocată. Originea sau dovada CSRF invalidă primește HTTP 403.
- **Consumers:** [Teste HTTP sintetice](../../backend/test/identity.integration.test.js) și [proba manuală locală](../../README.md#testare-locală-cu-resend). Clientul de produs va folosi schema OpenAPI.
- **Evidence:** [Planul de identitate](plans/identitate-si-acces.md), D-020–D-030 și aprobarea remedierilor din [PR #3](https://github.com/Spanu1629/platforma-voluntariat/pull/3).

## Consumed
No provider interfaces have been identified.

## External
## C-003 · Livrarea tranzacțională prin Resend
- **Status:** approved
- **Confirmed:** 2026-11-25
- **Interface:** Resend `POST https://api.resend.com/emails` prin HTTPS, cu autentificare Bearer, expeditor verificat și header `Idempotency-Key`.
- **Guarantee:** Reluările unui job folosesc aceeași cheie și același link. Backend-ul se bazează pe fereastra de 24 de ore documentată de furnizor și oprește reluarea când linkul expiră. Un rezultat ambiguu rămas după termenul linkului trece în starea `REVIEW`. Aplicația aplică separat consumul unic al acțiunii în PostgreSQL.
- **Consumers:** [Adaptor și worker](../../backend/src/identity/identity-mail.ts).
- **Evidence:** D-028, [API Resend](https://resend.com/docs/api-reference/emails/send-email) și [cheile de idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
