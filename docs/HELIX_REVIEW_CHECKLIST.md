# Migration Review Checklist

Reviewers should verify:
- Branding changes do not alter market calculations/data identifiers.
- Rename scanner distinguishes historical documentation from runtime blockers.
- Endpoint configuration contains no credentials.
- Secret scanner output redacts matched values.
- CI runs both existing and migration-specific tests.
- Production index legacy branding remains a blocker until explicitly migrated.
- Repository rename is not performed before green evidence.
