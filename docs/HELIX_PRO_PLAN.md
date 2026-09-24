# Optional VEYRA Pro Architecture

VEYRA remains free-first during project development. This document only preserves the future architecture.

If a Pro tier is introduced later:
- payment confirmation is processed by a trusted backend/webhook;
- subscription and entitlement state is server-authoritative;
- the browser/APK never grants access based only on redirect parameters or local storage;
- privileged payment/database credentials never ship in VEYRA;
- protected capabilities are enforced by backend authorization, not hidden buttons.

No payment implementation is part of the current migration gate.
