# HELIX Generated Bundle Gate

When the APK/web preparation source is connected, tests must validate generated output rather than search builder source code for literal script tags.

Required sequence:
1. Run the web preparation step.
2. Inspect generated `www/index.html`.
3. Confirm required runtime/UI/router/deep-link assets exist.
4. Confirm dependency order.
5. Confirm referenced files physically exist under `www/`.
6. Reject duplicate injection.
7. Only then run Capacitor/Gradle packaging.

This contract directly addresses the previously identified test-contract mismatch where dynamically generated script tags were correct at runtime but a static source-string test failed.
