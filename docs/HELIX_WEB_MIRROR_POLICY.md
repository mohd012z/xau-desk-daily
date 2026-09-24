# HELIX Web Mirror Policy

Web mirroring/copy tooling is limited to sites and data the project owns or is authorized to cache/mirror.

A mirror workflow may validate HTTPS, fetch in-scope HTML/assets, rewrite local asset URLs, create an integrity manifest, perform incremental updates, and report broken links.

It must not be designed to bypass third-party authentication, paywalls, anti-bot controls, or access restrictions, and must not extract hidden credentials or private tokens.
