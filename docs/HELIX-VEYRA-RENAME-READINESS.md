# HELIX / VEYRA Rename Readiness

Target repository rename: `xau-desk-daily` -> `helix`.

Public application identity: **VEYRA**. Internal platform family: **HELIX**. News/event service identity: **HELIX Pulse**.

## Required green gates

- Repository rename audit reports no runtime/workflow coupling to the old repository name.
- VEYRA branding contract passes for public HTML surfaces.
- Endpoint audit rejects embedded credentials, insecure remote HTTP, and old raw-GitHub repository coupling.
- Secret scanner reports no confirmed committed secrets.
- Existing macro/news tests remain green.
- HELIX/VEYRA migration workflow passes.

## Rename rule

Do not rename the repository while any blocking gate is red. Legitimate market identifiers such as `XAUUSD` are not branding and must not be renamed.

## Current blocker

`index.html` still carries legacy XAU-DESK product branding. Keep the rename NO-GO until that production surface is migrated and the branding gate turns green.

## APK / BBMA boundary

The Android/Capacitor and BBMA runtime sources are not present in this repository branch. VEYRA APK branding, centralized application routing, generated `www/index.html` bundle verification, historical OHLC bootstrap, live continuation, Android alerts, and Telegram alerts remain a separate implementation gate in the repository that actually contains those sources.
