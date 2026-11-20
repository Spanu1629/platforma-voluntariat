# AGENTS.md — VolunTrack

<!-- graffino-agentic:begin v1 -->
## How we work here

**Before any work:** `git fetch --all --prune`, then `git pull --ff-only`. Stop on a
non-fast-forward or on uncommitted changes you did not make.

**Always load** (indexes; open the entry, or its topic file, before you rely on it):
`docs/agents/DECISIONS.md`, `docs/agents/PATTERNS.md`,
`docs/agents/CONTRACTS.md`, `docs/agents/OPEN-QUESTIONS.md`, `CONTEXT.md`.

**Load on demand:**

| When | Load |
|---|---|
| You rely on an entry | the entry, or its topic file under `docs/agents/<kind>/` |
| Structural work | `docs/agents/ARCHITECTURE.md` |
| Old code or a past decision needs explaining | `docs/agents/DECISIONS-SUPERSEDED.md`, `PATTERNS-SUPERSEDED.md` (never obeyed) |
| UI work | `docs/design/DESIGN.md`, `docs/design/registry.yaml` |
| Product scope or partner requirements | `docs/agents/PROJECT-BRIEF.md` |
| Setup verification or limitations | `docs/agents/SETUP-REPORT.md` |

**Flow:** a change to more than a few lines, or one with a design choice, starts with
`/plan`. The approved plan runs with `/build`. Small fixes go straight to build, with
tests first where tests exist.

### Git workflow

- `main` is the stable branch and tracks `origin/main`. Get the user's explicit
  approval before merging into it.
- Use one `feat/*` branch per major module. Do its planning, build, tests, design,
  documentation, and fixes on that same branch. Keep small changes on the
  existing module branch.
- Before creating any branch, check the local and remote branches and linked
  worktrees. Ask for the user's explicit approval before creating the branch,
  including when a skill or tool would create it automatically.
- Isolated worktrees are allowed. Use the existing module branch for writes. If
  it is already checked out, use that checkout for writes or a detached worktree
  for read-only work. Create a worker branch only when isolation requires one
  and the user explicitly approves it.
- After a merge, verify that each branch tip to be deleted is included in
  `main`. Check local and remote tips, linked worktrees and unpublished work,
  and open pull requests. Obtain the user's explicit approval before deleting
  local or remote branches. Preserve any branch with unintegrated work.

These repository rules govern branch selection and worktree use in the Graffino
skills. The remaining planning, build, verification, and approval steps apply.

### The gate
Ask yourself: **does this change something already approved?**
- **Do, then report:** add a `candidate` pattern; add or answer an open question
  (only with an answer the user gave); write a `Proposed answer` the evidence
  supports (the question stays `investigating` until the user confirms it); fix a
  typo, link or moved path; code that follows the approved entries.
- **Propose and wait:** change, supersede or delete an `approved` pattern or
  decision; promote `candidate → approved`; add a decision; code that contradicts an
  entry. Use this shape, then stop:

```text
PROPOSAL: <add-decision | change | supersede | promote | delete>
- Existing: <ID and what it says, or "none">
- Proposed: <the new rule>
- Why now: <what changed>
- Impact: <files that follow the old rule>
- If approved: <old ID> → superseded-by <new ID> (kept, not deleted)
```
Before you propose, check `docs/agents/REJECTED.md`: never re-propose a rejected item
without new evidence. A rejected proposal is added there with the reason.

### Hard rules
- Build only from `approved` entries. Unanswered means out of scope: record a Q-,
  never invent a value, a requirement or a behaviour.
- Add nothing nobody asked for. Note it as a suggestion instead.
- Build the smallest change that meets the approved criteria, reusing existing code.
  A new abstraction, dependency, configuration option, extension point or broad
  refactor needs a concrete reason today. Never at the cost of tests or error handling.
- Tests first where the repo has tests. Never change what an existing test asserts
  to make code pass; an assertion you think is wrong goes to the user.
- Never write a secret, token, password or personal data into a file, commit or log.
- Never push, tag, release, or deploy without the user's go for that action.
- When you cite past work, label the intent: **replicate** (only for an `approved`
  pattern) or **for awareness only**. History is not a template.
- The code wins over any document. When they disagree, say so and fix the document.
- Report honestly: a failed check is reported with its output; a skipped step is
  named with its reason.

### Ledger rules
- IDs are one sequence per kind in this repo: `D-`, `PATTERN-`, `C-`, `Q-`. Never renumber.
- A provided contract (C-) lives here only; consumers link to it. Changing one is a
  PROPOSAL, and the plan names the consumer files too.
- Superseded entries stay (`status: superseded-by <ID>`) so old code stays explainable.
  Their index lines live in `DECISIONS-SUPERSEDED.md` / `PATTERNS-SUPERSEDED.md`, not
  in the always-loaded indexes; the lint (`--fix`) moves them.
- After any ledger change: `python3 docs/agents/tools/ledger-lint.py --fix` (next free
  ID: `--next D`). It must pass.
- **Confirmed:** when the user confirms an entry in a plan, set `- **Confirmed:** <date>`
  on it. Any edit to an entry removes its Confirmed line.
- A new reusable practice becomes a `candidate` pattern in the same session.
- A settled constraint becomes a decision PROPOSAL in the same session.
<!-- graffino-agentic:end -->

<!-- graffino-agentic:codex:begin v1 -->
## Codex CLI integration

When running in Codex CLI, always load `docs/agents/CODEX.md` before work.
Use `$plan`, `$build`, and (team addon) `$start` for the original Graffino procedures.
Claude Code continues using `/plan`, `/build`, and `/start`.
Follow the [Git workflow](#git-workflow) for branch selection and worktrees.
The other Graffino steps and approval gates apply.
A mandatory step without its required capability is blocked, never silently skipped.
<!-- graffino-agentic:codex:end -->


## 1. What this repo is
VolunTrack – Platformă web pentru gestionarea voluntarilor și a evenimentelor caritabile
A university web application for a real volunteer organization.
It will support volunteers, coordinators and administrators through responsive interfaces.
Approved project scope is in `docs/agents/PROJECT-BRIEF.md`; partner-specific details follow D-002.

## 2. Stack and commands
The approved stack and architecture are in D-003 and D-005. Docker is required locally and for PostgreSQL integration tests. Managed PostgreSQL is permitted for public deployment under D-009.
The backend uses Node.js 24. Run `npm ci`, `npm run prisma:generate` and `npm run build` from `backend/`. Run `docker compose config --quiet`, `docker compose up -d --build --wait` and `bash backend/test/run-integration.sh` from the repo root. See the [README](README.md#pornirea-backendului) for environment setup and the explicit historical seed command. Frontend and standalone lint commands remain open under Q-003, and release commands under Q-004.
Mock screenshots use Playwright and Chromium for DS-004 at the [reference viewports](docs/design/DESIGN.md#breakpoints--window-sizes). The application screenshot procedure remains open (Q-007).
Ledger check (run during setup):

```bash
python3 docs/agents/tools/ledger-lint.py --fix
python3 docs/agents/tools/ledger-lint.py
```

## 3. Layout
- `backend/`: NestJS and Prisma source, migrations, historical seed and integration tests.
- `compose.yaml`: local PostgreSQL, one-shot migrator and backend.
- `.github/workflows/backend-ci.yml`: backend build and integration checks.
- `.claude/`: Claude plan/build skills and planner/builder roles.
- `.agents/skills/`: Codex plan/build skills.
- `.codex/agents/`: Codex planner/builder roles.
- `docs/agents/`: knowledge ledger, project brief, runtime mapping and setup report.
- `docs/design/`: design rules, Codex companion, registry, mocks and screenshot directories.
- `CONTEXT.md`: project vocabulary.

## 4. Rules for this repo
- Team, ClickUp and Slack addons are declined. No ticket workflow is installed.
- Use the approved scope; confirm requirements attributed to the partner before dependent implementation (D-002).
- Historical aggregates, pilot records and synthetic test data stay separate (D-006).
- The pilot may include adults and eligible minors. The association handles the documents and checks applicable conditions before real minors participate (D-012, D-016, Q-010).
- UI work loads both `docs/design/DESIGN.md` and `docs/design/CODEX.md` in Codex.

## 5. Release
No release configuration exists. See the [Git workflow](#git-workflow) for branch operations.
Release workflow, version source and deployment target remain open (Q-004).
Commit, merge and push require the user's authorization.

## 6. Definition of done
- Applicable commands are defined and run; missing commands remain explicit open questions.
- Ledger lint passes; new practices are candidates and unknowns are Q- entries.
- UI changes follow the original design, approval, screenshot and publication procedure.
- Report blocked or unverified runtime operations explicitly.
