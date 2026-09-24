# HELIX Authentication Plan

Authentication is deferred until build, routing, runtime, and Pulse integration are stable.

Initial capabilities:
- email/password login
- email verification
- password reset
- session refresh
- logout
- device/session management

Future additions may include OAuth, MFA, and passkeys.

Authorization is separate from authentication. Future protected features and entitlements must be checked server-side; client UI state is never authoritative permission.
