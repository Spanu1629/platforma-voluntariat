# Securitatea dependențelor backend

## GHSA-7589-6fvf-x4pw · Effect prin configurația Prisma

Verificare din 2026-11-20 pe ramura `feat/identity-access`.

| Pachet | Înainte | După |
|---|---:|---:|
| `prisma`, `@prisma/config`, `@prisma/client`, `@prisma/adapter-pg` | 7.10.1 | 7.10.1 |
| `effect` | 3.20.0 | 3.22.1 |

`npm explain effect` arată lanțul `prisma → @prisma/config → effect`.
`@prisma/client` declară și o dependență peer opțională de `prisma`.
Effect 3.22.1 este prima versiune corectată pentru aviz. [Avizul Effect](https://github.com/Effect-TS/effect/security/advisories/GHSA-7589-6fvf-x4pw)

### Expunerea în VolunTrack

Avizul privește un refuz de serviciu prin validarea de intrări neîncrezătoare
cu anumite scheme `Schema.TemplateLiteral`. Revizuirea surselor NestJS și a
runtime-ului Prisma Client nu a identificat o rută HTTP care trimite date
către acel API. `prisma.config.ts` folosește modulul de configurare al CLI-ului
pentru fișierele și variabilele de mediu ale buildului și migrărilor.
La inițializarea imaginii backend înainte și după actualizare, aplicația a
încărcat runtime-ul Prisma Client, iar Effect și `@prisma/config` au rămas
neîncărcate, deși erau instalate în imagine.

### Remediere și rezultate

La data verificării, Prisma 7.10.1 era ultima versiune stabilă din seria 7.
Manifestul backend fixează temporar Effect 3.22.1 numai sub
`@prisma/config@7.10.1`, printr-un override npm. Lockfile-ul schimbă doar
rezoluția Effect. La o actualizare Prisma care include o rezoluție corectată
pentru Effect, elimină override-ul după validarea instalării, migrărilor și
auditului. [Prisma 7.10.1](https://github.com/prisma/orm/releases/tag/7.10.1) · [Override-uri npm](https://docs.npmjs.com/cli/configuring-npm/package-json/#overrides)

- Instalarea curată și buildul în Docker cu Node.js 24 au trecut. Imaginea de
  producție conține Effect 3.22.1.
- Toate cele 22 de teste cu PostgreSQL izolat și scenariile de readiness au
  trecut. Prisma nu a găsit diferențe între schemă și migrații.
- `npm audit --omit=dev` raportează zero vulnerabilități. Auditul complet
  mai indică 18 intrări moderate preexistente în arborele de test, asociate
  avizelor pentru `glob` și `minimatch`. GHSA-7589-6fvf-x4pw a dispărut
  din ambele audituri.

[Q-019](../agents/questions/identitate-si-acces.md#q-019--cum-remediem-avertismentul-din-dependența-prisma)
