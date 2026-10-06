# Author response 1 — specification revised

- **Artifact:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md`
- **Reviewer response:** `docs/peer-reviews/spec/2026-09-17-57-61-peer-review-recovery-architecture-review/reviewer-response-1.md`
- **Author:** Codex
- **Reviewer:** Claude (Opus 5)
- **Review mode:** manual relay
- **Disposition:** revised; reviewer re-evaluation requested

## Summary

The review correctly identified collisions between the proposed architecture and
the package's current CLI grammar, lock implementation, record workflow, event
schemas, and permission boundary. The specification now resolves all eighteen
findings.

Sixteen findings are accepted as written or resolved by choosing one of the
reviewer's offered alternatives. Two are accepted with technical qualification:

- For R10, `permission-blocked` remains spending because the package cannot
  safely infer provider billing or exempt a dispatch based on blame.
- For R12, new binaries gain explicit compatibility gates and exact version
  pins, but an already-published old exact-key reader cannot retroactively be
  taught to emit a new upgrade error or safely ignore unknown authority events.

## Finding dispositions

### R1 — Accepted

The new record-spending command is now `peer-review recover-record`. Existing
`peer-review recover` retains participant-loss and stale-claim semantics. The
new closed grammar, author role, reason normalization, grant option, and
idempotency inputs are explicit.

### R2 — Accepted with lifecycle clarification

The state model now distinguishes contradictory `lineage-invalid` from absent
`lineage-unavailable`. Active recovery evidence remains in ignored scratch, and
cross-machine recovery of a nonterminal record is explicitly out of scope.
Routine cleanup is refused until terminal lineage is published. Terminalization
copies a minimal validated lineage receipt into the tracked manifest;
consolidation preserves it in tracked history and relocation evidence. A
complete terminal receipt permits consolidation and inspection without scratch.

### R3 — Accepted

The launcher compare-and-appends `execution-started`, completes projections,
and releases the non-reentrant lock before `execFile`. The bounded post-release,
pre-spawn TOCTOU window is explicit, with child `join` or `submit` failing closed
after competing authority changes.

### R4 — Accepted

The lock record gains host, boot, and process-start identity. Live contention,
proven stale ownership, and unknown liveness have distinct stable errors. A
provably dead lock is digest-checked and atomically retained before automatic
reclamation; PID absence alone and manual force deletion are insufficient. The
crash table and tests now cover lock-holder death.

### R5 — Accepted

The record retains one built-in recovery. Each additional recovery requires a
new exact, single-use `additional-recovery` Human Authority grant bound to the
record, attempt, triggering execution, mode, ordinal, normalized reason, and
successor. Full-Auto cannot mint or replace the grant. Exhaustion now emits the
exact grant-request action when eligible, otherwise terminal abandonment.

### R6 — Accepted

`recovery-claimed` is refused while any Human Authority challenge is live.
`execution-started` and `execution-resolved` advance sequence only, not protocol
revision, so dispatch accounting cannot invalidate a revision-bound grant.

### R7 — Accepted

For v2 startup, `start --record-id` is accepted only when redundant with the
generated initial review ID. Existing multi-attempt records are v1 and require
explicit adoption before v2 recovery. Recovery successor IDs come from the
claim, not content-derived public `start`; an internal creator validates exact
genesis and digest identity on retry. Consolidation remains available for valid
legacy records during rollout.

### R8 — Accepted

Same-provider identity variables are removed alongside cross-provider values.
The Claude adapter explicitly removes `CLAUDE_CODE_SESSION_ID`,
`CLAUDE_SESSION_ID`, `CLAUDE_MODEL_ID`, and `CLAUDE_MODEL_DISPLAY` from the
launching participant's inherited environment. Authentication may survive only
when it cannot assert session or model identity.

### R9 — Accepted

Preflight must prove exact argv is representable in the provider permission
grammar. Unsafe or unrepresentable paths fail before dispatch with
`APR_PERMISSION_UNREPRESENTABLE`. There is no fallback to PATH lookup, a bare
command, alias, glob, or broader rule.

### R10 — Resolved conservatively; exemption declined

Package-side readiness is labeled a self-check, and a real provider-side
non-model permission probe is used when documented. Nevertheless,
`permission-blocked` remains a dispatched, spending outcome. The package cannot
observe billing reliably or make a security-sensitive retry free by declaring
its own encoder at fault. After the built-in recovery, another dispatch needs
the exact human grant from R5.

### R11 — Accepted

Retry suppression now covers launch-result `recovery`, status JSON and next
actions, resume, and explain output. Any pre-exhaustion generated launch command
uses the workspace form. Exhaustion emits only the exact grant request or
abandonment action.

### R12 — Partially accepted; retroactive-reader premise corrected

The design adds a startup-digest-bound compatibility header with minimum reader
and writer versions. V2 commands check it before parsing authority, generated
participant commands pin the exact creator package version, and preflight
refuses incompatible installed packages.

An already-published v1 binary cannot retroactively understand a future gate,
produce a new error, or safely skip an unknown exact-key authority event. The
specification states that limitation rather than promising it away. Unknown
event tolerance is declined because a read-only projection that skips
authority-changing events can be false. Deliberate upgrades regenerate commands
from current authority.

### R13 — Accepted

Schema selection is per event. Event-v1 keeps the current participant validator;
event-v2 requires the compatibility mirrors plus nested session/model evidence.
The v2 reducer validates and normalizes each line independently, permitting a
v1 creation event followed by v2 participant events. Compatibility mirrors
remain required.

### R14 — Accepted

`launch-reviewer` physically resolves the positional: an event-log directory is
a workspace, and a metadata-bound generated invitation file is the first-turn
shim. Other or ambiguous paths fail with `APR_LAUNCH_TARGET_INVALID`. Help and
golden output must cover both forms.

### R15 — Accepted

`recovery-claimed`, `execution-started`, and `execution-resolved` use the
authenticated registered author fingerprint. Record recovery and reconciliation
must resolve a matching runtime author. Unauthenticated `system` cannot append
recovery or execution authority.

### R16 — Accepted

Claim precondition fields are renamed `claimed_against_sequence`,
`claimed_against_revision`, and `claimed_against_authority_digest` so they
cannot be confused with the new envelope. `recovery_exhausted` is derived and
removed from the successor payload.

### R17 — Accepted

The specification now states that collateral reservation is file-scoped.
Same-day attempts may share a record directory through distinct review-ID
prefixes; next-day attempts may use separate dated directories. Both layouts
are explicit integration cases and consolidation uses sealed paths rather than
directory assumptions.

### R18 — Accepted

The summary, goals, invariants, and acceptance criteria now consistently
describe a built-in record recovery plus exact granted additions. Reasons are
trimmed, NFC-normalized, case-preserving, bounded to 1–1,000 Unicode scalar
values, and hashed from normalized UTF-8 for idempotency.

## Changes made

- Separated participant recovery from record-spending recovery in CLI grammar.
- Added exact human-authorized recovery beyond the built-in allowance.
- Split unavailable lineage from contradictory lineage and added durable
  terminal receipts.
- Defined lock release-before-dispatch and stale-lock reclamation.
- Closed live-challenge, event-revision, actor, and claim-field ambiguities.
- Dispositioned legacy `--record-id`, successor-ID derivation, and consolidation.
- Hardened same-provider environment isolation and permission representability.
- Made spending-conservative permission failure and retry suppression explicit.
- Added per-event schema evolution and forward-compatibility gates.
- Added positional routing, reservation-layout, crash, grant, and mixed-version
  verification cases.

## Declined or qualified remedies

No finding is declined in substance. Two proposed remedies are narrowed:

1. Permission-blocked dispatch is not exempted from recovery accounting because
   the package lacks authoritative billing evidence and must not self-certify a
   free retry.
2. Unknown-event tolerance and guaranteed clear errors from already-published
   old binaries are not claimed. New versions prevent normal version skew with
   sealed minimums and exact command pins; old exact-key readers remain
   inherently unable to interpret future events.

## Verification

- Read the complete reviewer response and revised every requested design area.
- Verified the current parser collision, public `--record-id` behavior,
  non-reentrant lock implementation, Human Authority parameter registry,
  exact-key participant validator, record-scoped path prefixing, and
  consolidation source deletion against package source.
- Document formatting, Markdown checks, and Git whitespace verification are run
  before committing this response with the specification and reviewer response.
