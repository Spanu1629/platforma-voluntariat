# Project brief — P16 - Coordonare voluntari

## Source
User instructions in this setup session, 2026-11-06.
These facts are user supplied; they are not inferred from application code.

## Purpose
Volunteer Coordination Platform is a university web application for a real volunteer organization.
It will help coordinators manage events, shifts, volunteer registrations, attendance and volunteering hours.

## Planned features
- Volunteer profiles and training records.
- Event and shift management.
- Volunteer registration and waiting lists.
- QR-based check-in and check-out.
- Tracking volunteering hours.
- Generating PDF volunteering certificates.
- Separate interfaces for volunteers and coordinators.

## Confirmed constraints
- Responsive web interface for desktop and mobile devices.
- Backend services and databases must run in Docker, following laboratory requirements.
- Technology and architecture remain undecided.
- Exact business rules and requirements must be confirmed with the partner organization.
- Initial datasets may be structured from information supplied by the partner organization.

## Setup choices
- No team addon.
- No ClickUp addon.
- No Slack addon.
- Keep the original Graffino workflow and its existing Codex compatibility layer.
- Use Figma MCP for Codex design review, following the compatibility layer's gates.
- Skip only the inapplicable initial fetch/pull step; no remote or commits exist.

## Scope limits
Planned features do not define workflows, validation rules, permissions or interface contracts.
Do not infer these from feature names. Obtain the missing requirements before implementing dependent behavior.
