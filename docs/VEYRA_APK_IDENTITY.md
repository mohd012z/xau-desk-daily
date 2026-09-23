# VEYRA APK Identity Contract

The Android/APK source is not present in this repository, so this document defines the contract to apply when that source is connected.

## Public identity
- App label: `VEYRA`
- Debug artifact: `Veyra-debug.apk`
- Release artifact: `Veyra-v<version>.apk`
- Deep-link scheme: `veyra://`
- Public sections: Home, Pulse, Charts, Intelligence, Alerts, Watchlist, Settings.

## Compatibility rule
During the first branding migration, preserve the existing Android `applicationId`, package namespace, and signing identity unless an explicit package migration is approved. This allows VEYRA to remain an upgrade path for existing installations.

## Repository privacy rule
The APK name and UI do not expose HELIX repository names. This is branding separation, not a security boundary. Runtime endpoints must be centralized and privileged secrets must never be embedded in the APK. A later relay/backend may remove direct repository-hosted runtime URLs from the distributed client.
