# Current Migration Non-Goals

This branch does not:
- fabricate missing BBMA/Android/Capacitor source files;
- change legitimate XAUUSD/FX/market semantics;
- change Android package/application identity without the native source and explicit migration;
- implement payments;
- bypass third-party logins/paywalls/security controls;
- hide secrets through obfuscation;
- treat repository/APK naming separation as security.

These boundaries keep the current migration reviewable and reversible.
