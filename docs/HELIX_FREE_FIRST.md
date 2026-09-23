# HELIX Free-First Infrastructure Policy

Until VEYRA reaches a stable project milestone, prefer free/local infrastructure where it is technically adequate.

Priority order:
1. Local browser/Android cache for resilience.
2. Existing GitHub Actions/Pages and public snapshot pipeline for development where appropriate.
3. Free-tier cloud database/storage only when account sync or remote persistence is actually required.
4. Paid infrastructure only after a measured requirement justifies it.

The provider layer must keep data-source and storage choices replaceable. No client module should assume that a particular free provider will exist forever.
