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
- The page fits the viewport at every supported width. Follow the shared layout
  and carousel rules for local scrolling and long text. [Shared rules](DESIGN.md#breakpoints--window-sizes)

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
- Codex review destination, confirmed by the project owner on 2026-11-19 (Q-008). [Existing Figma file](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe)
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

### DS-003 și DS-004 · reviziile aprobate înaintea caruselelor, 2026-11-19

Aprobare vizuală în conversație, 2026-11-19. „Aprob versiunile actuale ale DS-003 și DS-004, inclusiv noul sistem de filtre, animațiile și designul aerisit.”

Tema luminoasă implicită este aprobată prin [D-010](../agents/DECISIONS.md#d-010--temă-luminoasă-implicită-în-ds-003-și-ds-004).

| Ecran | Machetă aprobată | SHA-256 la revizuire | SHA-256 la calea din registru la aprobarea inițială |
|---|---|---|---|
| DS-003 | [Evenimente disponibile](mocks/archive/pre-mobile-carousels/DS-003.html) | `fa53967ceaba76ba845418754c0ba70c0b7f42100ed01b96d0aa977dfbadefd1` | `9074a30d3c687c1825f5bb12566109f2e8ece40c5cf45de6e334a7d87bb9a4ea` |
| DS-004 | [Detalii eveniment și înscriere](mocks/archive/pre-mobile-carousels/DS-004.html) | `890bf82cf0aca380b90eb049dde623ce7b3a07368446c207fbfde26ad80c7221` | `a5bcdeab2b4a92f612f02ecb91816e60654be2d5fd8a1230c0d80b531094f371` |

Amprentele de revizie se calculează din ieșirea `sha256sum` pentru `DESIGN.md`, machetă, imaginile WebP și fonturile WOFF2 folosite, ordonate după calea relativă la rădăcina repo-ului. Trecerea din `mocks/drafts/` în `mocks/2026-11-19/` a schimbat calea din manifest. Fișierele HTML, imaginile, fonturile și capturile au fost verificate după mutare. Registrul indică locația curentă a reviziilor finale.

[Comparația reviziilor aprobate](screens/review/2026-11-19/comparatie.html) include opt perechi de capturi integrale, două perechi pentru hover în DS-003 și capturile panoului de filtre deschis. Verificarea a rulat cu Playwright 1.65.1 și Chromium 159.0.8154.6 la 1440 × 900 și 320 × 720, în ambele teme. La data acestei verificări, publicarea în Figma era amânată.

Au fost verificate căutarea și filtrele combinate în DS-003, resetarea, indicatorul de filtre active, închiderea cu Escape, legătura spre DS-004, înscrierea demonstrativă și lista de așteptare. Verificarea accesibilității a acoperit tastatura, focusul, contrastul, dimensiunea controalelor și mișcarea redusă.

Verificarea animațiilor a acoperit dezvăluirea unică la intrarea în viewport, revenirea prin scroll, filtrarea, zoomul de 1,03× pe cardul interactiv, gradientul la hover și pauza animațiilor. [DS-003 pe desktop](screens/review/2026-11-19/DS-003.motion.desktop.light.webm) · [DS-004 pe mobil](screens/review/2026-11-19/DS-004.motion.mobile.dark.webm)

### DS-005 · Programul meu înaintea caruselelor, 2026-11-19

- Statut `approved`. Aprobare vizuală în conversație, 2026-11-19. „Aprob designul actual al DS-005. Toate cele trei mock-uri, DS-003, DS-004 și DS-005, sunt aprobate pentru această etapă.” Planul și [D-011](../agents/DECISIONS.md#d-011--temă-luminoasă-implicită-în-ds-005) sunt aprobate. [Macheta HTML interactivă](mocks/archive/pre-mobile-carousels/DS-005.html)
- Revizia locală are SHA-256 `2cf092a5a0b42606d998f1362f2598119e1a5aca30b9070898eec33975df6222`, calculat din ieșirea `sha256sum` pentru `DESIGN.md`, machetă și fonturile WOFF2 folosite, în ordinea căilor relative.
- Inventarul aprobat acoperă cardurile de tură, selectorul de perioadă, etichetele de stare, oferta cu termen, dialogurile de confirmare și panoul de prezență. DS-005 compune aceste elemente într-o agendă verticală și afișează acțiunile turei curente înaintea detaliilor de pontaj.
- Antetul, controalele, cardurile și regulile de mișcare sunt preluate din DS-004. Machetele aprobate definesc aceste reguli în HTML, iar DS-005 folosește aceleași fișiere de font. Comparația în browser a verificat antetul și cardul față de DS-004, precum și tokenurile, controalele și etichetele de stare față de DS-003 și DS-004.
- Verificare locală cu Playwright 1.65.1 și Chromium 159.0.8154.6 la 320 × 720 și 1440 × 900 în ambele teme, plus șase lățimi intermediare. Scenariile folosesc date fictive și un ceas controlat din „Verifică stările machetei”.
- Verificările au acoperit ofertele, inclusiv expirarea în timpul acceptării, repartizarea, retragerea, QR-ul simulat pentru sosire, plecare și revenire, repetarea scanării, confirmarea la locație, închiderea pauzei la check-out, orele efectuate și stările pontajului. Au fost verificate tastatura, focusul, contrastul, dimensiunile tactile, mișcarea redusă și stările empty, loading, error, success, text lung, una și mai multe ture.
- Previzualizări integrale. [Desktop light](screens/archive/pre-mobile-carousels/DS-005.light.png) · [Desktop dark](screens/archive/pre-mobile-carousels/DS-005.dark.png) · [Mobil light](screens/archive/pre-mobile-carousels/DS-005.light.mobile.png) · [Mobil dark](screens/archive/pre-mobile-carousels/DS-005.dark.mobile.png)
- Scenarii. [Ofertă de răspuns](screens/review/2026-11-19/DS-005.light.offer.png) · [Istoric și pontaje](screens/review/2026-11-19/DS-005.light.history.png) · [Pauză în curs](screens/review/2026-11-19/DS-005.dark.mobile.break.png) · [Dialog QR](screens/review/2026-11-19/DS-005.dark.mobile.qr.png) · [Confirmare la locație](screens/review/2026-11-19/DS-005.light.mobile.confirmation.png)
- Aprobarea acoperă macheta locală. Publicarea în Figma este o etapă separată.


### Organizarea reviziilor anterioare

Machetele și capturile imediat anterioare caruselelor sunt în subdirectoarele `archive/pre-mobile-carousels/`. Fișierele WebP, WOFF2 și licențele comune rămân în directoarele de resurse din `mocks/`. Reviziile mai vechi sunt în `mocks/archive/`, inclusiv [draftul DS-003 dinaintea filtrelor compacte](mocks/archive/DS-003.before-filters.html). Capturile finale păstrează căile standard `screens/<DS-id>.<light|dark>.png`. Capturile istorice sunt în `screens/archive/`, iar comparația și materialele de verificare sunt în `screens/review/2026-11-19/`.

Amprentele de mai sus păstrează căile și conținutul din momentul aprobării locale. Următoarele amprente folosesc căile din `mocks/approved/` de dinainte de arhivare. La arhivare s-au adaptat doar referințele relative către resurse.

| Ecran | SHA-256 la calea dinainte de arhivare |
|---|---|
| [DS-003](mocks/archive/pre-mobile-carousels/DS-003.html) | `cef0a5d5eff2948ccaf16109f7b34297a55c7335e825e03ba392daaaaf264b38` |
| [DS-004](mocks/archive/pre-mobile-carousels/DS-004.html) | `881a6aac8484b860df0308d33b1efefdb6e93b98e61bd65d2b203662bbe03516` |
| [DS-005](mocks/archive/pre-mobile-carousels/DS-005.html) | `47bc53374cb869a4d65d9757eaa5504105a154c0ee5af2cf2ecae5e8829c5290` |

După reorganizare, Playwright 1.65.1 și Chromium 159.0.8154.6 au verificat traseul DS-005 → DS-003 → DS-004 cu păstrarea temei, resursele, stările interactive, animațiile, tastatura, focusul, contrastul și dimensiunile tactile. Cele 12 capturi regenerate la 320 × 720 și 1440 × 900, în light și dark, au aceleași dimensiuni ca referințele și diferă pe cel mult 0,064% dintre pixeli. Inspecția vizuală a confirmat aspectul. Cele 20 de imagini din comparație și cele două clipuri WebM se încarcă. Capturile păstrate, clipurile, resursele și tokenurile au trecut verificarea de integritate.


### Aplicarea clarificărilor organizatorice în design

Aprobările locale de mai sus consemnează reviziile vizuale descrise în această pagină. Textele și scenariile existente din DS-003, DS-004 și DS-005 păstrează regulile demonstrative de la data review-ului.

Înainte de implementarea fluxurilor, revizuirile viitoare trebuie să alinieze catalogul și detaliile la solicitarea de participare și repartizarea propusă de coordonator. DS-004 demonstrează înscrierea directă din locul liber și intrarea directă pe lista de așteptare. Revizia viitoare trebuie să arate solicitarea la nivel de eveniment și faptul că acceptarea unei propuneri pentru o poziție ocupată înscrie voluntarul eligibil în coada FIFO a combinației exacte rol–tură. DS-005 trebuie să prezinte oferta ca repartizare deja autorizată și să alinieze retragerea la pragul de o oră și validarea pontajelor complete la fluxul automat. Trebuie actualizate și scenariile de instruire fără expirare automată, intervalul dintre ture și pauzele. Revizuirile vor urma procedura de aprobare vizuală. [Brief-ul funcțional](../agents/PROJECT-BRIEF.md) · [Q-014](../agents/OPEN-QUESTIONS.md#q-014--cum-se-leagă-lista-de-așteptare-fifo-de-repartizarea-decisă-de-coordonator)

### Carusele mobile și contrast light · aprobare vizuală locală, 2026-11-19

Aprobare vizuală în conversație, 2026-11-19. „Aprob vizual reviziile DS-003,
DS-004 și DS-005 din commitul `0e05e41`, inclusiv caruselele mobile și noul
fundal crem.”

La cererea responsabilului proiectului, registrul marchează aceste revizii
locale drept `approved`. Machetele promovate sunt identice octet cu octet cu
drafturile din `0e05e41`. Amprentele de mai jos includ căile noi din
`mocks/approved/`. Capturile aprobate au fost mutate la căile standard.
[D-018 și D-019](../agents/DECISIONS.md#d-018--carusele-pentru-colecții-de-carduri-pe-mobil)

| Machetă aprobată | SHA-256 la calea aprobată | Mobil 320 × 720 | Desktop 1440 × 900 |
|---|---|---|---|
| [DS-003](mocks/approved/DS-003.html) | `fed5842e3ed38d7a9720a5a762d834972e0ca92f62572bfb023fd8a0e0fb0fcc` | [Light](screens/DS-003.light.mobile.png) · [Dark](screens/DS-003.dark.mobile.png) | [Light](screens/DS-003.light.png) · [Dark](screens/DS-003.dark.png) |
| [DS-004](mocks/approved/DS-004.html) | `f4707de4e4c7c5d6fc6be4639ab7cd7ce35001ab87944dc3c4a798b340e814ea` | [Light](screens/DS-004.light.mobile.png) · [Dark](screens/DS-004.dark.mobile.png) | [Light](screens/DS-004.light.png) · [Dark](screens/DS-004.dark.png) |
| [DS-005](mocks/approved/DS-005.html) | `e6b36eae58fd92fcfcb8c952ada10dc6152a128999f4518cf1c81f302080861a` | [Light](screens/DS-005.light.mobile.png) · [Dark](screens/DS-005.dark.mobile.png) | [Light](screens/DS-005.light.png) · [Dark](screens/DS-005.dark.png) |

Amprentele folosesc ieșirea `sha256sum` pentru `DESIGN.md`, HTML, CSS și JS
comune și resursele referite, sortate după calea relativă la rădăcina repo-ului.
Capturile integrale folosesc Playwright 1.65.1 și Chromium 159.0.8154.6.

Comparația cu reviziile aprobate recapturate în același browser a găsit aceeași
geometrie la 768, 1024 și 1440 px, în ambele teme. Capturile desktop dark sunt
identice pixel cu pixel. Verificările la 320, 390 și 767 px au acoperit
porțiunea vizibilă a cardului următor, alinierea și lățimea paginii. Verificările
de interacțiune au acoperit swipe emulat, clic, tastatură, focus, filtre și
stările prioritare ale agendei. Cele 12 audituri automate axe-core pentru starea
implicită la lățimile de referință au trecut. Arborele de accesibilitate a fost
inspectat în Chromium.

Capturi de scenariu. [Filtre și focus în DS-003](screens/review/mobile-carousels/DS-003.light.mobile.filters-focus.png) ·
[Focus pe al doilea card DS-004](screens/review/mobile-carousels/DS-004.dark.mobile.focus.png) ·
[Tură curentă și ofertă](screens/review/mobile-carousels/DS-005.light.mobile.current-offer.png) ·
[Oferte multiple](screens/review/mobile-carousels/DS-005.light.mobile.multiple-offers.png) ·
[Istoric vertical](screens/review/mobile-carousels/DS-005.dark.mobile.history.png)

### Pregătirea inițială a importului HTML în Figma

Această secțiune consemnează planul inițial de import HTML. Publicarea finală
a folosit [snapshoturi PNG](#figma--snapshoturi-png-publicate-2026-11-19).

Sursa publicării este revizia locală aprobată din tabel. Destinația de review
este fișierul existent din Q-008, cheia `QAC75bztvLOiXcU7oKRHEe`. Registrul local
consemnează aprobarea repo-ului. Verificarea accesului și rezultatul importului
sunt înregistrate mai jos.
[Destinația de review](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe)

Pentru fiecare ecran, folosește câte un cadru pentru light și dark la
320 × 720 și 1440 × 900. Numește cadrele
`<DS-id> · <ecran> · <temă> · <viewport> · <stare>`.
Stările folosesc scenariile existente din machete și aceleași tokenuri.
Pentru starea implicită sunt pregătite local 12 fișiere HTML autonome, cu
CSS, imagini și fonturi integrate. Randarea fiecăruia în Chromium este
identică pixel cu pixel cu captura aprobată. Acesta este un rezultat local
de verificare, iar cadrele Figma se verifică după import.

| Ecran | Stări de conținut | Stări interactive și prioritare |
|---|---|---|
| DS-003 | `default` (inclusiv mai multe carduri), `single`, `empty`, `loading`, `error`, `long` | Hover pe cardul interactiv, focus și apăsare în navigare, control la limită, filtre deschise și căutare cu rezultate |
| DS-004 | `default`, `single`, `many`, `empty`, `loading`, `error`, `long`, `confirmed`, `queued` | Hover, focus și apăsare pe acțiunea cardului, poziție indisponibilă și acordeon deschis |
| DS-005 | `default`, `single`, `many`, `empty`, `loading`, `error`, `long`, `success` | Hover, focus, apăsare, control la limită, `live-offer`, `multiple-offers`, `history` și dialogul QR |

Pregătește și celelalte stări din DOM-ul randat al machetei, cu CSS, imagini
WebP și fonturi WOFF2 integrate pentru import static. După autorizare, verifică
accesul și capabilitățile pe destinația confirmată, publică variantele și
înregistrează pentru fiecare cadrul, legătura, data și amprenta repo.
Compară capturile Figma cu cele Chromium la aceleași dimensiuni și cere
confirmarea reviziei publicate după inspecție.
[Procedura Codex](../agents/CODEX.md#publish-review-approve-implement-republish)

### Figma · import parțial, blocat la verificare, 2026-11-19

Responsabilul proiectului a autorizat publicarea commitului `08f3704` și a
confirmat că poate deschide fișierul din contul său. Prin conector au fost
verificate citirea structurii, importul HTML și exportul PNG. Cele 12 variante
implicite au fost verificate local la dimensiunile aprobate, inclusiv după
fixarea lățimii în copiile temporare de import.

| Variantă | Cadru Figma | Captură de referință | Captură Figma | Rezultat |
|---|---|---|---|---|
| DS-003 · mobil 320 × 720 · light · implicit | [Pilot `21:2`](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=21-2) | [320 × 1606](screens/DS-003.light.mobile.png) | [320 × 1964](screens/review/mobile-carousels/DS-003.light.mobile.figma-pilot.png) | Respins la comparație |

Importul a făcut vizibile legătura de salt, panoul de filtre, contorul de
filtre cu valoarea zero și controalele din secțiunea demonstrativă închisă.
Exportul include o bandă neagră deasupra antetului și conținutul este deplasat
vertical. Figma raportează pentru nod dimensiunea 320 × 1876, iar exportul
PNG are 320 × 1964.

Instrumentul a adăugat pilotul pe pagina existentă `0:1`, deși răspunsul de
pregătire indica o pagină nouă. Metadatele de nivel superior ale celor 12
cadre preexistente coincid cu inventarul anterior importului. Importul s-a
oprit după pilot. Cadrul rămâne nevalidat ca import HTML.

### Figma · reluarea pilotului DS-003, 2026-11-19

A fost repetată doar varianta DS-003 mobil light implicită din commitul
`08f3704`. Copia HTML pentru import fixează viewportul și păstrează CSS-ul,
imaginile și fonturile. Înainte de serializare, Chromium a măsurat panoul
inert la 0 px cu opacitate 0 și legătura de salt la 40 px deasupra paginii.
Copia exclude aceste elemente, nodurile marcate `hidden` și conținutul din
secțiunile `details` închise. Randarea copiei în Chromium coincide pixel cu
pixel cu referința la dimensiunea de export 320 × 1606. Sursele aprobate
și interacțiunile lor au fost păstrate.

| Variantă | Cadru Figma | Captură de referință | Captură Figma | Rezultat |
|---|---|---|---|---|
| DS-003 · mobil 320 × 720 · light · implicit | [Pilot reluat `22:2`](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=22-2) | [320 × 1606](screens/DS-003.light.mobile.png) | [320 × 1622](screens/review/mobile-carousels/DS-003.light.mobile.figma-pilot-retry.png) | Fidelitate dimensională nevalidată |

Elementele ascunse și banda neagră din primul export au dispărut. În
Chromium, formularul măsoară 44 px, are marginea inferioară de 0 px și
este urmat de un spațiu de 24 px. Importul Figma adaugă în jurul
formularului un grup `:margin` de 60 px. Acesta deplasează rezultatele,
caruselul și conținutul de sub ele cu 16 px față de referință.

Importul a fost direcționat către nodul de test `21:2`, iar conectorul a
adăugat `22:2` la nivelul paginii. Inventarul și metadatele subarborilor
celor 12 cadre preexistente coincid cu cele de dinaintea piloților.
Cele două cadre de test sunt identificabile prin linkurile din evidență.
S-a efectuat o singură reluare și restul variantelor a rămas în așteptare.

### Figma · snapshoturi PNG publicate, 2026-11-19

La alegerea responsabilului proiectului, cele 12 variante implicite aprobate
din `08f3704` au fost publicate ca snapshoturi PNG statice, la dimensiunile
native, pe o pagină separată din fișierul Q-008. Fiecare cadru conține o imagine.
Textul și componentele sunt parte din imagine, iar machetele HTML aprobate din
repo păstrează interacțiunile. [Pagina de snapshoturi](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=23-2)

Pilotul DS-003 mobil light a fost verificat înaintea celorlalte încărcări.
Pentru toate cele 12 cadre, exportul Figma la scară 1× are dimensiunile
referinței și zero pixeli RGBA diferiți. Metadatele paginii preexistente
coincid cu inventarul de dinaintea publicării, inclusiv cele două piloturi HTML.

Confirmare în conversație la 2026-11-19. „Publicarea în Figma este finalizată
și verificată.”

| Variantă | Dimensiuni native | Referință în repo | Cadru Figma |
|---|---|---|---|
| DS-003 · Evenimente disponibile · Mobil · Light | 320 × 1606 | [PNG](screens/DS-003.light.mobile.png) | [23:3](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=23-3) |
| DS-003 · Evenimente disponibile · Mobil · Dark | 320 × 1606 | [PNG](screens/DS-003.dark.mobile.png) | [24:2](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-2) |
| DS-003 · Evenimente disponibile · Desktop · Light | 1440 × 1505 | [PNG](screens/DS-003.light.png) | [24:3](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-3) |
| DS-003 · Evenimente disponibile · Desktop · Dark | 1440 × 1505 | [PNG](screens/DS-003.dark.png) | [24:4](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-4) |
| DS-004 · Detalii eveniment și înscriere · Mobil · Light | 320 × 2400 | [PNG](screens/DS-004.light.mobile.png) | [24:5](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-5) |
| DS-004 · Detalii eveniment și înscriere · Mobil · Dark | 320 × 2400 | [PNG](screens/DS-004.dark.mobile.png) | [24:6](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-6) |
| DS-004 · Detalii eveniment și înscriere · Desktop · Light | 1440 × 1613 | [PNG](screens/DS-004.light.png) | [24:7](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-7) |
| DS-004 · Detalii eveniment și înscriere · Desktop · Dark | 1440 × 1613 | [PNG](screens/DS-004.dark.png) | [24:8](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-8) |
| DS-005 · Programul meu · Mobil · Light | 320 × 1890 | [PNG](screens/DS-005.light.mobile.png) | [24:9](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-9) |
| DS-005 · Programul meu · Mobil · Dark | 320 × 1890 | [PNG](screens/DS-005.dark.mobile.png) | [24:10](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-10) |
| DS-005 · Programul meu · Desktop · Light | 1440 × 2100 | [PNG](screens/DS-005.light.png) | [24:11](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-11) |
| DS-005 · Programul meu · Desktop · Dark | 1440 × 2100 | [PNG](screens/DS-005.dark.png) | [24:12](https://www.figma.com/design/QAC75bztvLOiXcU7oKRHEe?node-id=24-12) |
