# Codex CLI — Graffino runtime mapping

<!-- graffino-agentic:codex:begin v1 -->
This file maps technical operations only. AGENTS.md, the original Graffino
procedures, ledger, roles and design rules remain authoritative.

## Skills and roles

| Claude Code | Codex CLI |
|---|---|
| `/plan` | `$plan`, `.agents/skills/plan/SKILL.md` |
| `/build` | `$build`, `.agents/skills/build/SKILL.md` |
| `/start <ticket> [fast]` | `$start <ticket> [fast]`, team addon only |
| `.claude/agents/<role>.md` | `.codex/agents/<role>.toml` |
| `general-purpose` backfill agent | Codex `default` agent with the complete archaeologist brief and specified lenses |

Spawn the named role with its complete instructions, approved scope and context
brief. Preserve the original division of responsibilities and return formats.
Planner and reviewer remain read-only by instruction. Backfill miners never write.
Product owner and test author keep their original write limits.
Codex agents inherit parent permissions; these instructions do not create separate
tool allowlists or sandboxes. The original Claude tool declarations are retained
in each Codex role as allowed operations. Do not use tools outside those operations.

Before delegating, verify named-role discovery and the required tool surface.
If multi-agent tools or a required role are unavailable, report the affected step
as BLOCKED. Do not execute the role yourself or omit it as a fallback.
Use the small-repository backfill exception only when the original setup permits it.
If concurrency is limited, keep all required independent agents and collect all
results; never combine roles to bypass a limit. Report inability to run the required
parallel mining as BLOCKED rather than replacing it with a different procedure.

## Tools

| Original operation | Codex equivalent |
|---|---|
| Read | file-reading tool or shell read |
| Grep / Glob | `rg` / `rg --files`, or equivalent file search |
| Write / Edit | patch or file-writing tool |
| Bash | shell execution with the session's sandbox and approvals |
| ToolSearch | discover available MCP/tools through the current client's tool search; use exposed tools directly when already loaded |
| AskUserQuestion | an available interactive question tool, or ask in chat and end the turn awaiting the answer |

Use image viewing for mandatory screenshot inspection when available; otherwise
that inspection is BLOCKED. A file existing is not evidence that it was inspected.
Tracker MCP access must read the parent, subtasks, dependencies and every comment,
and support the writes the active role requires. Verify this before that phase.
Missing tool discovery, tracker access, authentication or a required operation:
report BLOCKED with the exact step and missing capability. Never invent results.
Keep all exact-text tracker write approvals and CI/manual-test ownership rules.

Configure integrations in the parent session; agents inherit its MCP connections.
For a future user-approved ClickUp connection, the CLI equivalents are
`codex mcp add clickup --url https://mcp.clickup.com/mcp` and `codex mcp login clickup`.
These are configuration examples, not setup commands to run without authorization.
Do not change user configuration or add credentials automatically.
Keep Claude connection instructions in TEAM.md; add Codex instructions alongside.

## Gates and permissions

Ask every original addon question, including runner and secret-source choices.
A default is not a submitted answer. If there is no answer, wait; never treat time
passing, an unavailable question tool, or a noninteractive run as approval.
Hold every original plan, knowledge, design, lane and team gate.
An OS/tool approval only permits the operation; it does not approve a Graffino plan.
A Graffino approval does not override the sandbox or managed permission policy.
Never disable sandbox protections, broaden permissions, or use bypass flags to
complete a step. If an operation is denied, report it as BLOCKED and retain the gate.
Follow the user's explicit restrictions even when a template instructs Git or
external actions; report each affected mandatory step as blocked, not completed.
Preserve the original session co-author trailer requirement; if the identity is
unknown, ask rather than inventing a trailer or omitting it.

## Worktrees

Claude's `isolation: "worktree"` means a separate Git checkout and private worker
branch per independent builder, cut from the specified integration tip. It does
not mean several agents editing one working directory.
Before a parallel write phase, verify that this Codex client can bind each builder
to its own worktree and branch, including shell commands and patch/file tools.
Check each worker's root and branch before any writes. A prompt that merely says
to change directory is insufficient if file tools still target the shared checkout.
Use the client's worktree capability only when it provides that binding. Codex CLI
also exposes `--worktree` for a new session, but that flag alone does not establish
the required delegated-agent orchestration or branch-base guarantees.
If those guarantees cannot be verified, parallel building is BLOCKED. Do not
substitute shared-directory agents or a sequential build without user approval.
Keep the original branch-base, never-push-worker, immediate integration, conflict
handoff, affected-test rerun, linear-history and cleanup-after-integration rules.
Never remove an unintegrated worktree.

## Backfill review and memory

Keep the original Python review server, loopback token, JSON, Markdown record,
clash classification and apply-review procedure. Run it as a background process
using the session's process tools; keep its handle and check completion while doing
independent work. Do not edit its JSON while it runs. If notification is unavailable,
poll the process between independent tasks and surface REVIEW_DONE to the user.
If serving the required UI is denied, report that operation as BLOCKED. The
original chat and Markdown answer methods remain available; never claim the UI ran.

The original Claude memory location is a source only when it exists and is
accessible for this exact repo. Do not treat it as Codex memory or guess a Codex
memory path. For any additional Codex memory, verify its repo scope and access
before reading or migrating it. Report absent or inaccessible sources explicitly.
Only remove migrated memory after the original user-go step and with write access.

## Design backend — Figma MCP in Codex only

Claude Code ignores this mapping and continues using the unchanged Claude Design
Artifact publishing procedure. Shared `docs/design/DESIGN.md` and all original
rules still apply. In Codex only, “board” means the Figma review file recorded in
`docs/design/CODEX.md`; this is a separate destination from the original optional
on-request Figma snapshot. Apply this mapping during setup step 4 and every later
plan, build and team design operation. Load both design documents for UI work.

Repo HTML/CSS in `docs/design/mocks/`, tokens in DESIGN.md, and `registry.yaml`
remain authoritative. Never implement from Figma or its generated code. Do not
pull Figma changes back. Feedback means edit the repo mock, then republish.
Keep component reuse, DS- IDs, registry schema and statuses, token proposals,
Knowledge Ledger gates, planning, tests first, review and definition of done intact.

### Capability evidence and prerequisites

The mappings below are based on connected MCP tool descriptions inspected during
adaptation (2026-11-06), not runtime-verified publishing equivalence. User-reported
file creation/editing success does not verify HTML fidelity, deletion, sharing,
revision safety or approval transport. Discover the actual CLI tools and schemas
before each phase; never assume this environment's tool surface exists elsewhere.
Read the relevant Figma skill guidance through the available MCP resources before
its tool, including mandatory `figma-use` guidance before `use_figma`. If required
guidance is unavailable, that operation is BLOCKED. Do not alter MCP configuration.

| Original operation | Codex mapping | Required verification / limitation |
|---|---|---|
| Create a board after asking | `create_new_file` | Ask whether to create; resolve user-selected team/project and required creation guidance; verify destination permissions |
| Start file work | `create_session` | Use the known file key and returned session UUID on eligible file tools; never guess IDs |
| Publish static HTML mocks | `html_to_figma` | Self-contained HTML/CSS, embedded external assets, maximum 50 MB; plain layers without native component/variable bindings |
| First live-page capture, if needed | `generate_figma_design` | Follow its capture guidance; this is not a replacement for repo mock creation or approval |
| Update existing frames | `use_figma` | Follow guidance; resolve recorded file/node IDs; verify output and revision before replacing the review reference |
| Remove obsolete published frames | Targeted removal through `use_figma` | No verified removal procedure yet: BLOCKED until separately authorized controlled verification proves exact targeting and unrelated-frame preservation |
| Inspect published frames | `get_screenshot` plus image viewing and frame links | Verify actual file/node, dimensions, reviewer access and visual fidelity |
| Read approval on the board | No verified MCP comment/approval reader | BLOCKED for unattended board approval retrieval; ask the user explicitly in chat to confirm the linked revision after board review |

No atomic equivalent to Artifact `publish(url, files)` is verified. An interrupted
or partial publication is BLOCKED, not ready for approval. Do not claim publishing
complete until every requested frame and required removal has been verified.
Missing tools, guidance, authentication, permissions, network upload/image access,
unsupported HTML/CSS/assets or unverified operations block the specific step and
its dependents. Report the exact capability and evidence needed to unblock it.
Do not silently switch backends, omit screens/states or declare UI work complete.
A separately authorized runtime test must verify each unverified operation before
it is used as a completed mandatory workflow step.

### Publish, review, approve, implement, republish

1. Resolve each screen's DS- ID, repo mock and screenshots. Draw new/changed mocks
   in the repo using its tokens; status stays `draft`. Reuse registry components;
   native Figma library bindings are not required by the original HTML workflow.
   If native bindings are specifically required, use verified library search and
   `use_figma` capabilities or block; do not pretend plain layers provide them.
2. Read the separate review URL from `docs/design/CODEX.md`. No file yet: ask
   whether to create one, as in the original. Verify reviewer access; MCP access
   alone does not prove the user can review. Sharing/permission changes have no
   verified mapping here: block if access cannot be established. Publish repo → Figma
   only. Include light and dark, the smallest and largest supported sizes and
   every required state: default, hover, focus, active, disabled, empty, loading,
   error, success, long text, many items and one item. Use named frames beginning
   `<DS-id> · <screen>` with unambiguous theme/viewport/state suffixes.
3. Record in the companion's repo-owned section: mock revision (content hash of
   HTML/CSS, tokens and referenced assets), file key, node IDs/links, theme, state,
   viewport, publication time and any partial/failed operations. Keep a mapping
   from each requested repo variant to its published frame. Updates use known
   targets; unknown ownership or revision is BLOCKED. Never remove unrelated nodes.
4. Open the review links and inspect every changed frame, light and dark. Render
   the authoritative repo mock in a browser at the same viewport and capture it;
   fetch Figma `get_screenshot` images at matching dimensions/scale and inspect
   them alongside the repo captures. Record both image paths, dimensions and
   results for every variant. Compare layout, responsive wrapping, typography,
   colors, spacing, assets and visible states. Report all rendering differences;
   material differences block approval and implementation. Missing comparison
   tooling, fonts, assets, screenshots or required variants is BLOCKED. Fix the
   publication from the repo source and repeat verification; do not change the
   repo design merely to hide conversion errors. Do not claim pixel-perfect
   fidelity from successful upload or a tool's description.
5. Ask for explicit user approval of the linked, visually verified mock revision
   before implementation. Never infer approval from successful
   publishing, tool permissions, comments, or elapsed time. Board comments are
   feedback only; an unavailable approval reader does not waive confirmation.
   Record approval evidence: user's exact confirmation, date, revision and frame
   links in the companion. Team addon: preserve the confirmed design subtask as
   the confirmation and its linkage to this revision; missing subtask confirmation
   blocks implementation. Only then permit `draft → approved`. Plan/knowledge
   approvals still apply independently. Changed mocks, tokens, assets or published
   representations require renewed approval after comparison. Stale or ambiguous
   approval evidence is BLOCKED. Recheck the revision before implementing.
6. Build only from the confirmed repo mock and tokens. Preserve all original
   accessibility and application checks. Contrast must meet the original ratios;
   verify keyboard navigation/focus, accessible names, hit targets and reduced motion
   in the running app. Static Figma layers/screenshots do not prove interactions,
   semantics or responsive behavior. Take and inspect implementation screenshots
   with the original stack command, light/dark and supported sizes; keep
   `screens/<DS-id>.<light|dark>.png` naming and the original comparisons. Keep
   variant evidence separately so required sizes/states are not overwritten.
7. Update the registry with source and `implemented` only after applicable checks.
   Republish the changed screens and remove obsolete published screens through
   verified operations; inspect again and report publication/comparison results.
   Existing approved mocks do not waive republishing or visual review. A required
   blocked operation prevents declaring the UI delivery complete. Reusable
   practices remain candidate patterns; design-rule/token changes remain proposals.

This adapter is instructional, like the original skill. Offline tests check the
instructions and preservation boundaries, not visual fidelity or model compliance.
No Figma file creation, editing or runtime test is authorized merely by adapting,
installing or validating this package; honor the active user's operation scope.
<!-- graffino-agentic:codex:end -->
