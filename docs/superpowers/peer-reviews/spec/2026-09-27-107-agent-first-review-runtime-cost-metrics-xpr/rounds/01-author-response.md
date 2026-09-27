# XPR Author Response - Round 1

- Issue: #107
- Requested author identity: GPT-6 Astra, high effort
- Reviewer: Claude Opus 5, high effort, as recorded in the supplied review
- FUR: `docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md`
- Review: `docs/superpowers/peer-reviews/spec/2026-09-27-107-agent-first-review-runtime-cost-metrics-xpr/rounds/01-review.md`
- Review SHA-256: `3a42e03d96e96044b84714034db7beb43805d20024c79d27576d1999992026ba`
- Before FUR SHA-256: `ee2dc3096f1324a999485a941c10ccba951dde36c707cb40d53aff37605c9a89`
- After FUR SHA-256: `88cd3d9c13d37ae7ef23b5c5b95c41b5ee902e0133036216f7f8c7c5605e2048`
- Starting commit: `7d2902e3a36c32c46240dcd26ad290621d41d726`

## Assessment

I read the complete supplied review and current FUR and independently verified
both input digests. This binds my response to those files; it does not upgrade
the reviewer's stated limits on hashing or repository access. The revised
specification preserves all six journeys, explicit stage intent, the portable
JavaScript broker, exact-session continuity, no per-round commits, sealed
evidence and provenance-aware accounting.

There are 25 addressed and 3 partially addressed findings. Partial dispositions
identify specific proposed mechanisms I reject or defer, rather than silently
adopting them. These are author dispositions for reviewer reassessment, not a
claim of reviewer acceptance. No runtime implementation or protocol transition
was performed. The supervisor owns the patch and inventory generation.

## Finding Dispositions

### XPR-001 - addressed

Evidence now defines a normative run tree with immutable stage and stage-attempt
IDs, stage-global round numbers, payloads, rendered envelopes, receipts,
no-response attempt-evidence files and a terminal anchor. All changes use
run-global sequence IDs in `patch-chain.json`, including initialization,
checkpoint recovery and intervening deltas. Amendments have separate immutable
inventories outside the sealed run. Gate 3 covers multi-stage and replacement
path collisions and reconstruction. Shared #30 ownership is explicit.

### XPR-002 - addressed

The new Storage Layout table maps collaboration, authority, context projections,
series indexes, portable records, amendments, endpoint metadata, private bindings,
requests and logs to physical-worktree-relative paths. It specifies write/read
scope, path disclosure and trackable versus ignored policy. Authority remains
durable despite its scratch parent and cannot be removed by generic log cleanup.
The shared Git-common-directory discovery index is an explicit advisory exception.
Tracking is left to ordinary project workflow, with no implicit staging.

### XPR-003 - addressed

Round accounting now follows one admitted critique dispatch per round, including
failed critiques, plus revision attempts belonging to that round. Pre-admission
attempts belong to stage/run scope. Each provider attempt has one accounting
owner. Continuous-session usage stays at its lowest known stage/run scope when
round attribution is unavailable; round links do not duplicate it. Gate 10
asserts these partitions. A failed critique's receipt is included, not discarded.

### XPR-004 - addressed

Findings and Debate now defines one acceptance predicate: clean current critique,
matching unchanged FUR digest, no open findings, explicit reviewer resolutions
and persisted evidence. Fixed, withdrawn and accepted-rationale are terminal;
duplicate/superseded/split links require resolved targets and acyclic lineage.
Author dispositions cannot close findings. Critique submissions carry a
resolutions array. `APR_FINDINGS_UNRESOLVED` names missing IDs and returns the
same submission action without advancing. Gate 2 tests unresolved disputes.

### XPR-005 - addressed

The FUR boundary grants bounded supervisor initialization authority. The lineage
merge happens after reservation but before participant admission, with exact
pre/post snapshots and a reversible initialization patch; round 1 reviews the
post-merge bytes. Preview/receipt disclose the write. The new `lineage_mode`
request field permits Markdown sidecar operation. Checkpoint resolution is a
separate, explicitly authorized and fenced recovery exception, not unrestricted
supervisor FUR access. Gate 3 tests both lineage modes.

### XPR-006 - addressed

Visibility and Session Continuity now requires all supplied prior evidence to
come from sealed authority through a participant-read-only projection. Context
receipts bind sealed and supplied digests. A modified collaborative copy emits
`APR_COLLATERAL_DIVERGED` and is never substituted; a bad seal/projection blocks
dispatch. Gate 3 checks supplied context as well as exported evidence. Repository
retrieval remains honestly labeled as non-blinded access.

### XPR-007 - addressed

Attached Identity and Role Grants specifies trusted host/exact-session evidence,
an opaque worktree-scoped fingerprint, protected raw handles, durable identity
provenance and transport-bound reattachment. A same-model new chat cannot reclaim
the role. Unsupported exact-session observation fails admission. CLI uses the
trusted host bridge. An unrecoverable attached participant waits for verified
return, user-authorized replacement or cancellation; it does not silently expire.

### XPR-008 - partially addressed

The spec now explicitly labels same-user role authority as accountability and
mistake prevention, separately from enforced provider-sandbox write scope and
attached/SAR agent compliance. Grants are per turn, role, session and revision;
monitor grants are read-only. Gate 9 tests grants and records the assurance limit.

I reject the proposed delivery of credential secrets into provider process
environments. A provider with command tools may expose inherited environment
values; doing so would weaken the stated secret-exclusion requirement. Secrets
instead remain in trusted host bridges/wrappers, which expose scoped submission
tools. Also, excluding malicious unrestricted same-user actors does not negate
enforcement against a sandboxed participant. The revised text distinguishes
those threat models rather than declaring all separation merely advisory.

### XPR-009 - partially addressed

Disconnect and Recovery adds authorized `reconcile-operation`,
`resolve-checkpoint` and `acknowledge-unresolved` actions with evidence and replay
requirements. Pre-start pointer conflicts use `reconcile_review_series`, since
they have no run ID; it preserves prior bytes and validates targets under locks.
Gate 13 covers recovery, stale inputs and retained obligations.

I reject any interpretation in which acknowledging unknown effects proves
termination or releases a writer lease. Acknowledgment can end review work as
failed with `termination-unproved`, but fences, leases and cleanup obligations
remain until verified reconciliation. A fresh run or replacement cannot race an
unproved writer. This preserves the approved fail-closed intent while providing
an auditable terminal failure and a later reconciliation path. Some cases still
require external remediation; the specification now says so explicitly.

### XPR-010 - addressed

The monitor contract now waits per interval and resumes after attached turns,
interventions or observer detach using the durable cursor. Wakeups distinguish
attached work, actionable intervention, host-forced re-entry and terminal
delivery. Gate 6 checks exactly one post-receipt terminal wakeup for a fault-free
two-headless run and adds author-turn wakeups for attached-author runs. The exact
count is intentionally qualified by host capability and absence of faults.

### XPR-011 - addressed

Run responses now include explicit liveness, participant phase/role state and
fencing dimensions, with null/reason handling for unknown observations. A table
defines the required tuples for observer disconnect, quiet reasoning, process
death, broker restart and second-launch failure. Observer-local stale information
cannot pretend to be current broker truth. Gate 6 tests these tuples, preserving
the existing coarse run-state enum.

### XPR-012 - addressed

Role-count-changing fallback sets fail pre-reservation with
`APR_FALLBACK_TOPOLOGY_INVALID`, an exact source-field JSON Pointer and correction.
Sealing records eligible, conditional and excluded candidates with reasons;
excluded candidates consume no try. Eligibility is precomputed for every
reachable counterpart, then selected/rechecked against the actual counterpart
at replacement. Checking only the original counterpart would be insufficient
when both roles can fall back. Worked SPR/XPR examples and gate 2 cover this.

### XPR-013 - addressed

Configuration now has one complete v2 skeleton: caps/limit, role cascades,
per-requested-class fallback policy, monitoring, broker idle grace, telemetry
grace, finite diagnostic retention and launch/revision retry bounds. Defaults,
units, numeric limits, threshold order and merge semantics are explicit. Named
profiles replace wholesale; ordinary policy leaves merge; arrays never interleave.
Source documents get structural validation and effective config gets reference
and cross-field validation. Analysis weights belong to #34's consumer schema.

### XPR-014 - addressed

Migration retains the legacy manual XPR entry point in its compatible installation
until the advertised platform's cross-family headless replacement passes installed
conformance. The old and new paths coexist explicitly; unsupported new topologies
never silently relay. Retirement notes and gate 8 cover the transition. The final
replacement release must demonstrate all six journeys for its advertised matrix.
I selected the review's release-gate option, preserving the two approved placements.

### XPR-015 - addressed

New-runtime start/preview rejects any participating v1 or mixed v1/v2 config with
`APR_CONFIG_MIGRATION_REQUIRED`. Guidance lists legacy keys, changed semantics,
proposed equivalents and prospective caps/sources. A deliberate migration is
required; there is no silent `max_turns` conversion or default-cap substitution.
Pinned legacy runs retain their v1 reader. Gate 8 covers both config and live-run
migration behavior.

### XPR-016 - addressed

Evidence, Review Series and Metrics each now state ownership inline and name
emitted/consumed target schemas. This specification declares the required shared
evidence interface; #30 implements/migrates it, with plan reconciliation before
schema freeze. #107 emits neutral telemetry; #34 consumes it and owns scoring,
weights and experiment design, with #33/#34 outcome references kept distinct.
The backlog rows agree, and gates 3/10/11/12 explicitly depend on shared contract
adoption. No issue body or existing dependent plan was changed or claimed approved.

### XPR-017 - addressed

Migration defines a sealed per-run `runtime_binding`, protected legacy routing
records, verified dispatch through the pinned CLI/MCP/runtime and independent
broker/worker checks. Missing or mismatched installations fail with
`APR_PINNED_RUNTIME_UNAVAILABLE`. Issue #102 explicitly owns the same-worktree
coexistence prerequisite and artifact-ownership checks. Old/new namespaces are
distinct, uncertain overlap blocks starts, and incompatible modern bindings
cannot create competing brokers. Gate 8 covers this dependency.

### XPR-018 - addressed

The broker now explicitly uses HTTP/1.1 with versioned JSON, a literal bound
loopback Host allowlist, header-only credentials and rejection of Origin,
Sec-Fetch, upgrade and malformed/oversized requests. Header/body limits and
receipt/unauthenticated-idle timeouts are defined separately from authenticated
wait lifetime. Browser monitoring uses a redacted projection rather than the
control listener. Gate 5 includes a rebinding-style Host mismatch.

### XPR-019 - addressed

The Git-common-directory advisory index has per-worktree entries, ownership
locks, atomic publication, revision checks and a quarantine location. It is
untracked and never termination authority. Cleanup may read a verified target's
credential under the same-user boundary but exposes neither credentials nor
their digests. Unreadable credentials and unverifiable removed worktrees remain
unreconciled. Gate 5 tests publication concurrency and these non-disclosure rules.

### XPR-020 - addressed

Canonical Start Request now enumerates session-free preflight sources and prohibits
broker/session creation, installation, conformance execution or credential refresh.
A table separates unsupported capabilities, missing telemetry, locally known or
unknown authentication and quota/capacity outcomes. Preview runs the same new
request checks without reservation. Exact replay still precedes new resolution.
Gate 14 checks preflight side effects and the telemetry exception.

### XPR-021 - addressed

Duplicate-key rejection is scoped to available raw JSON, including CLI and raw
MCP frames. Already-parsed MCP input records `not-observable` in
`input_validation.duplicate_keys`; it cannot claim a discarded key was detected.
Canonicalization remains over the parsed value, preserving cross-transport
idempotency for equivalent objects. Gate 1 tests both assurance levels.

### XPR-022 - addressed

Monitoring defaults are exact named millisecond values: 15000/60000/120000,
with a 1800000 active-operation hard timeout. Provider-output age, dispatch
baseline, observation staleness and clock-epoch recovery are defined. Injected
monotonic-time tests use zero logical threshold tolerance; live scheduling
lateness is reported and never proves process death. Gate 6 uses configured
thresholds instead of wall-clock sleeps. These defaults are no longer deferred.

### XPR-023 - partially addressed

Added `review.max_rounds_limit`, default 1000, with caps/limit bounded to 1..1000
and validation before reservation; cap extension cannot bypass the limit. The
text distinguishes initial authorized request intent from later cap changes.
Hard token/currency ceilings are explicitly deferred to a versioned policy
extension. Delayed, missing and overlapping counters make a truthful hard spend
guarantee a separate admission/reservation problem, not a safe consequence of
adding one telemetry threshold. Current finite round/retry/time bounds remain.

### XPR-024 - addressed

The spec explicitly retains the submitted filepath spelling as request identity.
Clients must replay the original request; physical path resolution is sealed
separately for leases. Gate 1 asserts that `spec.md` versus `./spec.md` under the
same ID conflicts. This selects the review's documentation option and preserves
replay without requiring fresh filesystem resolution after a run was reserved.

### XPR-025 - addressed

All v2 config candidates now use `selector`. The obsolete host-as-selector alias
sentence is removed; `host` is reserved for resolved host identity. The focused
config example check verifies that no candidate uses the old key.

### XPR-026 - addressed

Material Rework now says "sequence termination on non-acceptance". Earlier
success cannot skip later requested stages; the existing cap-exhaustion stop
rule remains unchanged.

### XPR-027 - addressed

Registry example validation now includes configuration and structured monitor
fixtures. Offline model/effort examples are explicitly pinned conformance
fixtures, not live availability assertions. Installed admission validates real
capabilities separately. Omitted model/effort inherits a matching profile value,
then a unique adapter default; ambiguity or unsupported explicit values fail.
Gates 8 and 15 cover these contracts. The future registry is not implemented here.

### XPR-028 - addressed

The cap contract explicitly states the conservative choice: every admitted
critique consumes a round even if infrastructure prevents a response. No free
post-admission allowance is added. The budget bounds dispatches as well as
disagreement. Pre-admission launch retries retain a separate finite allowance;
reconnection to the same operation consumes no new round. Further work after cap
exhaustion requires explicit authorized extension, with accounting retained.

## Verification and Scope

Focused verification covers Markdown lint/format, whitespace errors, all four
standalone JSON examples, complete config keys/defaults/thresholds, candidate
selectors, all 28 disposition IDs, digest bindings and unchanged review bytes.
These are document checks; installed provider conformance, runtime schemas and
behavioral release gates remain implementation work and are not claimed passing.

Only the FUR and this author response were edited. The reviewer response,
untracked implementation plan, prior collateral, package authority and source
code were not modified. No commits or Git-state changes were requested or made.
Ready for the supervisor's patch/inventory and Claude Opus 5 reassessment.
