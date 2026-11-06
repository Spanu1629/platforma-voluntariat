# Architecture — platforma-voluntariat

<!-- graffino-agentic:begin v1 -->
> How this repo is built, generated from the code at backfill and kept current by
> whoever changes the structure. The code wins: when this page is wrong, fix it.
<!-- graffino-agentic:end -->

## Overview
This repository contains the agentic setup only. No application has been implemented.
The planned product is a responsive volunteer coordination web application.
Architecture and technology choices remain open (Q-001).

## Parts
| Part | Path | Responsibility | Talks to |
|---|---|---|---|
| Agent setup | `AGENTS.md`, `docs/agents/` | Rules and project knowledge | No application services |
| Design records | `docs/design/` | Design procedure and future artifacts | Future Figma review destination |

## Data flow
No application data flow exists. Feature workflows await partner confirmation (Q-002).

## State and storage
No database, schema or storage mechanism is selected.
Partner dataset structure remains open (Q-009).

## Configuration
No application environment variables or runtime configuration exist.

## Build, deploy, runtime
Backend services and databases must run in Docker (D-001).
No images, Dockerfiles, service topology or orchestration choice is approved.
Commands and release flow remain open; see AGENTS.md sections 2 and 5.

## Boundaries
Separate volunteer and coordinator interfaces are planned.
Authentication, authorization and trust boundaries remain unconfirmed in Q-001 and Q-002.
No interface contracts exist; see CONTRACTS.md.
