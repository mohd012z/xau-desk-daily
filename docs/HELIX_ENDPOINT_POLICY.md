# HELIX Endpoint Policy

Runtime URLs should be centralized by responsibility rather than scattered through UI code.

Groups include Pulse, history, live market data, and configuration. During free development some public sources may remain directly reachable, but consumers should depend on the endpoint/provider layer so sources can later move behind HELIX Relay without widespread code edits.

Remote runtime endpoints should use HTTPS. Credentials embedded in URLs are prohibited. Direct repository-host coupling is flagged by migration tooling where it would prevent a safe repository rename.
