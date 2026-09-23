# HELIX / VEYRA Security Boundary

Distributed web and APK clients are treated as inspectable and untrusted.

## Client-safe
- Public UI and charts.
- Public market/news data adapters.
- Non-secret endpoint identifiers.
- Cached user preferences.

## Never client-secret
- Database service-role credentials.
- Private API keys.
- Payment webhook secrets.
- Telegram bot tokens.
- Signing/private keys.
- Future proprietary server-only strategy implementation.

Neutral filenames, VEYRA branding, minification, and repository renaming reduce casual discovery only. They are not authorization or confidentiality controls.

Future protected capabilities must be enforced by authenticated server-side authorization/entitlement checks and rate limiting, with the client receiving only the data/results it is authorized to access.
