# Peer-Review Recovery and Execution Integrity Design

## Document status

- **Date:** 2026-09-17
- **Status:** Draft for human review
- **Tracking issue:** #57
- **Incident defects:** #57, #58, #59, #60, and #61
- **Source incident:** #56
- **Scope:** Unified architecture and specification only. Issue decomposition and
  implementation are not authorized by this document.

## Summary

The five defects discovered while investigating #56 are different failures of
one missing boundary: `ai-peer-review` does not yet own a record-level recovery
transaction and a current-event-authorized provider execution contract.

This design adds that boundary. One logical review record has one built-in
recovery allowance after an unsuccessful or ambiguous provider dispatch. The
recovery may resume the same provider session or create one successor attempt,
but both forms consume that allowance. Additional recovery is possible only
through a new, exact, single-use Human Authority grant; Full-Auto and ordinary
resume behavior cannot issue or substitute for that grant. Normal
event-authorized turns inside the active attempt remain permitted. Every
provider execution is built from current event authority, validated by
preflight before dispatch, bound to one exact executable and sanitized
environment, and recorded with truthful session and model evidence.

Attempt event logs remain immutable protocol authority. No clone-shared SQLite
dependency is introduced. Planning will decide whether the implementation is
one atomic issue, rewritten versions of #57-#61, or a replacement epic and
children.

## Incident evidence and problem statement

Issue #56 exposed a chain rather than five independent defects:

| Issue | Observed failure                                                                                                                  | Missing architectural responsibility                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| #57   | Fresh attempts and launcher retries reset practical spending limits.                                                              | Durable record-wide recovery authority.               |
| #58   | A resumed reviewer was launched with first-turn response and command routing.                                                     | Current-event-derived execution contracts.            |
| #59   | Bare executables and inherited identity environment reached the provider process without a deterministic compatibility preflight. | Executable and environment isolation before dispatch. |
| #60   | Supersession accepted a syntactically valid successor ID without proving a real same-record successor.                            | Validated attempt lineage.                            |
| #61   | Caller-supplied model declarations were represented as runtime verification.                                                      | Separate session assurance and model attribution.     |

The incident created repeated fresh attempts after a failed reviewer turn. Each
attempt had its own turn budget, while no package-owned record authority limited
the number of replacements or paid retries. The launcher also pinned the first
invitation and response into resume state, invoked bare `claude` and
`peer-review` commands, inherited the caller environment, and treated model
environment values as runtime evidence. Supersession linked attempts by an
unchecked identifier.

Patching these symptoms independently would leave bypasses between them. The
recovery budget cannot be reliable unless every provider dispatch passes
through the same current-turn contract, and a successor cannot inherit that
budget unless lineage is validated as part of the recovery transaction.

## Goals

- Permit one built-in recovery for one logical review record and require a
  specific signed human grant for each additional recovery.
- Count same-session retry and successor replacement against the same allowance.
- Preserve ordinary successful author and reviewer turn progression without
  charging it as recovery.
- Consume recovery authority durably before any recovered provider dispatch.
- Treat an ambiguous paid execution as executed rather than granting a free
  retry.
- Derive every launch from current event authority, including the current turn,
  response, commands, participant, and protocol revision.
- Preflight exact package and provider executables, permissions, version
  compatibility, and environment isolation before provider dispatch.
- Validate successor existence, repository and worktree identity, record
  membership, distinctness, and acyclic lineage.
- Separate provider-session assurance from model attribution and represent
  unavailable verification truthfully.
- Preserve readable legacy records without silently rewriting or upgrading
  their evidence.
- Return stable, actionable stop results that request exact human authority or
  terminate the record, without generating another provider retry when
  recovery is exhausted.

## Non-goals

- Billing, pricing, or generalized provider-cost management.
- Clone-shared SQLite, a daemon, or a remote record authority.
- Reading private provider transcripts or session databases.
- Automatic or bulk approval of additional recovery.
- Automatic reviewer replacement.
- Weakening participant separation, response sealing, repository-boundary
  checks, or acceptance authority.
- Restarting #56, resuming its reviewers, or changing its preserved evidence.
- Implementing unrelated phases of provider-neutral runtime orchestration.
- Deciding the final issue decomposition before implementation planning.

## Terminology and invariants

### Review record and attempt

- `record_id` identifies one logical human review process.
- `review_id` identifies one immutable protocol attempt and its event log.
- `root_review_id` identifies the initial attempt in a record.
- `predecessor_review_id` identifies the immediately preceding attempt.
- `recovery_ordinal` is `0` for the initial attempt, `1` for the built-in
  recovery, and greater than `1` only when each increment is backed by its own
  consumed Human Authority grant.

The IDs have separate authority. `record_id` and lineage route and constrain
attempts; only attempt events and terminal manifests establish protocol
acceptance.

For newly created v2 records, the initial `record_id` equals the initial
`review_id`. `start --record-id` is accepted only when its value equals that
generated initial `review_id`; any other value is rejected. Any non-root attempt
must be created by the recovery transaction. This closes the bypass in which an
operator selects the same record ID with a fresh attempt ID or selects a new
record ID for the same review after failure.

### Recovery

A recovery is any repeated provider execution following an unsuccessful or
ambiguous provider dispatch. It has two modes:

- `retry-current`: preserve the current `review_id` and registered provider
  session.
- `replace-attempt`: create exactly one successor `review_id` in the same
  record.

The modes share the built-in allowance. Switching mode does not create another
budget. After the built-in allowance is consumed, each further operation
requires a separate signed grant bound to that exact operation.

A normal first execution of a newly event-authorized reviewer turn is not a
recovery. An exact bookkeeping retry that proves no provider dispatch occurred
is also not a recovery. Once dispatch may have occurred, another dispatch is a
recovery.

### Required invariants

1. The append-only event ledger remains review-state authority.
2. A record has at most one ungranted `recovery-claimed` event across its
   validated lineage; every higher ordinal has exactly one consumed,
   operation-bound Human Authority grant.
3. Recovery authority is consumed before recovered provider dispatch or
   successor creation.
4. A recovered successor inherits every consumed allowance and grant and cannot
   recover again without a new exact Human Authority grant.
5. Every provider execution targets one current event-authorized response and
   one registered participant session.
6. No executable lookup, caller environment value, invitation, or launch-state
   file can override event authority.
7. Missing or ambiguous evidence fails closed before another provider dispatch.
8. Full-Auto, persistence instructions, ordinary resume behavior, and generic
   human approval cannot override recovery exhaustion; only the protected
   additional-recovery grant can authorize the next exact operation.

## Architecture

### Record-level recovery transaction

The existing `peer-review recover <workspace> [--reclaim |
--replace-participant <role> --grant <signed-grant>]` command retains its
participant-loss and stale-claim meaning unchanged. Record-level spending
recovery is a separate operation with a separate closed grammar. The CLI adds:

```text
peer-review recover-record <workspace> --mode retry-current --reason <text> \
  [--grant <signed-grant>]
peer-review recover-record <workspace> --mode replace-attempt --reason <text> \
  [--grant <signed-grant>]
```

`recover-record` is author-only. The invoking runtime identity must match the
registered author participant. It reads the current attempt, validates its
lineage, builds the proposed mode-specific operation, and runs every
no-dispatch feasibility and provider preflight check. It then acquires the
current attempt lock, re-reads authority, revalidates the proposed operation,
and compare-and-appends `recovery-claimed`. The event actor is the registered
author fingerprint, never unauthenticated `system`. The event contains:

- `recovery_id` and idempotency parameters;
- `record_id`, `root_review_id`, and current `review_id`;
- the next recovery ordinal;
- mode and normalized reason;
- the triggering execution ID and outcome classification;
- `claimed_against_sequence`, `claimed_against_revision`, and
  `claimed_against_authority_digest`, distinct from the new event envelope's
  sequence and revision; and
- for replacement, the deterministic successor ID and sealed successor startup
  digest.

For ordinal `1`, the claim irrevocably consumes the record's built-in
allowance. For every higher ordinal, the same locked mutation verifies and
consumes one signed `additional-recovery` grant before appending the claim. The
command does not rely on a process-local counter, output directory name,
artifact revision, or agent memory.

Recovery reasons are normalized before hashing or comparison: trim leading and
trailing Unicode whitespace, normalize to NFC, preserve case and internal
characters byte-for-byte, and require 1 through 1,000 Unicode scalar values.
The normalized UTF-8 bytes, not the shell spelling, participate in idempotency.
Invalid or empty normalized reasons fail before a claim.

A feasibility or preflight failure before the claim does not consume recovery.
After the claim, later work may only finish the exact sealed operation; it may
not switch recovery modes or targets.

An interrupted command is resumed by reading the one pending claim. A retry
with identical parameters completes the same operation. A different mode,
normalized reason, execution, successor, ordinal, or grant conflicts with the
existing claim.

`recovery-claimed` advances protocol revision and is refused while any live
Human Authority challenge exists **other than the challenge it consumes in the
same protected mutation**. The reducer follows the existing consume-then-check
ordering used by participant replacement: it first consumes the matching
`additional-recovery` challenge, then refuses if any other live challenge
remains. The operator must consume, expire, or explicitly cancel unrelated
challenges before claiming recovery; recovery does not silently invalidate a
signed or pending grant.

#### Additional-recovery Human Authority grant

Human Authority remains intervention-scoped. The design does not create an
intervention-free grant class. Instead it adds operator-initiated authorization
interventions:

```text
peer-review enter-intervention <workspace> \
  --action additional-recovery --mode <retry-current|replace-attempt> \
  --reason <text>
peer-review enter-intervention <workspace> --action rotate-author-session
peer-review cancel-intervention <workspace> --intervention-id <id>
```

The first form is available only when the derived record state is
`recovery-exhausted`; the second requires an incoming runtime author fingerprint
different from the registered author and reviewer. The package derives and
seals the complete action parameters and digest before mutation. A locked event
batch appends `intervention-entered` with reason `recovery-authorization` or
`author-rotation`, the interrupted lifecycle state, requested action, and
parameters digest. The event actor is `system`: entering an intervention grants
no authority, dispatches no provider, and only pauses the record pending a
human decision.

The closed intervention reason enum gains these two reasons, and the lifecycle
transition table permits entry from active nonterminal states, including
`awaiting-reviewer`, `reviewer-turn`, `author-revision`, `acceptance-pending`,
`author-finalization`, and `awaiting-phase-artifact`. The separately closed
`interrupted_state` enum widens to exactly those six states so each permitted
entry can be restored. Entry is transport-neutral and does not require a role
claim. `request-grant` then uses the existing active intervention ID; challenge
validation, state-preserving guards, and consumption continue to require that
exact intervention.

`cancel-intervention` is the no-authority inverse of entry. It is accepted only
for an exact active intervention ID whose reason is `recovery-authorization` or
`author-rotation`; it refuses every existing intervention reason and a stale or
mismatched ID. The command append-locks an event-v2 `intervention-cancelled`
with actor `system`, closes any still-live challenge bound to that exact
intervention as part of the same mutation, clears the intervention, and
restores its sealed `interrupted_state`. It neither grants authority nor
requires a registered participant or Human Authority grant. An authorization
request that is declined, expires, or is not pursued therefore leaves the
operator a reversible path without terminating an otherwise healthy record;
the existing participant-authenticated `abandon` command remains available but
is not assumed to be reachable during author rotation.

`additional-recovery` is a new protected action. Its canonical parameter set
is `record_id`, `current_review_id`, `triggering_execution_id`, `mode`,
`resulting_recovery_ordinal`, `normalized_reason_digest`, and
`successor_review_id` (null for `retry-current`). The challenge is also bound to
the current protocol revision by the existing grant machinery. A grant permits
one compare-and-appended claim only, cannot authorize multiple ordinals, and
cannot be reused after any state or parameter change.

Implementation extends all four existing closed seams: add the action and its
seven fields to `GRANT_PARAMETER_FIELDS`; add exact event matching in
`protectedParametersMatchEvent`; emit `challenge-requested` and
`challenge-superseded` carrying this action as event-v2; and add request-grant
flags for record ID, current review ID, triggering execution ID, mode, resulting
ordinal, normalized reason digest, and successor review ID. The generated
exhaustion action renders those exact flags and values. It does not overload
`start --record-id`; each command retains its own closed grammar and help.

For a granted ordinal greater than one, `recovery-claimed` is appended from
`intervention-required`: it consumes its own challenge, rejects any other live
challenge, applies the record authority mutation, clears the intervention, and
restores the sealed interrupted lifecycle state. Ordinal `1` remains the
intervention-free built-in claim and preserves its current lifecycle state.

When the built-in allowance is exhausted, `APR_RECOVERY_EXHAUSTED` identifies
the exact `enter-intervention --action additional-recovery` command as the sole
provider-resumption path. Status in that intervention emits the exact
`request-grant --action additional-recovery` parameters. If the human declines
or no eligible operation can be formed, the next action is
`peer-review abandon <workspace> --reason <text>`; starting a replacement record
for the same failed review is not presented as a retry workaround.

If startup authority policy is `unavailable` or no verifier is pinned,
`enter-intervention` for either protected action fails before mutation with
`APR_AUTHORITY_UNAVAILABLE`. Such a record still has its built-in recovery, but
cannot receive additional recovery or rotate its author. Exhaustion is terminal
for provider dispatch. If author rotation is required, the record is rendered
`incomplete-unavailable`; the human may explicitly start a new record whose
startup provenance names the unavailable predecessor. The package never
presents that new record as an automatic retry.

#### Retry-current mode

`retry-current` retains the registered provider session and creates one new
execution contract carrying the recovery ID. It cannot change the reviewer,
provider, model request, or runtime ownership. If the provider session cannot
be proved continuous, the mode is refused; the already consumed recovery may
only finish the same transaction through its sealed parameters.

#### Replace-attempt mode

`replace-attempt` derives a deterministic successor ID from the recovery claim,
then creates the successor with sealed lineage:

```json
{
  "record_id": "review-root",
  "root_review_id": "review-root",
  "predecessor_review_id": "review-current",
  "recovery_id": "recovery-...",
  "recovery_claim_digest": "sha256:...",
  "recovery_ordinal": 1
}
```

The claim-derived successor ID is authoritative; it is not the content-derived
ID used by the public `start` command. The recovery transaction uses an
internal successor creator that accepts only the sealed claim-derived ID. On
retry, an existing workspace is accepted only when its genesis context and
digests match the claim exactly; normal `start` collision and exact-retry paths
cannot adopt or overwrite it.

The successor may use a new artifact revision and output path, but it must
resolve to the same physical repository root and worktree boundary. Creation
fails on an existing nonidentical workspace or collateral reservation.

After creation, the predecessor independently validates the successor context,
genesis event, recovery receipt, and reciprocal lineage. Only then does the
transaction append the terminal `superseded` event. The event includes the
successor review ID, successor workspace path, successor authority digest, and
recovery ID.

The filesystem writes are not falsely described as one atomic write. The
authoritative claim is committed first; deterministic reconciliation finishes
the same successor and supersession after interruption.

Collateral reservation is file-scoped, not directory-exclusive. With the
default record-scoped template, same-day predecessor and successor attempts may
legitimately share one destination directory because every generated filename
is prefixed by its distinct `review_id`; this is not a collision. A successor
created on a later date may resolve to another dated directory with the same
`record_id`. Reservation refuses only an occupied nonidentical exact output or
an incompatible reservation, and consolidation discovers both layouts from
sealed attempt paths rather than assuming one directory.

### Attempt lineage validation

A record reader walks from the root through validated successor receipts. Every
edge must prove:

- both attempts resolve within the same physical repository and worktree;
- both seal the same `record_id` and `root_review_id`;
- successor and predecessor IDs are distinct;
- the successor names the predecessor and the predecessor names the successor;
- the recovery ID and claim digest match exactly;
- the recovery ordinal increases by exactly one, with ordinal `1` using the
  built-in allowance and every higher ordinal naming its consumed grant; and
- no review ID repeats in the walk.

The valid v2 graph is therefore one linear chain whose length is bounded by the
built-in allowance plus individually granted recoveries. Contradictory evidence
such as a cross-record edge, self-reference, branch, cycle, reciprocal digest
mismatch, ordinal gap, or grant mismatch produces `lineage-invalid`. The record
remains available for inspection, but provider execution, recovery,
consolidation, and supersession mutation fail closed.

Absent evidence is different. A missing attempt workspace or receipt produces
`lineage-unavailable`, not `lineage-invalid`. Inspection continues and reports
the exact absent paths. Provider execution, recovery, and supersession mutation
remain unavailable until the evidence is restored, but absence is never
reported as contradiction.

Active attempt logs and in-progress reciprocal receipts remain machine-local in
the required ignored `.scratch/peer-review/<review-id>` workspaces. Cross-machine
recovery of a nonterminal record is out of scope. Package-owned cleanup,
including consolidation source removal and any future cleanup command, must
refuse to remove those workspaces while a recovery is pending or before terminal
lineage has been published. External deletion by `git clean`, direct filesystem
removal, CI checkout replacement, or an OS reaper is outside package control and
produces `lineage-unavailable`; the package does not claim it can prevent that
loss.

At terminalization, the package validates the complete available chain and
copies a minimal durable lineage receipt into the tracked terminal manifest.
That receipt contains the ordered attempt IDs, recovery ordinals, predecessor
and successor IDs, claim and reciprocal-receipt digests, consumed grant digests,
and the digest of each source event log; it contains no absolute path, handle,
credential, or transcript. The existing consolidation transaction preserves it
in `review-history.md` and `relocation-receipt.json` before deleting tracked
attempt sources. A complete terminal receipt permits consolidation and
post-consolidation inspection when scratch workspaces are absent; an incomplete
receipt leaves the record `lineage-unavailable` and cannot establish acceptance
or authorize mutation.

If a nonterminal record loses required scratch evidence and no complete terminal
receipt exists, its disposition is permanently `incomplete-unavailable`. It is
not protocol-abandoned or accepted, and no surviving attempt may be mutated to
fabricate either state. Inspection renders every retained tracked artifact and
the exact missing attempt IDs and paths. The human may explicitly authorize a
new review record, whose startup provenance names the unavailable predecessor
record; that is a new review, not recovery, and is never generated as an
automatic next action.

The existing standalone `supersede` command remains available for non-recovery
disposition. It may reference only an already existing, independently readable,
same-record successor with a valid reciprocal edge. It never creates recovery
authority and cannot make an otherwise ineligible successor eligible for
launch.

### Current-event-authorized execution contract

The provider launch boundary changes from invitation-derived routing to
workspace-derived authority:

```text
peer-review launch-reviewer <workspace> --host claude \
  [--model <id> --effort <level> | --resume] [--preflight-only]
```

The old invitation-path form is a first-turn-only compatibility shim. It may
locate a workspace, but the invitation contributes no routing authority. It is
rejected when stale or when the current state is no longer `awaiting-reviewer`.

The package locks and inspects the workspace, derives the current next action,
and creates `ai-peer-review.execution-contract/v1` containing:

- execution, record, attempt, recovery, and participant identifiers;
- exact protocol sequence, revision, state, role, and turn;
- exact current response and artifact paths and digests;
- whether join is required;
- absolute package-owned join and submit invocations;
- provider host, requested model, and effort;
- provider session fingerprint for resume;
- exact permissions and prompt digest;
- executable-preflight and environment-policy digests; and
- creation time and bounded validity conditions.

First-turn execution includes `join` and `submit`. Later reviewer turns omit
`join`, preserve the registered session, and point to the new event-authorized
response. The launcher never reuses response 1 merely because it exists in the
original invitation or launch state.

Immediately before dispatch, the launcher reacquires the attempt lock and
proves that the contract's sequence, revision, current actor, participant,
response, and recovery status still match. Any drift invalidates the contract.
Under that lock it compare-and-appends `execution-started`, completes the
projection write, and releases the lock **before** calling `execFile`. The child
must never inherit or contend with a launcher-held review lock because `join`
and `submit` acquire the same non-reentrant lock. The interval between lock
release and process creation is an accepted bounded TOCTOU window: any competing
mutation advances authority, and the launched child's own `join` or `submit`
then fails closed against the stale contract.

### Launch state and execution events

The provider launch-state file becomes a session-continuity record rather than
a frozen first-turn contract. It retains the opaque provider handle privately,
the session fingerprint, and an ordered history of execution IDs. The current
response, protocol revision, and permission contract rotate with each turn.

The event enum adds:

- `recovery-claimed`, which advances protocol revision;
- `intervention-cancelled`, which restores an operator-initiated authorization
  intervention and advances protocol revision;
- `execution-started`, which records dispatch intent without changing review
  turn state or protocol revision; and
- `execution-resolved`, which records normalized provider outcome without
  replacing submission authority or advancing protocol revision.

`recovery-claimed` and `author-session-rotated` are members of the new
`AUTHORITY_MUTATION_EVENT_TYPES` category, which is a subset of
`LIFECYCLE_EVENT_TYPES`, not a disjoint event class. Its members additionally
mutate record-scope authority and advance revision because they irrevocably
change spending/successor authority or the registered author, so grants formed
against the earlier world must be re-signed. Neither event belongs in
`STATE_PRESERVING`.

The lifecycle table adds
`intervention-required|recovery-claimed -> restore`,
`intervention-required|author-session-rotated -> restore`, and
`intervention-required|intervention-cancelled -> restore`. The lifecycle
reducer also has an explicit dynamic-preserve case for an intervention-free
ordinal-1 `recovery-claimed`; that event returns its incoming active state
rather than requiring one transition-table entry for every state. Reducer
ordering is: consume the event's own protected grant when required, reject any
other live challenge, apply the authority mutation, advance revision, and
either preserve the current lifecycle state for the built-in recovery or
restore the intervention's sealed interrupted state for a granted recovery or
author rotation. Classification as lifecycle events subjects both authority
mutations to the terminal-state guard and the intervention live-challenge
guard.

Both execution events advance event sequence only. This prevents routine
dispatch accounting from invalidating a live Human Authority challenge that is
bound to protocol revision. Their actor is the authenticated registered author
that created the launch contract. Reconciliation also requires a current
runtime identity matching that author. `system` is reserved for deterministic
package projections and cannot append recovery or execution authority.

This is deliberately session-strict. `launch-reviewer` requires the live
registered author session, not merely the same provider, host, OS user, or
model. Existing participant-loss recovery is not a rotation mechanism: in
manual and resume-only transport it cannot enter the required intervention, and
its state, current-actor, and outgoing-claim preconditions do not match ordinary
reviewer-launch states.

Author rotation therefore uses a distinct protected operation:

```text
peer-review rotate-author <workspace> --grant <signed-grant>
```

The new `rotate-author-session` Human Authority action binds `record_id`,
`review_id`, outgoing registered author fingerprint, incoming runtime author
fingerprint, current sequence and revision, and the current lifecycle state. It
is available through the `author-rotation` operator-initiated intervention from
every listed active state, in manual, resume-only, and automatic-required
transport, without requiring an outgoing claim or participant-loss
intervention. The invoking runtime supplies the incoming author identity; the
intervention and grant name both fingerprints exactly.

Implementation adds the action and fields to `GRANT_PARAMETER_FIELDS`, exact
matching to `protectedParametersMatchEvent`, the action to the event-v2
challenge enum, and its closed request-grant flags. The protected event type is
`author-session-rotated`, a member of `AUTHORITY_MUTATION_EVENT_TYPES`. Its actor
is the Human Authority attestation signer fingerprint because the incoming
author is not registered yet. The mutation consumes its own challenge, rejects
any other live challenge, replaces only the registered author participant,
preserves claims, clears the intervention, restores the sealed interrupted
lifecycle state, advances protocol revision, and records both fingerprints. It
cannot replace the reviewer or spend recovery authority.

A multi-day review may consequently require a new human signature after each
author-session rotation; that cost is accepted to keep provider dispatch and
its spending evidence bound to a registered participant rather than an
unauthenticated local process. `recover --reclaim` and
`recover --replace-participant` retain their existing claim-loss meanings and
are not presented as rotation remedies.

`execution-started` is appended after final preflight and immediately before
process dispatch. Its payload contains only digests and non-secret identifiers.
A started execution without a conclusive resolution is `outcome-unknown`.

An authoritative reviewer submission event remains stronger than launcher
process status. If submission exists after a timeout or crash, reconciliation
resolves the execution as submitted. If neither submission nor conclusive
no-dispatch evidence exists, another dispatch requires the built-in recovery or
an exact additional-recovery grant.

Normalized outcomes are:

- `not-dispatched`;
- `submitted`;
- `permission-blocked`;
- `failed`;
- `outcome-unknown`; and
- `identity-conflict`.

Permission denial is compared only with the contract's current response path.
Denial against response 1 cannot classify a later-turn contract.

`permission-blocked` proves that provider dispatch occurred and therefore
remains spending for recovery accounting, even when the likely cause is package
permission encoding. The package cannot safely infer billing or exempt itself
from the allowance based on blame. The built-in preflight reduces this risk;
after the built-in recovery, another dispatch requires the exact Human
Authority grant described above.

When the provider process returns without registering a reviewer, outcome
classification preserves a bounded sanitized adapter, executable, identity,
schema, join, or permission cause when one is available. A generic
missing-reviewer result must not replace the more specific cause. Raw provider
output, session handles, credentials, and unbounded stderr remain private.

### Executable and environment preflight

Preflight runs automatically for every launch and is independently available
through `--preflight-only`. It performs no model invocation.

The package command is rendered as the absolute Node executable plus the
absolute package-owned `bin/peer-review.mjs`, never bare `peer-review`. The
provider adapter resolves one canonical absolute executable, refuses symlinks
or unexpected replacement according to adapter policy, and runs only its
documented non-model version/capability probe. The adapter records path,
version, capability result, and safe file identity in a preflight report.

Preflight must also encode the exact argv into the provider's permission grammar
and prove that the current platform paths are representable. If an absolute
Node, package, provider, workspace, or response path contains syntax the
provider grammar cannot express safely, launch fails before
`execution-started` with `APR_PERMISSION_UNREPRESENTABLE`. There is no fallback
to a bare command, PATH lookup, shell alias, or broader permission glob. A
future package-owned wrapper is permissible only as a separately specified,
canonical, digest-bound executable boundary.

The error's recovery text names the concrete operator action: install or select
Node and the provider executable at canonical paths representable by the
provider permission grammar, then rerun preflight. It must not suggest quoting,
aliasing, PATH lookup, or weakening the rule.

Provider permissions contain the exact absolute join, submit, and response
rules from the current contract. Readiness proves the current response is
allowed while the artifact and neighboring response files are rejected.

The child environment is built by a provider-specific allowlist policy:

- preserve required operating-system, locale, provider authentication, and
  non-identity provider configuration variables;
- remove session and model variables belonging to every provider, including
  the launched provider, when inherited from the launching participant;
- remove caller-supplied session and model values that the child could mistake
  for provider-observed evidence;
- remove package-manager and runtime injection variables not explicitly needed
  by the adapter; and
- never serialize environment values into events, reports, or errors.

For the Claude adapter this mandatory removal set includes
`CLAUDE_CODE_SESSION_ID`, `CLAUDE_SESSION_ID`, `CLAUDE_MODEL_ID`, and
`CLAUDE_MODEL_DISPLAY`. Adapter identity-key lists are closed, versioned policy
inputs. Same-provider removal is required for author/reviewer distinctness; it
is not merely cross-provider hygiene. Authentication variables may remain only
when the adapter classifies them as credentials that cannot assert session or
model identity.

The report records allowed and removed variable names plus a policy digest, not
their values. Package-side readiness remains a deterministic encoder/matcher
self-check, not proof that the provider will enforce the rule identically. An
adapter must run a real provider-side non-model permission probe when the
provider documents one; otherwise the report marks provider enforcement
`unverified` and the conservative post-dispatch rule above applies. Any
incompatible executable, unsafe or unrepresentable path, failed available
capability probe, permission mismatch, or environment-policy failure stops
before `execution-started` and does not consume recovery.

### Session assurance and model attribution

Participant distinctness continues to depend on provider-scoped session
fingerprints, never model names. Raw provider session handles remain private.

New participant evidence separates two questions:

```json
{
  "session": {
    "fingerprint": "sha256:...",
    "source": "provider-result",
    "assurance": "observed"
  },
  "model": {
    "requested_id": "claude-opus-5",
    "declared_id": null,
    "observed_id": null,
    "source": "launch-request",
    "assurance": "declared",
    "conflict": false
  }
}
```

Session sources distinguish official runtime injection, provider structured
results, explicit declarations, and legacy-unclassified data. Model sources
distinguish launch request, configuration, environment declaration, provider
structured result, and legacy-unclassified data.

Environment and configuration values are declarations. A package-generated
launch request proves what was requested, not what the provider executed. Only
an adapter-defined authoritative provider observation may set model assurance
to `observed`. If no such observation exists, the requested or declared model
is retained with declared assurance.

Conflicting requested, declared, and observed model IDs are preserved as
separate values. A conflict fails the current execution when it undermines its
registered participant or policy contract; status and inspection still render
the evidence truthfully.

The existing participant display fields remain readable compatibility mirrors.
They remain required on v2 participant events because response and manifest
renderers consume them. New v2 participant events additionally require the
separated evidence object.

Event schema selection is per event, not per log. Event-v1 lines retain the
existing exact eight-field participant validator. Event-v2 lines use a new
exact participant-v2 validator requiring those compatibility mirrors plus the
nested `session` and `model` evidence object. The v2 reducer validates each line
according to its own envelope schema and normalizes both shapes into one
internal projection, so a legacy v1 `review-created` followed by a v2
`reviewer-joined`, `identity-changed`, or `participant-replaced` event is valid.
Legacy `identity_source: runtime` is mapped to `legacy-unclassified`, not
retroactively treated as verified model provenance.

New event types and payloads use `ai-peer-review.event/v2`; existing v1 bytes
are never rewritten. Compatibility is event authority, not a mutable sidecar or
a retrofit to an existing v1 startup digest.

For a new v2 record, the event-v2 `review-created` payload contains an exact
`compatibility` block with `minimum_reader_version`,
`minimum_writer_version`, and the closed accepted-event-schema list.
`review-created` remains the single genesis event at sequence 1, revision 1, and
`initializeReview` retains one atomic `atomicCreate` of that one-line log. The
event-v1 `review-created` validator and existing bytes remain unchanged.

For a legacy or mixed record, a `compatibility-declared` event-v2 line is
appended sequence-only immediately before the first other event-v2 line. Its
actor is `system` because it is a deterministic package projection, and its
`review_id` must equal the already registered protocol review ID. A v2 reader
refuses any later event-v2 line unless either the v2 genesis block or the
immediately preceding upgrade declaration establishes compatible minimums and
schemas.

When launch creates the first v2 events in a legacy log, one locked
compare-and-append batch writes `compatibility-declared` followed by
`execution-started`, updates projections for the ordered pair, and releases the
lock before dispatch. Operator entry into `recovery-authorization` or
`author-rotation` likewise uses the batch when its expanded event-v2
`intervention-entered` payload is the legacy log's first v2 event: the ordered
pair is `compatibility-declared` then `intervention-entered`. The batch is
all-or-nothing at the event-log write boundary; neither path exposes a
declaration-only intermediate log. This requires a new
`mutateReviewBatch`/`appendLockedEvents` primitive; the existing one-event
`mutateReview` and `appendLockedEvent` functions are not silently assumed to
provide batching.

An already-published old binary cannot be made to understand an event-v2
`review-created`, `compatibility-declared`, or any later exact-key event
retroactively; it may still fail with `APR_EVENT_INVALID`. Compatibility
authority protects v2-capable readers and newly generated commands, not legacy
binaries. Generated invitation, resume, recovery, and zero-install commands pin
the exact creator package version, and participant preflight refuses an
installed version below the declared minimum before mutation. Unknown event
tolerance is not introduced because skipping authority-changing events would
make read-only projections unsafe.

## State model

Attempt protocol state remains local to each immutable attempt. Record state is
derived from the validated chain:

| Record state             | Meaning                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `active-initial`         | Root attempt is active and no recovery is claimed.                |
| `recovery-pending`       | A recovery is claimed but its sealed operation is incomplete.     |
| `active-recovery`        | The recovered execution or successor is active.                   |
| `recovery-exhausted`     | No further dispatch is authorized without an exact signed grant.  |
| `accepted`               | One attempt holds valid terminal acceptance authority.            |
| `abandoned`              | The record was explicitly abandoned without acceptance.           |
| `lineage-unavailable`    | Required local evidence is absent but no contradiction is proven. |
| `incomplete-unavailable` | Nonterminal authority was lost and cannot be restored.            |
| `lineage-invalid`        | Available record evidence is contradictory.                       |

An accepted record cannot recover. An abandoned, unavailable, permanently
incomplete, or invalid record cannot launch. A complete tracked terminal lineage
receipt may restore inspection and consolidation from `lineage-unavailable`, but
it cannot restore provider execution. If multiple attempts appear to hold
acceptance, record inspection reports invalid terminal authority and fails
closed.

## Failure and crash recovery

The transaction is deterministic at every interruption boundary:

| Interruption point                                        | Result                                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Before `recovery-claimed`                                 | No recovery consumed.                                                                              |
| After claim, before recovered dispatch                    | Recovery consumed; identical command completes it.                                                 |
| After claim, before successor creation                    | Same deterministic successor is created on retry.                                                  |
| After successor creation, before predecessor supersession | Successor receipt is validated, then supersession completes.                                       |
| After `execution-started`, before process result          | Reconcile submission authority; otherwise outcome is unknown.                                      |
| After submission, before launcher return                  | Submission event wins and execution resolves as submitted.                                         |
| After conclusive no-dispatch proof                        | Same execution may be reconstructed without charging recovery.                                     |
| Process exits while holding the review lock               | Prove the owner instance dead, retain the stale lock, reclaim, and resume the identical operation. |
| Process exits in `initializeReview`; owner proven dead    | Automatically retain the stale lock receipt; identical `start` then creates genesis.               |
| Process exits in `initializeReview`; liveness unknown     | Run confirmed `reclaim-lock`, retain its receipt, then rerun identical `start`.                    |

The package never deletes or rewrites evidence during reconciliation. A
collision, changed digest, or mismatched retry stops with retained paths.

The review lock contract is extended for crash safety. A lock records its
random token, PID, acquisition time, host identity, boot identity, and a
platform-derived process-start identity. Acquisition distinguishes:

- a matching live process instance: `APR_REVIEW_LOCKED`, with no reclamation;
- a provably absent process instance: `APR_REVIEW_LOCK_STALE`; and
- unavailable or ambiguous liveness evidence:
  `APR_REVIEW_LOCK_LIVENESS_UNKNOWN`, which fails closed.

The same host with a different boot identity is provably absent and is
automatically reclaimable: no process survives the recorded boot. On the same
boot, PID absence or a mismatched process-start identity is also proof of death;
PID equality without a start-identity match never proves liveness.

When death is proven, reclamation compare-checks the complete lock digest,
atomically renames the lock into a retained `locks/stale/` receipt, fsyncs the
directory, and retries the same compare-and-append operation. PID absence alone
is insufficient because of PID reuse. Reclamation is automatic only for a
provably dead matching host/boot/process identity. Unknown or foreign-host locks
require an evidence-preserving, explicitly confirmed operator action:

```text
peer-review reclaim-lock <workspace> --lock-digest <sha256> --reason <text> \
  --confirm-reclaim
```

`--confirm-reclaim` follows the existing explicit-confirmation-flag pattern used
by `setup --confirm-scratch-exclude`; the command introduces no TTY, stdin, or
prompt dependency. It displays the owner record in dry inspection output,
requires the supplied lock digest to match exactly, normalizes the reason by the
recovery-reason rules, and atomically moves the lock into `locks/stale/` with a
directory fsync. The retained receipt is the authoritative evidence of
reclamation and records the prior bytes and digest, operator identity when
available, normalized reason digest, host evidence, and timestamp.

When a reducible nonterminal event log exists, the command may then acquire a
new lock and append an optional sequence-only `lock-reclaimed` projection. If
the log is absent because the process died inside `initializeReview`, or is
terminally sealed, reclamation succeeds from the retained receipt alone. A
crash after rename remains reconcilable from that receipt. Read-only status and
inspection never acquire the review lock and remain available while the stale
lock exists.

The package has no Full-Auto runtime concept and does not claim to detect one.
Project and agent skill policy must forbid autonomous invocation; this is a
documentation control, while the package enforces the exact digest, explicit
confirmation flag, proven-live refusal, retained receipt, and no-dispatch
semantics. The command never silently deletes a lock, dispatches a provider,
changes recovery mode, or consumes another allowance.

Stable errors include:

- `APR_RECOVERY_EXHAUSTED`;
- `APR_RECOVERY_CONFLICT`;
- `APR_AUTHORITY_UNAVAILABLE`;
- `APR_AUTHOR_ROTATION_INVALID`;
- `APR_INTERVENTION_CANCEL_INVALID`;
- `APR_RECORD_ID_INVALID`;
- `APR_LAUNCH_TARGET_INVALID`;
- `APR_LINEAGE_INVALID`;
- `APR_LINEAGE_UNAVAILABLE`;
- `APR_REVIEW_LOCKED`;
- `APR_REVIEW_LOCK_STALE`;
- `APR_REVIEW_LOCK_LIVENESS_UNKNOWN`;
- `APR_READER_UPGRADE_REQUIRED`;
- `APR_WRITER_UPGRADE_REQUIRED`;
- `APR_EXECUTION_STALE`;
- `APR_EXECUTABLE_INVALID`;
- `APR_PERMISSION_UNREPRESENTABLE`;
- `APR_ENVIRONMENT_INVALID`; and
- `APR_MODEL_PROVENANCE_CONFLICT`.

`APR_RECOVERY_EXHAUSTED` returns the record and current attempt IDs, recovery
and execution IDs, last normalized outcome, retained evidence paths, and a
human-intervention next action. It never prints a provider retry command.

That record-aware suppression applies to the launch-result `recovery` field,
`status --json`, `status --next`, and `resume`. Offline `explain
APR_RECOVERY_EXHAUSTED` has no workspace and therefore cannot project a record;
its static catalogue text must never contain a provider retry command and
instead directs the operator to inspect record status. Before exhaustion, any
generated launch command uses the workspace form, never the deprecated
invitation form. At exhaustion, record-aware outputs contain only the exact
`enter-intervention --action additional-recovery` action when eligible. Within
that intervention they contain the exact `request-grant` action, the exact
`cancel-intervention` rollback action, or terminal `abandon` action. With
unavailable Human Authority they report terminal exhaustion without a
provider-resumption command.

## Legacy compatibility and adoption

Existing v1 attempts remain readable and may finish ordinary already-authorized
turns. They are not silently rewritten or upgraded.

Existing multi-attempt records created with `start --record-id` are v1 records
for recovery purposes. They remain eligible for the existing read-only record
index and consolidation rules, but they do not gain v2 launch or recovery
authority until `adopt-record` validates the complete supplied attempt set.
Consolidation remains available during rollout for already-valid v1 records;
new v2 successors are produced only by `recover-record`.

A legacy record enters the new recovery workflow only through explicit adoption:

```text
peer-review adopt-record <workspace>... --current <workspace>
```

The operator must supply the complete claimed attempt set. Adoption:

1. resolves every workspace physically;
2. verifies repository and worktree identity;
3. verifies artifact kind, artifact path, and `record_id`;
4. validates a single linear successor chain;
5. classifies prior launcher executions and replacements conservatively;
6. refuses missing, branching, cyclic, or ambiguous evidence; and
7. appends an adoption receipt to the current attempt without rewriting prior
   bytes.

Any proven prior retry or replacement consumes the allowance. Ambiguous paid
execution is counted as executed. When the historical execution count cannot be
established, adoption may preserve inspection but must mark recovery exhausted.

Legacy supersession pointers to missing attempts remain readable as unavailable.
Pointers to another record, the same attempt, a branch, or a cycle render their
exact invalidity. Neither condition authorizes provider launch or further
supersession; consolidation requires either restored workspaces or a complete
tracked terminal lineage receipt.

## Security and privacy

- Raw provider session handles remain only in ignored provider launch state.
- Events store fingerprints and digests, not handles, credentials, environment
  values, or provider transcripts.
- Preflight reports list environment variable names only.
- Absolute executable and workspace paths remain local scratch evidence and are
  excluded from tracked review collateral unless an existing manifest contract
  explicitly permits them.
- All paths are resolved physically, contained within the expected repository
  or configured executable boundary, and checked for unsafe symlinks.
- Package command permissions use exact absolute argv rendering with
  `shell: false`.

## Verification strategy

Implementation follows red-green-refactor with deterministic fake executables
and injected provider results. No live or paid provider is needed.

### Unit coverage

- Event validation and reducer projections for recovery and execution events.
- V2 genesis compatibility blocks, legacy-upgrade `compatibility-declared`
  ordering for both execution start and authorization-intervention entry,
  minimum versions, and refusal of v2 events lacking authority.
- Per-event v1/v2 participant validation, mixed-log normalization, and required
  v2 compatibility mirrors.
- Record state derivation and every valid and invalid lineage edge.
- Distinct `lineage-unavailable` and `lineage-invalid` projections, terminal
  lineage receipts, and post-consolidation inspection.
- Compare-and-append recovery races and idempotent retries.
- Consume-then-check live-challenge handling and exact single-use
  additional-recovery grants across canonicalization, event matching, v2
  challenges, and request-grant grammar.
- Deterministic successor derivation and reciprocal receipt validation.
- Current-turn response, command, and permission derivation.
- Package and provider executable resolution and capability refusal.
- Permission-grammar representability for Unix and Windows paths.
- Environment allowlist and same-provider plus cross-provider identity-variable
  removal.
- Session assurance and model attribution combinations and conflicts.
- Operator-initiated authorization intervention entry and restoration across
  each allowed lifecycle state and transport mode.
- The widened `interrupted_state` enum, lifecycle classification of authority
  mutations, both restore transitions, and dynamic preservation for an
  intervention-free ordinal-1 recovery claim.
- Exact-ID cancellation of both authorization-intervention reasons, including
  atomic closure of a bound live challenge, restoration, and refusal for every
  other intervention reason.
- `rotate-author-session` grant binding, interrupted-state restoration,
  transport independence, unrelated-challenge refusal, and reviewer/recovery
  isolation.
- Live, stale, PID-reused, foreign-host, and liveness-unknown review locks.
- Different-boot automatic reclamation and explicit-confirmation unknown-owner
  reclamation with retained receipts.
- Legacy participant and supersession rendering.
- Minimum reader/writer compatibility gates and exact generated package pins.
- Stable error and offline help output.

### Integration coverage

- Process restart after every recovery and execution checkpoint.
- Process death while holding the lock at each recovery checkpoint, proving
  stale-lock retention and deterministic resumption.
- Concurrent recovery claims from separate processes.
- Same-session retry followed by attempted successor replacement, and the
  reverse, proving one shared allowance.
- One built-in recovery, refusal at exhaustion, one exact signed additional
  recovery, grant replay refusal, and Full-Auto inability to mint the grant.
- Authority-unavailable exhaustion and author rotation producing no grant or
  provider-resumption path.
- Declined, expired, and unsigned author-rotation authorization followed by
  `cancel-intervention`, proving the sealed state is restored without a grant,
  participant session, abandonment, or provider dispatch.
- Changed artifact revision, response path, output path, PID, and attempt ID not
  resetting the allowance.
- Two or more normal reviewer turns without recovery charges.
- Author session rotation refusing `launch-reviewer`, followed by
  operator entry into `author-rotation`, an exact signed `rotate-author`
  mutation without claim or participant-loss preconditions, restoration of the
  interrupted state, then successful launch.
- Later-turn permission denial against the exact current response.
- Permission-blocked dispatch consuming recovery and suppressing every generated
  retry surface at exhaustion.
- Stale invitation and stale launch-state refusal.
- Workspace/invitation positional disambiguation and invalid-target refusal.
- Preflight-only proving that the model process was never invoked.
- Unrepresentable absolute argv refusing before dispatch without a bare-command
  fallback.
- Known no-dispatch, permission-blocked, failed, and unknown outcomes.
- Explicit adoption of valid legacy records and conservative refusal or
  exhaustion for ambiguous records.
- Missing lineage producing unavailable state; cross-record,
  self-referential, branching, cyclic, and digest-conflicting successors
  producing invalid state.
- External scratch deletion producing honest `incomplete-unavailable` rendering
  without fabricated abandonment, acceptance, or automatic new-record startup.
- Legacy `start --record-id` disposition, recovery-created successor collision,
  and exact idempotent successor recreation.
- Same-day attempts sharing one record-scoped destination with distinct
  review-ID-prefixed files, and next-day attempts using distinct dated
  directories without false reservation collisions.
- Lock release before provider process creation, with child `join` and `submit`
  acquiring the lock successfully.

An incident-shaped fixture reproduces #56: initial execution, failed later
reviewer turn, one built-in recovery, then another requested dispatch without a
grant. The extra dispatch must fail with `APR_RECOVERY_EXHAUSTED` before provider
invocation while all prior evidence remains readable. A separate fixture proves
that an exact signed grant authorizes only that one additional operation.

### Repository gates

The complete delivery gate includes:

```text
npm test
npm run test:slow
npm run test:packaging
npm run lint
npm run format:check
```

Focused suites should be added for recovery authority, execution contracts,
provider preflight, provenance, lineage, and incident regression. Packaging and
golden tests must prove the new CLI, help, schemas, and public exports ship in
the npm artifact.

## Rollout and compatibility policy

- New reviews use context v2 and the new execution contract.
- V2 readers support event-v1, event-v2, and mixed logs using per-event
  validation. Active v1 reviews are not mutated automatically.
- `start --record-id` is deprecated for removal in the next major version. In
  v2 startup it is a strict compatibility no-op accepted only when equal to the
  generated initial review ID; any other value fails with
  `APR_RECORD_ID_INVALID`. Existing v1 multi-attempt records require explicit
  adoption before v2 recovery.
- The invitation-path launch form is deprecated and limited to validated first
  turns.
- `launch-reviewer` becomes session-strict: an author-session rotation requires
  operator entry into `author-rotation` and signed `rotate-author` before
  another launch. Help and migration notes state this multi-session cost
  explicitly; participant-loss recovery is not used.
- `launch-reviewer` resolves its one positional physically. A directory
  containing the expected event log is a workspace. A regular file whose
  generated metadata identifies it as that workspace's
  `reviewer-invitation.md` is the first-turn-only shim. Any other path or an
  ambiguous match fails with `APR_LAUNCH_TARGET_INVALID`. Usage, help, and
  golden output document both forms.
- Bare provider and package executable invocation is removed from automated
  launch paths.
- `reclaim-lock` is an explicit-confirmation degraded recovery for unknown owner
  liveness. The package retains the prior lock and records the action; project
  and skill policy, not a nonexistent package mode detector, forbids autonomous
  invocation.
- Generated participant commands pin the exact creator package version;
  preflight refuses installed packages below the sealed minimum before reading
  or mutating v2 authority. A deliberate compatible upgrade regenerates the
  command from current authority rather than floating an existing invitation.
- `enter-intervention` adds only the closed `additional-recovery` and
  `rotate-author-session` actions, mapped to `recovery-authorization` and
  `author-rotation` reasons. It pauses and later restores the prior lifecycle
  state; it grants no authority by itself.
- `cancel-intervention` reverses only those two operator-initiated reasons by
  exact intervention ID, closes their bound challenge, and restores the sealed
  lifecycle state without a grant or registered-participant requirement.
- Records with unavailable Human Authority retain the built-in recovery but
  cannot use either new protected escape hatch.
- A preflight failure is non-spending and non-recovery-consuming.
- A post-dispatch unknown outcome is spending-ambiguous and requires recovery.
- A post-dispatch permission block is spending for recovery accounting even
  when package permission encoding is the likely cause.
- No feature flag or Full-Auto option disables the built-in limit or fabricates
  an additional-recovery grant.

## Planning decomposition gate

This specification deliberately describes one architecture rather than five
predetermined deliveries. Planning must estimate and map these dependency seams:

1. Record lineage, recovery claims, record state, and legacy adoption.
2. Event-derived execution contracts and current-turn routing.
3. Executable and environment preflight.
4. Session assurance and model attribution.
5. CLI compatibility, help, fault injection, packaging, and incident regression.

Planning must then choose one disposition:

### One atomic story

Keep #57 as the implementation story and retire #58-#61 as superseded when the
change cannot be merged safely in smaller increments. The plan must demonstrate
that the estimate and review surface remain manageable.

### Rewritten existing stories

Rewrite #57-#61 around coherent, independently safe vertical increments with
explicit dependencies. An intermediate merge may add dormant schemas or
read-only inspection, but it may not expose a launch path with only part of the
invariant enforced.

### Replacement epic

Retire #57-#61 with explicit supersession links and create a replacement epic
when the implementation exceeds one independently reviewable story but the
existing issue boundaries do not match safe increments.

No issue is rewritten, closed, or replaced until the implementation plan is
reviewed and accepted. Historical issue bodies remain provenance even if their
delivery disposition changes.

Each resulting story may chain at most one newly discovered defect. A second
defect discovered while delivering that story must be resolved within the same
story or the work must stop for human direction; it may not create another
unbounded defect chain.

## Acceptance criteria for the architecture

1. One logical record permits one built-in recovery operation regardless of
   recovery mode, process restart, artifact revision, output path, attempt ID,
   or concurrent claim; each additional operation requires a distinct exact
   signed Human Authority grant, while normal event-authorized turns inside the
   active attempt remain permitted.
2. Ordinary successful turns and proven no-dispatch bookkeeping retries do not
   consume recovery.
3. Unknown post-dispatch outcomes cannot be retried without consuming recovery.
4. Every provider launch derives its response and commands from current event
   authority and rejects stale invitation or launch-state routing.
5. Package and provider executables, permissions, environment, and compatibility
   must pass preflight before provider dispatch.
6. Supersession proves a real, distinct, acyclic, same-record successor in the
   same repository and worktree; missing evidence is reported as unavailable,
   while contradictory evidence is invalid.
7. Session identity assurance and model attribution are separately represented;
   caller declarations are never labeled verified observations.
8. Legacy records remain readable to v2 readers, mixed v1/v2 logs validate per
   event, package compatibility is checked before mutation, and recovery
   adoption is explicit, conservative, additive, and fail-closed.
9. Recovery exhaustion stops before provider invocation with stable structured
   evidence and no generated retry command on any result surface; only an exact
   grant request or terminal abandonment is suggested.
10. Planning, rather than this specification, determines the final governed
    issue decomposition.

## Open planning questions

The implementation plan must resolve these repository-grounded details without
weakening the approved invariants:

- The exact event payload field names within the invariant that execution
  accounting advances sequence only and does not advance protocol revision.
- The provider adapter capability contract for canonical executable identity
  and version probing on each supported platform.
- The per-platform boot and process-start identity primitives for lock liveness,
  including exact shell-free argv where an OS utility is unavoidable and the
  degraded unknown-liveness classification when no safe primitive exists.
- The minimum safe provider environment allowlist for macOS, Linux, and Windows.
- Whether legacy adoption ships in the first implementation increment or as a
  blocked compatibility increment before automated recovery is enabled for v1.
- The smallest merge order that never exposes a bypass between recovery,
  lineage, preflight, launch, and provenance enforcement.
