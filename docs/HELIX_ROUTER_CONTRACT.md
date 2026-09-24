# VEYRA Central Router Contract

When the full application/APK source is connected, one router must own application navigation.

Primary public routes:
- `home`
- `pulse`
- `charts`
- `live`
- `intelligence`
- `alerts`
- `watchlist`
- `settings`

Invariant: exactly one route is active and exactly one primary section is visible. Temporary BBMA/News compatibility routing should be removed after the central router owns Intelligence and Pulse.

Deep links use the public scheme `veyra://`, for example `veyra://intelligence` and `veyra://pulse`.
