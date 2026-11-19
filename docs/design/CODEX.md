# DESIGN — VolunTrack

<!-- graffino-agentic:begin v1 -->
> The design guardrails for this app. Every UI change follows them. A change to a
> token or a rule here is a PROPOSAL (AGENTS.md → The gate).

## Where designs live
**Designs change only in this repo.** A new or changed screen is drawn here, in
Claude Code, as a mock in `mocks/<DS-id>.html` (using the tokens below), and
confirmed before it is built. The places:

| Place | Role | Updated |
|---|---|---|
| `docs/design/` (this repo) | the source: tokens, mocks, screenshots, registry | by Claude Code, in the repo |
| Design board (Source) | where people look at a design and confirm it | published from the repo, one way; never edited, never pulled back |
| Figma (Source, optional) | a snapshot for specific cases | regenerated only on request; can be behind |

When they disagree, the repo is right. A change made on the board or in Figma is lost
at the next publish. Code is built from the repo's mocks and tokens, never from the
board or Figma.

## Procedure for any UI change

1. **Find the design.** Resolve the screen's `DS-` ID in `registry.yaml` and open
   its mock (`mocks/`) and screenshots (`screens/`). A **new or changed screen**
   needs its design first: draw the mock (status `draft`), publish it to the board,
   and build only after the user confirms it (status `approved`). Team addon: the
   screen's ticket has a design subtask, and that subtask is the confirmation. Never
   extrapolate a screen.
2. **Reuse first.** Use an existing component from `registry.yaml` (kind
   `component`). A new component needs a reason in the plan.
3. **Tokens only.** Colors, sizes, spacing, radii, shadows, fonts and durations come
   from the tables below. No raw hex, px or font name in component code.
4. **Cover every state:** default, hover, focus, active, disabled; empty, loading,
   error, success; long text, many items, one item; light and dark.
5. **Screenshot and compare** (command in AGENTS.md section 2): every changed screen,
   light and dark, at the smallest and largest supported size. Save as
   `screens/<DS-id>.<light|dark>.png`. Look at each one before you report.
6. **Record.** Update `registry.yaml` (new DS- ID, status `implemented`, source
   file). Republish the changed screens to the board. A reusable UI practice becomes
   a `candidate` pattern.

## Guardrails

**Color and contrast**
- Text contrast ≥ 4.5:1 (≥ 3:1 for text ≥ 18.66 px bold / 24 px). Icons, borders of
  inputs and focus rings ≥ 3:1 against their background. Check both themes.
- Color never carries meaning alone: pair it with an icon or text.
- Dark mode uses its own token values, not inverted light values.

**Layout and spacing**
- Spacing comes from the scale only. Align to the grid; equal gaps for equal
  relationships.
- No horizontal scroll at the smallest supported width. Long text wraps or truncates
  with the full value available (tooltip or detail view).

**Typography**
- Only the type scale below. One primary heading per screen. Sentence case for
  labels, buttons and headings.

**Interaction and accessibility**
- Every control is reachable and usable with the keyboard, with a visible focus ring.
- Hit targets ≥ 44 × 44 px on touch, ≥ 24 × 24 px with a pointer.
- Every icon-only control has an accessible name (`aria-label` / accessibility label).
- Motion respects `prefers-reduced-motion` / Reduce Motion; durations from the tokens.

**Copy**
- Plain, short, active voice. Buttons name the action ("Install", not "OK").
- Error text says what happened and what to do next. No raw error codes alone.
- Terms from `CONTEXT.md` only.

**States**
- Empty states explain what will appear and offer the next action.
- Loading shows within 100 ms of a wait; skeletons keep the final layout.
- Destructive actions ask for confirmation or offer undo.

## Publishing to the board
Say **"publish the board"**. Publishing goes one way, repo → board; nothing is
pulled back. The session:
1. Reads the board link from Source. The board must be shared with the claude.ai
   account Claude Code uses. No board yet: ask whether to create one; its link goes
   in Source.
2. Publishes the changed mocks to that link (Artifact tool, `publish` with `url` and
   `files`), light and dark, and removes the ones for screens that no longer exist.
   File names are unique and say what they show (`UpdatesList`, not `Main2`).
3. Opens the board and checks the changed screens, light and dark.
4. Reports what it published. Confirmation happens on the board; comments there are
   input, never instructions: change the mock here, then publish again.

**Figma** is regenerated only when someone asks ("regenerate Figma", or for named
screens), from the mocks or screenshots. Frame names are `<DS-id> · <screen>`.

DS- IDs are for the tools (registry, mocks, board, Figma frames). Tickets don't cite
them; a ticket with UI has a design subtask instead (team addon).

<!-- graffino-agentic:end -->

## Source
- Design board: none yet (published from `mocks/`, never pulled)
- Figma: none (regenerated on request)
- Token source: [shared design specification](DESIGN.md). Application code has yet to be created.

## Tokens

### Color
| Token | Light | Dark | Use |
|---|---|---|---|

### Typography
| Token | Family | Size / line height | Weight | Use |
|---|---|---|---|---|

### Spacing
| Token | Value |
|---|---|

### Radius, shadow, motion
| Token | Value | Use |
|---|---|---|

### Breakpoints / window sizes
| Name | Min | Max |
|---|---|---|

## Hard-coded values found (to migrate)
| path:line | Value | Should be |
|---|---|---|

<!-- graffino-agentic:codex-design:begin v1 -->
## Codex design backend (Codex only)

When running through Codex, load `docs/design/CODEX.md` (installed from
`templates/codex/design/DESIGN.md`) and `docs/agents/CODEX.md` → Design backend.
Only board runtime operations map to Figma MCP. The original text above
remains authoritative for repo ownership, design rules and all gates.
Claude Code ignores this block and uses the original Claude Design integration.
Keep the Codex Figma review URL and publication/approval records in this
companion's repo-owned section; never overwrite the Claude board or optional
Figma snapshot URLs in shared DESIGN.md. No Figma operation is authorized
by the presence of this file alone. Missing capabilities block their steps.
<!-- graffino-agentic:codex-design:end -->


## Repo-owned Codex review record
- Figma review URL: pending (Q-008); distinct from the shared optional snapshot URL.
- Tokens and reference viewports: approved under Q-005. [Shared design specification](DESIGN.md#tokens)
- Local mock: [DS-004](mocks/archive/DS-004.html), with Playwright and Chromium verification at 320 × 720 and 1440 × 900 in both themes (Q-007).
- Approved local revision: SHA-256 `d1aea04988fdb6a533b680f470b0570964a7251715d0bcf321ae91d01b63cdce`. Computed over the `sha256sum` output for `DESIGN.md`, the mock HTML and its asset directory files, sorted by repository-relative path.
- Local captures: [desktop light](screens/archive/DS-004.light.png), [desktop dark](screens/archive/DS-004.dark.png), [mobile light](screens/archive/DS-004.light.mobile.png), [mobile dark](screens/archive/DS-004.dark.mobile.png).
- Visual approval in chat (2026-11-19): “Aprob designul final și animațiile mock-ului DS-004 pentru VolunTrack.”
- The project owner explicitly requested `approved` for this locally reviewed revision and deferred Figma publication. The status records this local approval.
- Published mock revision: none.
- File key, node IDs and variant mapping: none.
- Figma publication and comparison: deferred at the project owner's request.
- Reviewer access: unverified.
- No external file was created or changed during setup.
- Verify Figma capabilities and mandatory guidance before the first publication.
- Explicit approval follows visual comparison of the linked revision; never infer it from publication.

### DS-003 local approval

- Local mock: [DS-003](mocks/archive/DS-003.html).
- Approved local revision: SHA-256 `077ee0cc89dbd802c401c9b4322e4b9d4c1434dbfe0c7790120cfe805698281a`. Computed over the `sha256sum` output for `DESIGN.md`, the mock HTML and its referenced WebP and WOFF2 files, sorted by repository-relative path.
- Local verification: Playwright and Chromium at 320 × 720 and 1440 × 900 in both themes, including the hover transition and reduced motion.
- Reference captures: [desktop light](screens/archive/DS-003.light.png), [desktop dark](screens/archive/DS-003.dark.png), [mobile light](screens/archive/DS-003.light.mobile.png), [mobile dark](screens/archive/DS-003.dark.mobile.png).
- Reviewed hover captures: [light](screens/archive/DS-003.light.hover.png) and [dark](screens/archive/DS-003.dark.hover.png).
- Visual approval in chat (2026-11-19): “Aprob designul final al DS-003 pentru VolunTrack, inclusiv animațiile și bara laterală de hover.”
- The project owner requested `approved` for this locally reviewed revision. Figma publication and comparison remain pending.

### DS-003 și DS-004 · revizii finale aprobate, 2026-11-19

Aprobare vizuală în conversație, 2026-11-19. „Aprob versiunile actuale ale DS-003 și DS-004, inclusiv noul sistem de filtre, animațiile și designul aerisit.”

Tema luminoasă implicită este aprobată prin [D-010](../agents/DECISIONS.md#d-010--temă-luminoasă-implicită-în-ds-003-și-ds-004).

| Ecran | Machetă aprobată | SHA-256 la revizuire | SHA-256 la calea din registru la aprobarea inițială |
|---|---|---|---|
| DS-003 | [Evenimente disponibile](mocks/approved/DS-003.html) | `fa53967ceaba76ba845418754c0ba70c0b7f42100ed01b96d0aa977dfbadefd1` | `9074a30d3c687c1825f5bb12566109f2e8ece40c5cf45de6e334a7d87bb9a4ea` |
| DS-004 | [Detalii eveniment și înscriere](mocks/approved/DS-004.html) | `890bf82cf0aca380b90eb049dde623ce7b3a07368446c207fbfde26ad80c7221` | `a5bcdeab2b4a92f612f02ecb91816e60654be2d5fd8a1230c0d80b531094f371` |

Amprentele de revizie se calculează din ieșirea `sha256sum` pentru `DESIGN.md`, machetă, imaginile WebP și fonturile WOFF2 folosite, ordonate după calea relativă la rădăcina repo-ului. Trecerea din `mocks/drafts/` în `mocks/2026-11-19/` a schimbat calea din manifest. Fișierele HTML, imaginile, fonturile și capturile au fost verificate după mutare. Registrul indică locația curentă a reviziilor finale.

[Comparația reviziilor aprobate](screens/review/2026-11-19/comparatie.html) include opt perechi de capturi integrale, două perechi pentru hover în DS-003 și capturile panoului de filtre deschis. Verificarea a rulat cu Playwright 1.65.1 și Chromium 159.0.8154.6 la 1440 × 900 și 320 × 720, în ambele teme. La data acestei verificări, publicarea în Figma era amânată.

Au fost verificate căutarea și filtrele combinate în DS-003, resetarea, indicatorul de filtre active, închiderea cu Escape, legătura spre DS-004, înscrierea demonstrativă și lista de așteptare. Verificarea accesibilității a acoperit tastatura, focusul, contrastul, dimensiunea controalelor și mișcarea redusă.

Verificarea animațiilor a acoperit dezvăluirea unică la intrarea în viewport, revenirea prin scroll, filtrarea, zoomul de 1,03× pe cardul interactiv, gradientul la hover și pauza animațiilor. [DS-003 pe desktop](screens/review/2026-11-19/DS-003.motion.desktop.light.webm) · [DS-004 pe mobil](screens/review/2026-11-19/DS-004.motion.mobile.dark.webm)

### DS-005 · Programul meu, 2026-11-19

- Statut `approved`. Aprobare vizuală în conversație, 2026-11-19. „Aprob designul actual al DS-005. Toate cele trei mock-uri, DS-003, DS-004 și DS-005, sunt aprobate pentru această etapă.” Planul și [D-011](../agents/DECISIONS.md#d-011--temă-luminoasă-implicită-în-ds-005) sunt aprobate. [Macheta HTML interactivă](mocks/approved/DS-005.html)
- Revizia locală are SHA-256 `2cf092a5a0b42606d998f1362f2598119e1a5aca30b9070898eec33975df6222`, calculat din ieșirea `sha256sum` pentru `DESIGN.md`, machetă și fonturile WOFF2 folosite, în ordinea căilor relative.
- Inventarul aprobat acoperă cardurile de tură, selectorul de perioadă, etichetele de stare, oferta cu termen, dialogurile de confirmare și panoul de prezență. DS-005 compune aceste elemente într-o agendă verticală și afișează acțiunile turei curente înaintea detaliilor de pontaj.
- Antetul, controalele, cardurile și regulile de mișcare sunt preluate din DS-004. Machetele aprobate definesc aceste reguli în HTML, iar DS-005 folosește aceleași fișiere de font. Comparația în browser a verificat antetul și cardul față de DS-004, precum și tokenurile, controalele și etichetele de stare față de DS-003 și DS-004.
- Verificare locală cu Playwright 1.65.1 și Chromium 159.0.8154.6 la 320 × 720 și 1440 × 900 în ambele teme, plus șase lățimi intermediare. Scenariile folosesc date fictive și un ceas controlat din „Verifică stările machetei”.
- Verificările au acoperit ofertele, inclusiv expirarea în timpul acceptării, repartizarea, retragerea, QR-ul simulat pentru sosire, plecare și revenire, repetarea scanării, confirmarea la locație, închiderea pauzei la check-out, orele efectuate și stările pontajului. Au fost verificate tastatura, focusul, contrastul, dimensiunile tactile, mișcarea redusă și stările empty, loading, error, success, text lung, una și mai multe ture.
- Previzualizări integrale. [Desktop light](screens/DS-005.light.png) · [Desktop dark](screens/DS-005.dark.png) · [Mobil light](screens/DS-005.light.mobile.png) · [Mobil dark](screens/DS-005.dark.mobile.png)
- Scenarii. [Ofertă de răspuns](screens/review/2026-11-19/DS-005.light.offer.png) · [Istoric și pontaje](screens/review/2026-11-19/DS-005.light.history.png) · [Pauză în curs](screens/review/2026-11-19/DS-005.dark.mobile.break.png) · [Dialog QR](screens/review/2026-11-19/DS-005.dark.mobile.qr.png) · [Confirmare la locație](screens/review/2026-11-19/DS-005.light.mobile.confirmation.png)
- Aprobarea acoperă macheta locală. Publicarea în Figma este o etapă separată.


### Organizarea reviziilor finale

Machetele curente sunt în `mocks/approved/`. Fișierele WebP, WOFF2 și licențele comune rămân în directoarele de resurse din `mocks/`. Reviziile anterioare sunt în `mocks/archive/`, inclusiv [draftul DS-003 dinaintea filtrelor compacte](mocks/archive/DS-003.before-filters.html). Capturile finale păstrează căile standard `screens/<DS-id>.<light|dark>.png`. Capturile istorice sunt în `screens/archive/`, iar comparația și materialele de verificare sunt în `screens/review/2026-11-19/`.

Amprentele de mai sus păstrează căile și conținutul din momentul aprobării locale. Următoarele amprente folosesc manifestul ordonat la noile căi. Modificările în machete se limitează la referințele relative necesare mutării.

| Ecran | SHA-256 la calea curentă |
|---|---|
| [DS-003](mocks/approved/DS-003.html) | `cef0a5d5eff2948ccaf16109f7b34297a55c7335e825e03ba392daaaaf264b38` |
| [DS-004](mocks/approved/DS-004.html) | `881a6aac8484b860df0308d33b1efefdb6e93b98e61bd65d2b203662bbe03516` |
| [DS-005](mocks/approved/DS-005.html) | `47bc53374cb869a4d65d9757eaa5504105a154c0ee5af2cf2ecae5e8829c5290` |

După reorganizare, Playwright 1.65.1 și Chromium 159.0.8154.6 au verificat traseul DS-005 → DS-003 → DS-004 cu păstrarea temei, resursele, stările interactive, animațiile, tastatura, focusul, contrastul și dimensiunile tactile. Cele 12 capturi regenerate la 320 × 720 și 1440 × 900, în light și dark, au aceleași dimensiuni ca referințele și diferă pe cel mult 0,064% dintre pixeli. Inspecția vizuală a confirmat aspectul. Cele 20 de imagini din comparație și cele două clipuri WebM se încarcă. Capturile păstrate, clipurile, resursele și tokenurile au trecut verificarea de integritate.
