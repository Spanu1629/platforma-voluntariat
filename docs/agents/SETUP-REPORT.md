# Graffino setup report — 2026-11-06

## Scope
Base setup v1, release 1.4.0, with both original Claude and Codex integrations.
The project began empty, on unborn `main`, without a remote or commits.
The user explicitly authorized skipping the inapplicable initial Git synchronization step.
No application, architecture, technology stack or business workflow was implemented.

## Files created
| Path | Purpose |
|---|---|
| `AGENTS.md` | Original working rules, separate Codex block and repository facts |
| `CLAUDE.md` | Imports AGENTS.md |
| `CONTEXT.md` | Thirteen domain terms, grounded in the supplied scope |
| `.gitignore` | Shares skills and roles; ignores local settings, credentials and worktrees |
| `.claude/skills/plan/SKILL.md` | Original visual plan workflow |
| `.claude/skills/build/SKILL.md` | Original visual build workflow |
| `.claude/agents/planner.md` | Original planner role |
| `.claude/agents/builder.md` | Original builder role |
| `.agents/skills/plan/SKILL.md` | Codex plan workflow |
| `.agents/skills/build/SKILL.md` | Codex build workflow |
| `.codex/agents/planner.toml` | Codex planner role |
| `.codex/agents/builder.toml` | Codex builder role |
| `docs/agents/CODEX.md` | Existing compatibility layer, including Figma review mapping |
| `docs/agents/PROJECT-BRIEF.md` | User-supplied purpose, scope, constraints and setup choices |
| `docs/agents/DECISIONS.md` | Two explicit user constraints |
| `docs/agents/PATTERNS.md` | Empty live pattern ledger |
| `docs/agents/DECISIONS-SUPERSEDED.md` | Superseded decision archive |
| `docs/agents/PATTERNS-SUPERSEDED.md` | Superseded pattern archive |
| `docs/agents/OPEN-QUESTIONS.md` | Nine unresolved choices |
| `docs/agents/CONTRACTS.md` | Empty provided, consumed and external interface sections |
| `docs/agents/ARCHITECTURE.md` | Current empty state; no invented architecture |
| `docs/agents/README.md` | Human guide with Claude and Codex invocation tables |
| `docs/agents/REJECTED.md` | Empty rejected-finding record |
| `docs/agents/tools/ledger-lint.py` | Unchanged template checker |
| `docs/agents/SETUP-REPORT.md` | This report and verification limits |
| `docs/design/DESIGN.md` | Original design guardrails; token tables remain empty |
| `docs/design/CODEX.md` | Codex design companion and separate Figma review record |
| `docs/design/registry.yaml` | Empty registry; no implemented screens exist |
| `docs/design/mocks/.gitkeep` | Preserves the empty mock directory |
| `docs/design/screens/.gitkeep` | Preserves the empty screenshot directory |

All files are new. No existing project content was overwritten or merged.
Protected Codex paths required filesystem approval; installation succeeded after approval.

## Ledger
Two approved decisions, zero patterns, zero contracts, nine open questions.
The decisions record explicit user instructions, not inferred architecture choices.

- D-001: Backend services and databases run in Docker, as required by the laboratory.
- D-002: Confirm exact business rules and requirements with the partner before implementing dependent behavior.
- Q-001: Technology and architecture.
- Q-002: Partner workflows and business rules.
- Q-003: Installation, run, build, test and quality commands.
- Q-004: Deployment, versioning and releases.
- Q-005: Visual tokens and supported viewport sizes.
- Q-006: Initial screens and shared components.
- Q-007: Rendering and screenshot procedure.
- Q-008: Figma review destination.
- Q-009: Partner dataset structure and handling requirements.

## Backfill and memory
Backfill was inapplicable: there was no application code or history to mine.
No clashes were found; no temporary review page was needed.
The exact repository's Claude memory directory was absent.
No memory facts were moved, removed or dropped as stale.
No stale documentation existed; no documentation fixes were needed.

## Visual setup
Responsive desktop and mobile web interfaces are planned.
There is no token source, CSS, theme, mock, screen or shared component yet.
Token tables are empty; DS entries: zero; hard-coded visual value findings: zero.
No screenshot command was invented; Q-007 blocks visual verification until tooling is chosen.
Figma review remains a separate destination in the Codex companion.
No Figma URL or team/project was supplied at setup; Q-008 remains open.
No file creation, publication, inspection or design approval occurred.

## Checks and limitations
- Both ledger commands in AGENTS.md were run and passed, including the final check after evidence corrections.
- The first integration check failed: the approved copy placed Codex files one directory above their required destinations.
- A second approved operation corrected those paths; the complete static validation then passed.
- Python parsed the Codex role TOML and all four skill frontmatter documents.
- Claude role frontmatter parsed; role and skill names are unique within each integration.
- Original visual skills and roles, Codex roles and skills, compatibility layer and checker match their templates.
- Destination references required by the base integration exist.
- Placeholder scan found no unfilled values in generated documents, skills or roles.
- Nonvisual reductions do not apply: this is a visual application.
- `git check-ignore -v` produced no output for all eight shared skill and role files.
- Ignore checks confirmed local settings, AWS credentials and both agent worktree paths remain ignored.
- Git status showed only the thirty setup files listed above.
- Runtime discovery of installed Codex skills and named roles after trust/reload is **unverified**.
- No nested Codex session was started and no user-level configuration was changed.
- Parallel builder worktree isolation is **unverified**; it was not needed during setup.
- Figma creation, session, HTML import, editing and screenshot tools are exposed in this session.
- Their authentication, permissions, mandatory guidance, reviewer access and rendering fidelity are **untested**.
- Targeted frame removal and unattended approval retrieval retain the compatibility layer's blocked status.
- Explicit chat approval of a visually verified linked revision remains required before UI implementation.
- Claude design publication and all other external integrations were not exercised.
- Install, build, run, test, lint/type-check, screenshot and release commands were not run: no application exists.
- Initial fetch/pull attempts failed on read-only Git metadata; synchronization was then explicitly waived as inapplicable.
- `codex --help` ran, with a warning that PATH aliases could not be created on the read-only filesystem.
- Historical inspection confirmed there were no commits; no release tags or merged PRs exist to inspect.

Static validation does not prove runtime discovery or end-to-end design publication equivalence.

## Addons and commit gate
Team: declined. ClickUp: declined. Slack: declined.
No addon settings, runners, secrets or automation variables are required.
No notifications were sent and no external data was changed.
At the initial report, no commit, branch creation, merge, push, tag or release had occurred.
The user subsequently approved the original local commit and merge workflow.
Approved bootstrap: create an empty initial commit on `main` to provide the branch base.
Approved setup branch: `chore/agentic-code-setup`.
Approved setup commit: `chore(agents): Graffino agentic code setup v1`.
Approved trailer: `Co-authored-by: Codex <noreply@openai.com>`.
Merge the setup branch into `main` locally with `--no-ff`.
Verify completion through Git history and status. Do not create a GitHub repository or push.
