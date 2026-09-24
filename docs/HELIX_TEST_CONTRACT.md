# HELIX Test Contract Principle

Tests should validate observable/generated contracts whenever implementation structure is intentionally dynamic.

For the future APK preparation pipeline, generate `www/index.html` first and assert the required assets/order in that output. Do not require `prepare-web.js` source text to contain literal script-tag strings when the builder intentionally generates them from a file list.
