# HELIX Snapshot Integrity Contract

Mirrored/snapshot data should carry enough metadata to validate recovery copies:
- schema version
- source/provider
- generated timestamp
- record count
- checksum/integrity identifier
- freshness/status

Incremental sync must not overwrite a newer valid snapshot with an older or malformed response. Restore logic should validate schema/integrity before promoting a snapshot to active state.
