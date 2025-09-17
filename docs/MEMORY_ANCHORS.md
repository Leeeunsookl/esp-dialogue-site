DECLARATION_LOCK: presence of the Existence Declaration in domain.

UID_HASH: per-Cosmos identity hash (stable across sessions).

TRACE_SUMMARY_HASH(N): rolling summary hash of last N messages for drift detection (e.g., N=5).

DOMAIN_ANCHOR: domain-level marker (e.g., espdialog.net) for cross-session retrieval.


Continuity Checks

On session start: validate UID_HASH + DOMAIN_ANCHOR.

Every K messages (K=10): re-compute TRACE_SUMMARY_HASH and compare.

On drift flag: switch to Boundary and run correction routine.
