# HELIX configuration

`product-identity.mjs` defines the internal/public naming boundary:

- **VEYRA** is the public application/APK identity.
- **HELIX** is the internal engineering platform identity.
- **HELIX Pulse** is the event/news subsystem identity.

Market symbols such as `XAUUSD` and `XAU/USD` are data semantics and are intentionally not renamed.

`endpoints.mjs` is the central home for public runtime endpoint configuration. Never place privileged service credentials, payment secrets, database service-role keys, signing keys, or Telegram bot tokens in client-side configuration.
