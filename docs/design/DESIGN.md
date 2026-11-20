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
- The page fits the viewport at every supported width. On mobile, horizontal scrolling
  is confined to eligible card collections. Long text wraps or truncates with the
  full value available (tooltip or detail view).

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
- Token source: the tables below. Application code has yet to be created.

The project owner approved the tokens and reference viewports on 2026-11-18
under [Q-005](../agents/OPEN-QUESTIONS.md#q-005--what-visual-tokens-and-supported-viewport-sizes-should-the-application-use).

## Tokens

### Color
| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FAF6ED` | `#171D19` | Page background |
| `surface` | `#FFFCF7` | `#202821` | Cards, forms and dialogs |
| `surface-subtle` | `#F0E8DB` | `#2A342D` | Secondary groups and disabled controls |
| `section-background` | `#F4EADB` | `var(--background)` (`#171D19`) | Card collection sections and their decorative transitions |
| `text` | `#272820` | `#F5EEE2` | Main text |
| `text-muted` | `#5D6055` | `#C6C8BC` | Secondary text |
| `border` | `#827A6D` | `#8A9588` | Field and control outlines |
| `primary` | `#214B3E` | `#A7C9AF` | Primary actions |
| `primary-hover` | `#193E32` | `#B8D5BF` | Primary action on hover |
| `primary-active` | `#123126` | `#8DB59A` | Primary action while pressed |
| `on-primary` | `#FFFCF7` | `#11251C` | Text on all three primary action states |
| `accent` | `#A44B35` | `#EF9F83` | Underlined links |
| `focus` | `accent` | `accent` | Keyboard focus ring |
| `success` | `#286044` | `#A4D6AF` | Success text and icon |
| `warning` | `#785317` | `#F2C880` | Warning text and icon |
| `danger` | `#A12F37` | `#FFA3A9` | Error text and icon |

Across `background`, `surface`, `surface-subtle` and `section-background`, the text,
link and status colors have a minimum contrast of 4.75:1 in light and 6.12:1 in
dark. Field borders reach 3.49:1 and 4.14:1 respectively. `on-primary` reaches
9.59:1 and 7.06:1 across default, hover and active. Use the surrounding surface
color in the focus ring gap so the ring has the expected contrast.

Use `section-background` for bands that group cards in current and future mocks,
including the decorative transition on either side. Use `surface` for cards and
`surface-subtle` for secondary elements within them. In light mode, the card and
section fills have a 1.16:1 contrast ratio. On the section background, muted text
has 5.39:1, the focus color has 4.85:1 and the control border has 3.56:1.

### Typography
| Token | Family | Size / line height | Weight | Use |
|---|---|---|---|---|
| `type-page-title` | Fraunces | 32 / 40 px | 600 | One page title |
| `type-section-title` | Fraunces | 24 / 32 px | 600 | Section headings |
| `type-card-title` | DM Sans | 20 / 28 px | 600 | Card headings |
| `type-body` | DM Sans | 16 / 24 px | 400 | Body text |
| `type-label` | DM Sans | 14 / 20 px | 500–600 | Labels and controls |

Use the Latin Extended subsets for Romanian diacritics.

### Spacing
| Token | Value |
|---|---|
| `space-4` | 4 px |
| `space-8` | 8 px |
| `space-12` | 12 px |
| `space-16` | 16 px |
| `space-24` | 24 px |
| `space-32` | 32 px |
| `space-48` | 48 px |
| `space-64` | 64 px |

Page margins use `space-16` on mobile and `space-32` on desktop.

### Radius, shadow, motion
| Token | Value | Use |
|---|---|---|
| `radius-control` | 8 px | Buttons and fields |
| `radius-card` | 12 px | Cards |
| `radius-dialog` | 16 px | Dialogs |
| `focus-width` | 2 px | Visible keyboard focus ring |
| `focus-gap` | 2 px | Gap between the control and focus ring |
| `motion-control` | 120 ms | Control transitions |
| `motion-panel` | 180 ms | Panel transitions |
| `motion-reduced` | 0 ms | Transitions with reduced motion |

### Breakpoints / window sizes
| Name | Min | Max |
|---|---|---|
| Mobile | 320 px | 767 px |
| Tablet | 768 px | 1023 px |
| Desktop | 1024 px | — |

Use one column for page sections on mobile, add columns on tablet where the
content fits and use side-by-side panels on desktop. Wrap dense list rows across
multiple lines at narrow widths. The reference viewports for visual checks in
both themes are **320 × 720 px** and **1440 × 900 px**.

At 320–767 px, use a horizontal carousel for two or more same-type cards that
can be browsed independently. Keep time-sensitive actions, comparisons, ordered
instructions and operational lists in the page flow. Keep each active card
readable, show part of the next card where one exists and snap to card edges.
Provide a position indicator and accessible previous and next buttons, native
touch scrolling and keyboard navigation. Keep all existing actions and content
reachable. A single card fills the available width without carousel controls.
From 768 px, use the screen's tablet or desktop layout.

In DS-005, group upcoming cards by day before applying this rule. Keep the
current shift, active offers, any day with a pending assignment or blocked
check-in, and the attendance history vertical.

## Component inventory

The project owner approved the inventory on 2026-11-18 under
[Q-006](../agents/OPEN-QUESTIONS.md#q-006--which-screens-and-shared-components-should-be-designed-first).

| Component | Use |
|---|---|
| Role-based navigation | Show the destinations available to volunteers, coordinators or administrators |
| Buttons, fields and selectors | Use the same labels, action hierarchy and focus treatment across forms |
| Event and shift cards | Group the name, time and available action on narrow screens |
| Lists and tables with filters | Scan and filter registrations, attendance and related records |
| Status labels and inline messages | Explain the current state and next action using text and an icon |
| Confirmation dialogs | Confirm actions such as cancelling a shift |
| Position and availability | Show a shift role's availability and the relevant registration or waiting-list action in DS-004 |
| Offer and deadline | Show the offer's deadline and acceptance or refusal actions in DS-005 |
| Attendance panel | Support the QR workflow and show on-site confirmation, when enabled, in DS-005 and DS-010 |

The first mocks cover DS-004, DS-005 and DS-010 in that order. [Screen inventory](registry.yaml)

## Hard-coded values found (to migrate)
| path:line | Value | Should be |
|---|---|---|
