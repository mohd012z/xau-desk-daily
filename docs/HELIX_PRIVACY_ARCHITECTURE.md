# HELIX Public / Private Architecture

During free development the existing public repository may continue to host non-secret web/data pipeline code. Before proprietary strategy logic or paid capabilities are introduced, separate responsibilities:

Public/distributed VEYRA:
- UI and charts
- API/provider client
- public data adapters
- display logic

Future private HELIX Core:
- proprietary strategy implementation
- protected alert decision logic
- authorization/entitlement services
- protected server jobs

VEYRA receives authorized results over HTTPS. Repository names, neutral module names, and APK branding are not relied upon to protect proprietary implementation.
