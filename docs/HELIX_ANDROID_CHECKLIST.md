# VEYRA Android Verification Checklist

Apply when Android/Capacitor source is connected:
- VEYRA app label, icon, splash, notification label.
- `veyra://` deep links route through the central router.
- Preserve existing application ID/package/signing identity for first migration.
- Web assets generated and verified before Capacitor sync.
- Android manifest/WebView settings audited.
- Gradle debug build succeeds.
- APK contains expected generated web assets.
- No privileged credentials or repository-only development secrets in packaged assets.
- Malaysia-time display verified for Pulse and Intelligence alerts.
