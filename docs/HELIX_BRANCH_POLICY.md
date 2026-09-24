# HELIX Migration Branch Policy

All current migration work remains on `plan/helix-veyra-implementation` until verification evidence is satisfactory. `main` is not used as an experimental migration branch.

A review/PR should expose CI failures rather than hiding them. Known blockers are fixed on the migration branch, verified, then merged. Repository rename follows the green merge/readiness checkpoint.
