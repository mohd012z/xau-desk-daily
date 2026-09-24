# HELIX Rename Readiness

Target repository rename: `xau-desk-daily` -> `helix`.

## Current state

Status: **NO-GO until migration CI is green.**

Completed on the migration branch:
- HELIX / VEYRA product identity contract.
- Repository rename audit tooling.
- Public endpoint audit tooling.
- Defensive secret scanner.
- Migration verification orchestrator.
- VEYRA Pulse branding for the macro preview.
- HELIX / VEYRA CI migration gate.

Remaining blockers before repository rename:
- Production `index.html` still carries legacy XAU-DESK branding and must be migrated without changing legitimate market symbols/data semantics.
- All rename-audit findings outside historical/spec documentation must be classified and removed or explicitly justified.
- Migration CI, existing market/macro tests, endpoint audit, and secret scan must pass together.
- GitHub Pages/deployment behavior must be verified after repository-name decoupling.

## Rename rule

Do not rename the GitHub repository while this document reports NO-GO. Rename only after the migration branch is green and the final repository-name search contains no blocking runtime/deployment references.
