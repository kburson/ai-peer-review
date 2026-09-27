# Agent-First Review API and Portable Runtime Design

## Document Status

- **Date:** 2026-09-27
- **Issue:** #107
- **Status:** Revised after the accepted XPR with the controller-only/headless-worker normalization; requires follow-up review and plan reconciliation
- **Scope:** Controller-supervised SAR/SPR/XPR, headless participants, agent-first API, portable supervision, durable evidence, and review analytics
- **Related work:** #39 project-local broker, #88 provider authority and recovery, #90 Claude launch identity, #102 install/version policy, and #106 manual XPR startup

## Summary

AI Peer Review will expose one agent-first structured API capable of running a
single requested SAR, SPR, or XPR stage or an explicit ordered sequence. The
user selects the pattern and sequence in natural language. The host agent
translates that intent into one versioned JSON request. The runtime validates
the complete request before mutation, resolves provider capabilities and
configured fallbacks, then runs every participant through a portable
project-local broker.

SAR, SPR, and XPR describe review participants. They do not describe process
placement, controller ownership, or transport. The runtime has one normalized
topology: the originating session is a non-participant controller, and every
review role is a broker-supervised headless session. SAR has one headless
participant performing critique and revision; SPR and XPR have distinct
headless author and reviewer participants. The controller never becomes an
author, reviewer, or SAR worker merely because it requested or supervises the
run.

This normalization is an observability requirement, not just a simplification.
Provider usage, hidden reasoning counters, cache usage, API duration, process
health, retries, and reported cost are visible most reliably at the boundary
that launches and supervises a provider session. An agent cannot be the sole
authority for measuring its own complete resource use because some metrics are
emitted only after or outside its model turn. Keeping the controller outside
all participant sessions lets the broker capture comparable attempt-level
telemetry for SAR, SPR, and XPR without self-reporting gaps or controller and
participant usage being conflated. Missing provider telemetry remains explicit;
external supervision improves measurement coverage but does not invent values.
The visible host session also remains available for user interaction,
intervention, and progress reporting instead of being occupied by review work.

The project-local broker is an on-demand background Node.js service written
entirely in portable JavaScript. It uses loopback TCP with an operating-system
assigned ephemeral port. The package ships no native addon, custom executable,
post-install compilation, node-gyp requirement, per-platform artifact, or
runtime binary download. MCP is the preferred host adapter. The CLI is the last
fallback and accepts the identical request and response schemas.

The originating chat receives an immediate receipt and a continuously updated
out-of-band monitor on a validated host surface. Runtime waiting consumes no
controller model tokens; host-imposed model wakeups are accounted separately.
On hosts with `host_wait_capability=single-wakeup`, the controller model wakes
only for intervention or a terminal result. Participant work continues through originating-chat
disconnects.

Each round binds reviewer findings, the author response, and a
supervisor-generated patch to exact before/after artifact digests. The current
File Under Review (FUR) remains the only working copy. Normalized evidence
supports later analysis of model, provider, pattern, pattern sequence, quality,
duration, and token efficiency without preserving raw provider exhaust in Git.

## Goals

- Support SAR from a request such as “run an SAR on this spec” by launching one
  headless participant under a non-participant controller.
- Support SPR and XPR with distinct headless author and reviewer sessions.
- Use one controller/participant boundary for every review class.
- Let users request one stage now or an ordered sequence up front.
- Preserve participant identity, exact-session continuity, artifact binding,
  atomic state, reviewer/author boundaries, and fail-closed recovery.
- Eliminate polling model turns while continuously informing the user.
- Continue eligible runs through disconnects and preauthorized quota fallbacks.
- Ship one production npm package with no target-specific build or binary.
- Produce compact, versioned evidence for audit and process mining.
- Make CLI, MCP, schemas, examples, errors, and help self-discoverable.

## Non-Goals

- Adding review stages the user did not request.
- Silently weakening a requested participant roster or fallback policy.
- Counting the controller as an author or reviewer merely because it supervises.
- Allowing an attached participant path that prevents complete external
  supervision or conflates controller and participant telemetry.
- Using MCP as protocol authority or lifetime owner of a headless run.
- Running a machine-wide broker daemon.
- Resisting malicious software already running as the same OS user.
- Tracking credentials, private handles, or raw provider transcripts.
- Automatically committing the FUR or evidence bundle.
- Ranking models from acceptance alone without outcome evidence.

## Review Model

### Review Class

- **SAR:** One selected headless participant performs both critique and revision.
- **SPR:** Author and reviewer are distinct sessions in one provider family.
- **XPR:** Author and reviewer are distinct sessions in different provider
  families.

The class is explicit user intent and is validated against the resolved roster.
A mismatch fails with a correction. A preauthorized fallback may change class
only by beginning a new, explicitly recorded replacement stage-attempt under
the original requested-stage budget. SAR cannot automatically become a two-party
class or vice versa; only SPR/XPR class changes retain the same role topology.

### Controller Role

The originating chat is always controller-only. It validates user intent,
launches the run, owns orchestration and artifact-integrity oversight, exposes
progress, selects only among sealed fallback choices, collects available
telemetry through the broker/adapters, authorizes intervention, and returns the
terminal result. It performs no critique or revision. The protocol calls this
role controller. “Orchestrator” remains acceptable user language but does not
create a review participant.

### Normalized Execution Topology

- **Controller:** The current host chat is outside the participant roster.
- **Headless participant:** The broker owns a provider process/session for the
  role and observes its execution envelope.
- **Managed:** The project broker owns lifecycle, routing, telemetry
  observation, fallback, and recovery for every participant role.

There is no attached or inline participant mode in the target runtime. Hosts
may present a review as “local” when the controller and provider processes run
on the same machine, but local describes deployment, not role co-location.

## Required User Journeys

1. **SAR:** The controller launches one headless participant that repeatedly
   critiques and revises the FUR until accepted or stopped.
2. **SPR:** The controller launches distinct headless author and reviewer
   sessions in one provider family.
3. **XPR:** The controller launches distinct headless author and reviewer
   sessions in different provider families.

Provider/model/effort selection can make a run cheap, deep, or cross-provider,
but it does not change this topology. Even when the controller and a participant
use the same model, they remain separate sessions with separate authority and
telemetry identities.

## User-Requested Sequences

A review sequence is exactly the ordered set of stages requested by the user.
Configuration supplies candidates and defaults; it never inserts a stage.

    “Run an SAR on this spec.”
      -> SAR

    “Start with an SAR and follow with an XPR.”
      -> SAR -> XPR

    “Run an SAR using GPT-6 Astra high, followed by an XPR with GPT-6
    Astra high as author and Claude Opus 5 as reviewer.”
      -> SAR[codex/gpt-6-astra/high]
      -> XPR[author=codex/gpt-6-astra/high,
             reviewer=claude/claude-opus-5/<configured-supported-effort>]

Every requested stage runs. Acceptance of an earlier stage does not cancel a
later independent review. Conditional execution occurs only when the user
expresses the condition.

Users may defer the decision. A later review of the same FUR is a new immutable
run linked automatically to the prior terminal run. Completed runs are never
reopened merely to append a newly requested stage.

## Canonical Start Request

All callers use one versioned, closed JSON request. CLI accepts inline JSON or
a filepath containing the same JSON. MCP accepts the object directly.

    peer-review start '{"schema":"ai-peer-review.start-request/v1",
      "request_id":"apr-request-...",
      "filepath":"spec.md",
      "stages":[{"kind":"sar"}]}'

    peer-review start --request .scratch/peer-review/request.json

Canonical minimal request:

    {
      "schema": "ai-peer-review.start-request/v1",
      "request_id": "apr-request-018f...",
      "filepath": "docs/superpowers/specs/example.md",
      "stages": [
        { "kind": "sar" }
      ]
    }

The canonical shape always contains stages; there is no top-level kind
shorthand. Filepaths resolve relative to the invoking physical worktree for
both input forms. Unknown fields fail. Credentials and raw handles are
forbidden.

The client generates request_id before the first call. Its namespace is the
physical worktree. The runtime stores the submitted request's canonical digest:
SHA-256 over the UTF-8 bytes of the following v1 canonical encoding of the
validated parsed value, before defaults or configuration resolution:

- Objects emit their members in lexicographic order of unsigned UTF-16 code
  units, with a shorter prefix first, using comma separators and a colon
  between each encoded key and value. Do not rely on object enumeration order.
- Arrays retain element order and use comma separators. Emit no whitespace
  outside strings. Booleans and null use their lowercase JSON literals.
- The closed v1 request permits numbers only in positive-safe-integer fields.
  Encode each validated number as ordinary base-10 digits without a sign,
  leading zeros, fractional part or exponent. Thus 6, 6.0 and 6e0 have one
  encoding. Other numeric values fail their field schema before hashing.
- Strings and keys retain their parsed values without Unicode normalization.
  Surround them with double quotes; escape quotation mark and backslash as
  \" and \\, and backspace, tab, newline, form feed and carriage return as
  \b, \t, \n, \f and \r. Encode other U+0000..U+001F characters as lowercase
  \u00xx escapes. Emit all other Unicode scalar values directly as UTF-8,
  including slash and non-ASCII characters. Reject lone UTF-16 surrogates.

Duplicate keys are rejected wherever raw JSON text is
available, including CLI input and raw MCP frames exposed to an adapter. An
already-parsed MCP object cannot prove absence of duplicate keys; the receipt
records input_validation.duplicate_keys as checked or not-observable. Equivalent
parsed values produce identical canonical bytes, without overstating validation.
The submitted filepath string is part of request identity: spec.md and
./spec.md conflict under the same request_id. Clients retain the original
request for retries; resolved physical paths are sealed separately for leases.
Configuration resolution is sealed separately on first reservation; retries
reuse it even if configuration or model catalogs have since changed.

- exact replay through MCP or CLI returns the existing run;
- reuse with different canonical content returns APR_REQUEST_ID_CONFLICT; and
- a lost MCP response can be retried through CLI without duplicate launch.

start_review validates syntax, then looks up the authenticated request ID before
new capability/configuration resolution. An existing identical request returns
its durable status even when providers are now unavailable. For a new request,
policy and currently observable capabilities are validated before mutation.
preview_review is optional and read-only, not a reservation.
An exclusive transaction then reserves the request ID, artifact lease and run
record. Provider launch is a journaled operation after that transaction, not an
atomic external side effect. A receipt identifies the durable run and starting
state before lengthy launch work. Each launch has an operation ID persisted
before execution. Partial or unacknowledged launches enter reconciliation;
retries observe the existing operation and never blindly relaunch it. Errors
after reservation report mutation_occurred=true and the run ID. A failed second
participant launch fences the first until recovery or verified cancellation.
Later-stage capabilities are rechecked at activation without changing sealed
intent. Preflight cannot guarantee future quota or availability.

Pre-reservation observations are read-only, lock-free and session-free, limited
to the installed versioned capability matrix and configuration; local CLI
presence/version; documented adapter authentication, identity-capability and
permission observations; host monitor/wait and controller-telemetry capability
observations; physical worktree/path and FUR existence/type/byte reads;
frontmatter parsing; canonical-tree series indexes, retained manifests,
referenced reconstruction evidence and amendments; repository ignore rules and
OS storage protections; and protected durable request/ownership records needed
for replay and lease-conflict detection. These observations may inspect existing
state but cannot create or update it. The derived authority/series-index.json
cache is not consulted; portable lineage discovery follows Storage Layout.
Recheck mutable observations under the appropriate locks at reservation; an
unstable read reports retryable uncertainty rather than acquiring a preview lock.
Neither preview nor preflight may start a broker, create a provider session,
run conformance tests, install software, refresh credentials or write caches.
preview_review performs the same new-request checks as start_review without
reservation, and reports unknowns.

| Condition                                                   | Preflight result                                                  | If discovered after reservation                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Unsupported host/model/effort or missing enforcement        | Reject with capability correction                                 | Fence and intervene                                               |
| Missing telemetry support                                   | Admit with unavailable coverage                                   | Keep unavailable measurements explicit                            |
| Controller telemetry partial or not observable              | Admit; disclose per-measure gaps and incomplete combined coverage | Preserve gaps; never substitute worker totals                     |
| Visible monitor unavailable or unverified, unattended=false | Reject APR_MONITOR_SURFACE_REQUIRED without reservation           | Hold dispatch admission awaiting a visible observer; retain lease |
| Unknown host wait behavior with a verified visible monitor  | Admit; disclose unknown behavior and no single-wakeup guarantee   | Record observed wakeups and capability evidence                   |
| Authentication known invalid locally                        | Reject with authentication remediation                            | Intervene; no automatic fallback                                  |
| Authentication not observable locally                       | Report unknown; launch must verify                                | Intervene on authentication failure                               |
| Quota or capacity                                           | Report known local evidence or unknown; no session probe          | Positively classified exhaustion may use sealed fallback          |

Monitor admission is checked before the reservation transaction. A rejection
has mutation_occurred=false, no run_id, and no reserved request ID or artifact
lease. unattended remains part of canonical request identity. The error
correction requires explicit user authorization, then start_review with a fresh
request_id, unattended=true and all other submitted fields unchanged. Its
next_action describes that authorization requirement and exact request
transformation; it cannot instruct automatic consent or immediate unattended
execution. The client generates the fresh ID once and reuses the corrected
request exactly on transport retries. An unchanged retry after a visible
surface becomes available may retain the original ID. If an earlier request's
delivery is uncertain, recover it by exact replay before changing intent.
Although an unreserved rejected ID has no conflicting durable content, clients
must not depend on that fact to reuse IDs for changed requests.

After reservation, surface loss is an observer failure, not a new preflight
rejection: retain the run/lease, report mutation_occurred=true when returning the
error, and pause new dispatches until a visible observer reattaches. Already
admitted work may finish and seal under normal supervision. A sealed
unattended=true run needs no visible observer. Do not mutate unattended on an
existing run; resume after restoring a surface, or cancel with verified cleanup
before starting a separately authorized unattended run.

Loss of the last verified visible surface on a nonterminal run with
`unattended=false` sets `dispatch_admission.held=true`,
`reason_code=awaiting-visible-observer` and
`required_action=reattach-visible-observer`. If this is the only blocking
condition, coarse `status` remains `starting` until startup completes and
`running` thereafter, including when admitted work has finished and the next
dispatch is held. Surface loss alone does not select `reconciling`,
`awaiting-participant` or `intervention-required`, and does not create an
integrity fence. Independent recovery, intervention or terminal conditions
retain their normal status and obligations.

Journal hold establishment and clearance with the run revision/cursor. The
trusted host adapter clears this hold only after verifying an authorized visible
surface has reattached; restoring transport or polling status alone is not that
proof. `reattach-visible-observer` is a host-adapter requirement to restore the
previously disclosed monitor surface and durable-cursor observation through
`wait_for_review` or CLI watch, not a new `intervene_review` action. Clearing
the hold does not clear other admission checks, grant authority or fences.
Already admitted work may finish and seal, and control/recovery operations
remain available while held. A terminal transition closes the observer hold
without permitting further dispatches.

Known exhaustion excludes a new primary candidate during initial resolution;
another candidate may start only if it still satisfies the requested class.
If none is eligible, preflight rejects without reservation. Static conformance
is necessary, not a guarantee of future live availability.

## Stage and Participant Resolution

A stage contains kind, optional max-round override, headless participant
selection, optional profile, prior-stage visibility, declared fallback
alternatives, and any explicit conditional rule.

An explicit provider/model becomes primary and configured role fallbacks are
appended after deduplication. An unspecified role uses the first eligible
headless candidate from the selected/default profile.

The runtime displays and seals the complete intended sequence, selections,
fallback chain, caps, permissions, visibility, and supervision mode before
launch. Actual worker-session fingerprints are observed and bound after launch,
before participant work is admitted. A mismatch fences the operation.
Two-party roles cannot share a session, and no worker session may equal the
controller session.

The v1 nested contract uses stages[].max_rounds (positive safe integer bounded
by review.max_rounds_limit),
stages[].participants, profile, prior_evidence, and fallback_kinds. SAR has only
participants.solo; SPR/XPR have author and reviewer. Each selection may specify
selector, model and effort, resolved together through the selected profile.
Placement is not caller-selectable in v1: every resolved participant record
seals placement=headless. An omitted participant map resolves every required
role from the selected/default profile. prior_evidence is independent or shared;
fallback_kinds is an explicit allowed class set, defaulting to the requested
class unless a profile explicitly authorizes a different allowed set. Candidate
membership alone cannot expand that set.

Resolve the initial roster to the requested class. If none is eligible, return
the class/capability conflict before mutation. Cross-class fallback permission
applies only to replacement after the requested stage starts. Profile fallback
authorization supplies allowed classes when omitted from the request; the
default remains the requested class. A request override is explicit intent
and is sealed. Changes that alter role count need a new user-requested stage.

Request fallback_kinds is an array; configuration uses the distinct map name
fallback_kinds_by_class. Each resolved array must be nonempty, duplicate-free,
include the requested class, and contain only sar for SAR or only spr/xpr for a
two-party stage. SAR's only legal array is ["sar"]. A role-count-changing set
fails with APR_FALLBACK_TOPOLOGY_INVALID before mutation; its correction advises
a separate requested stage. Invalid profile policy is never silently narrowed.
Array-level request errors point to /stages/I/fallback_kinds; an invalid member
points to /stages/I/fallback_kinds/J. Profile errors identify the source config
and /orchestration/profiles/P/fallback_kinds_by_class/K, adding /J for an invalid
member. I and J are zero-based indexes, K is the requested class, and P uses
JSON Pointer escaping (~ as ~0 and / as ~1). A wrong map type points to the map
itself; missing requested-class membership or an empty array points to the
class array rather than inventing an element index.

At sealing, resolve the initial roster to the requested class, then build a
finite eligibility table for each candidate against each reachable counterpart
in the sealed cascades. A candidate is eligible only for a capability-supported
roster in the allowed class set. Display active, conditionally eligible and
excluded entries with reasons; excluded entries consume no try. At replacement,
use the precomputed row for the actual counterpart and recheck live capabilities;
never expand policy. This supports both roles changing without treating a
candidate's eligibility against the original counterpart as permanent.

For the deep-review example below, assume all shown candidates are supported
and the author is Codex. With default fallback policy, an XPR seals Claude then
Grok as reviewer candidates and excludes Codex (same family); an SPR seals only
Codex and excludes Claude/Grok. With explicit xpr policy [xpr, spr], the XPR
may additionally fall back to Codex, recording a replacement SPR attempt. None
of these rules permit the initial XPR to start as SPR.

SAR followed by XPR uses, for example:

    {
      "schema": "ai-peer-review.start-request/v1",
      "request_id": "apr-request-example",
      "filepath": "spec.md",
      "stages": [
        {
          "kind": "sar",
          "max_rounds": 6,
          "participants": {
            "solo": { "selector": "codex",
              "model": "gpt-6-astra", "effort": "high" }
          }
        },
        {
          "kind": "xpr",
          "participants": {
            "author": { "selector": "codex",
              "model": "gpt-6-astra", "effort": "high" },
            "reviewer": { "selector": "claude",
              "model": "claude-opus-5", "effort": "high" }
          }
        }
      ]
    }

These model names express user intent, not verified provider availability.
The registry distinguishes selector (for example claude), host (claude-code),
and provider family (anthropic). Config v2 candidates use selector; host is
reserved for the resolved host identifier, not accepted as a candidate alias.
Model/effort mismatches fail with
supported choices rather than silently substituting. Conditional stage rules
and explicit ordered alternative rosters require a registered schema extension;
v1 rejects them until that extension defines validation and transitions.

An omitted model/effort inherits the matching selected-profile candidate's
value, then a unique versioned adapter default for that exact selection. If
neither gives a unique supported value, preflight fails with supported choices.
There is no universal medium/high default. Explicit unsupported values never
fall through to another value. The receipt records each resolved value and source.

### Worker Identity and Role Grants

A provider adapter launches each worker and obtains its session handle and
observed provider/model from the provider's exact-session observation surface
(the #88/#90 identity mechanisms). A caller-supplied fingerprint, model name or
unverified environment variable is not identity evidence. Store an opaque,
worktree-scoped fingerprint derived with a private installation key over the
host identifier and exact session handle; keep raw handles only in protected
authority storage. Seal the fingerprint, evidence source/version, observed
identity and assurance in the participant record. If launch-time exact-session
verification is unavailable, that candidate fails preflight.

Before any participant grant is issued, the trusted adapters must prove worker
session distinctness from the controller and from every other simultaneous
worker. Compare verified identities in a common provider/session namespace,
not display labels or differently salted fingerprints. When the host cannot
expose controller session identity, a versioned provider guarantee of fresh
session creation after the request, with inherited/default resume disabled and
observed creation evidence, may prove separation from the pre-existing
controller. Lack of controller usage telemetry alone does not block admission.
If neither proof is available, admission fails closed. The manifest records the
proof source/version and assurance. A controller/worker collision fences with
APR_CONTROLLER_WORKER_SESSION_COLLISION; a worker/worker collision fences with
APR_WORKER_SESSION_COLLISION; unproved separation uses
APR_SESSION_DISTINCTNESS_UNPROVED. Issue no participant grants for the affected
roster, and reconcile any launched processes before retry or replacement.

On worker resume, the adapter re-observes the session and proves possession of
its private transport binding; the runtime compares the sealed fingerprint and
identity, then issues a fresh grant. The same model in another session is not
the same participant. CLI fallback uses the same broker and provider adapters;
it cannot assign the controller session to a worker role.

Controller authority and participant authority are separate.
Participant grants are scoped to run_id, stage_attempt_id, round, phase,
fingerprint, expected_revision and an expiring grant ID. Replays return an
existing action receipt; advancing consumes the grant. Controller grants permit
only control operations; monitor grants permit only redacted status/events.
Secrets remain in the host bridge or participant wrapper, outside model-visible
JSON and provider-readable files/environment. A wrapper supplies role-bound
submission tools and never hands its controller credential to a provider child.

The v1 participant channel is a wrapper-hosted MCP stdio tool connection over
private inherited pipes bound to exactly one launched child. It is separate
from provider stdout/stderr and raw-output capture; ordinary provider output is
never interpreted as tool authorization. A provider adapter must support this
private tool connection or fail its capability check. Possession of the inherited
channel is the child's capability to invoke its wrapper's role tools, not a
broker credential. The wrapper binds the channel to the verified child/session,
supplies its protected broker credential and current role grant, and validates
run, phase and revision for every call. Revoke the binding when the grant,
session or wrapper ownership expires; reconnect requires identity revalidation.
No discoverable unauthenticated loopback tool listener is permitted in v1.
Socket alternatives require a versioned, conformance-tested per-child capability
contract before admission. Direct child calls to the broker without a valid
trusted transport binding are rejected before dispatch and produce bounded,
credential-free authentication diagnostics; an untrusted peer is not attributed
to a particular child without evidence.

API grant validation and supported provider sandbox write denial are enforced
controls. Separation among unrestricted same-OS-user callers is accountability
and mistake prevention, not protection against an actor stealing local grants.
The manifest records role_authority=same-user-accountability, per-role
write_scope=enforced-provider-sandbox, and the SAR critique/revision compliance
claim separately. It also records submission_scope=role-isolated and
shared_collateral=mutable-untrusted. A controller grant cannot submit a participant turn; this
does not claim immunity to malicious same-user software.

## Round Contract and Caps

One round has the same structure in all classes:

1. Reviewer evaluates the exact current FUR digest.
2. If the acceptance predicate below holds, seal the clean reviewer response
   against that digest, revalidate unchanged FUR bytes, then accept the stage.
3. Otherwise reviewer submits a response with stable finding IDs.
4. Author revises the FUR.
5. Author writes a response explaining changes and identifying addressed,
   partially addressed, and disputed findings with rationale.
6. Supervisor snapshots the revised FUR, generates the patch, and binds the
   patch plus both responses to before/after digests.
7. The next round reviews the revised FUR, author response, and any evidence
   allowed by visibility policy.

In SAR one participant performs both roles. In SPR/XPR they remain distinct.

Package defaults are:

    SAR: 6 rounds
    SPR: 10 rounds
    XPR: 12 rounds

Precedence is stage request, project config, user config, then package default.
Each dispatched review attempt consumes one round, including an interrupted
attempt; revision and its author response belong to that same round. A clean
review at the cap may accept. Otherwise exhaustion stops the entire sequence
with intervention-required after the permitted final response/revision.
Later stages do not start. A final-round revision cannot
claim acceptance without a subsequent clean review pass.

Round numbers begin at 1 for each requested stage and increase across all its
replacement stage-attempts; replacement never restarts numbering. Every admitted
critique consumes its round even if infrastructure failure prevents a response.
This deliberately bounds total critique dispatches as well as disagreement;
there is no free post-admission failure allowance. A new dispatch needs remaining
budget or an explicitly authorized extend-cap within the configured limit.

Each revision dispatch, including an interrupted or no-response attempt,
consumes one of max_revision_attempts_per_round, including the initial attempt.
At exhaustion, enter intervention-required with
APR_REVISION_ATTEMPTS_EXHAUSTED, stop subsequent phases/stages, retain the FUR
lease and fence the writer and unresolved operations. Seal all attempt receipts.
Preserve partial bytes and pending effects in a checkpoint with checkpoint_id
and expected_current_digest; require writer quiescence and resolve-checkpoint
before those bytes can become the input to a fresh critique. If exact bytes
remain at the sealed baseline and no effects are pending, record that verified
no-change disposition instead of inventing a checkpoint.

Exhaustion is not acceptance or an automatic failed verdict. Resume cannot
reset the counter or authorize another revision in that round. Exhaustion
alone never authorizes automatic replacement. Independently proved quota or
capacity exhaustion may still select a sealed fallback after the same
quiescence/checkpoint requirements; otherwise replacement requires explicit
user authorization. Any replacement starts a new stage-attempt with a fresh
critique consuming the next round from the existing requested-stage budget.
No remaining round means intervention until authorized extend-cap or cancel;
replacement never restores a consumed round or that round's exhausted revision
allowance. Revision-attempt counters are scoped to
`(requested_stage_id, round)`, not to a participant or stage-attempt. Every
newly admitted round, including a replacement's fresh round, receives the full
sealed `max_revision_attempts_per_round` allowance if revision is needed,
including its initial revision attempt.

No v1 intervention grants additional revision attempts within an exhausted
round. `extend-cap` authorizes additional rounds only; it neither resets a
revision counter nor independently authorizes participant replacement. Continued
review after revision exhaustion follows the replacement and reconciliation
rules above, with an authorized cap extension also required when no round
remains. Cancellation and unresolved-failure handling retain their existing
recovery rules.

Run states are starting, running, awaiting-participant, reconciling,
intervention-required, accepted, cancelled and failed. Each requested stage has
an ID; replacements have new stage-attempt IDs under it. Acceptance requires
all requested stages accepted under the predicate below. Cancellation is never
acceptance. Fencing, liveness and dispatch admission are orthogonal response
fields, not extra run states; a failed run may retain fences and an unreleased
artifact lease.

## Findings and Debate

Every finding has a stable lifetime ID and records stage, originating round,
category, severity, reviewed digest, reviewer rationale and evidence, author
disposition and rationale, reviewer resolution, and split/duplicate/supersede
lineage.

The participant allocates `finding_id` as an ASCII string matching
`^[A-Za-z][A-Za-z0-9._-]{0,63}$` (ECMAScript regular expression, no flags).
The total length is 1 through 64 characters inclusive. Require the matched
span to consume the entire input without trimming; ECMAScript `$` can also
match before a final line terminator, which is not a valid identifier character.
Its namespace is the requested-stage ledger,
spanning every round and replacement stage-attempt. Its fully qualified identity
is `(run_id, requested_stage_id, finding_id)`; independent later stages have
separate namespaces and explicit cross-stage links, never implicit ID joins.
New findings must have IDs unused anywhere in that ledger, including resolved
history, and be unique within the submission. Validate the entire submission
atomically before ledger mutation. A collision returns APR_FINDING_ID_CONFLICT
with the offending JSON Pointer/IDs and correction to choose fresh IDs and
resubmit the same phase/revision. It consumes neither another round nor the
submission grant. Exact action replay is recognized first and returns its
existing receipt instead of being treated as a new finding.

Every critique handoff supplies the complete set of the stage's already-used
finding IDs, including resolved IDs, which are unavailable for new findings.
This is an exclusion set, not a runtime-reserved allocation pool. Materialize
it as a sealed JSON string array in the participant's read-only context
projection, and supply its exact path, entry count, SHA-256 and ledger revision
in the handoff. Keep large sets file-backed rather than embedding them in a
bounded tool response; never truncate the set or omit resolved history.
The handoff also supplies permitted inherited finding context.
Replacement reviewers may reference
inherited IDs for explicit reviewer resolutions but cannot reallocate them,
overwrite their originating evidence or resurrect them as new findings. New
defects and split children need fresh IDs. target_ids must resolve to existing
or atomically introduced IDs in the same ledger; reject missing/self/cyclic
targets before sealing. Cross-stage informational links cannot resolve an open
finding in this stage.

Narrative remains free-form inside the structured response. A disputed finding
may produce an empty patch. The next review must accept the rationale, refine
the finding, or maintain the objection. The cap bounds disagreement and dispatches.

A stage accepts exactly when its current critique verdict is clean, its reviewed
digest equals both the active snapshot and unchanged FUR bytes, it adds no open
findings, every existing finding in that requested stage's ledger has an explicit
reviewer resolution, and all required seals/receipts persist. Resolved states are
fixed, withdrawn and accepted-rationale. duplicate or superseded resolves only
with explicit acyclic target IDs whose terminal resolutions are established;
split findings require all children resolved. Author dispositions alone never
close findings. Deferral of an actionable finding is not a terminal resolution.

A clean response must enumerate resolutions for all currently open IDs, including
disputed IDs and findings inherited across replacement attempts. Otherwise return
APR_FINDINGS_UNRESOLVED with the missing IDs and next_action submit_review_turn
for the same phase/revision; do not advance or consume another round merely to
correct an invalid submission. Resolved historical findings remain in the ledger.
Earlier accepted stages have closed ledgers; later independent stages create
new IDs, linked only when visibility permits. Final run acceptance also requires
verified evidence reconstruction and no outstanding conflict or fence.

## Visibility and Session Continuity

Prior-stage evidence visibility is explicit and defaults to an independent
first pass. A fresh reviewer initially sees current FUR and allowed repository
context without prior responses. Earlier evidence may be revealed later or by
request. The manifest records what was visible.

Independent means prior responses are not supplied in the initial context;
it is not experimental blinding when repository/history reads are available.
Record supplied context digests and observed retrievals; unknown access remains
unknown. Strictly blinded experiments belong to #34 and require an isolated
view excluding historical collateral. Authors may retain earlier knowledge;
only fresh reviewers get an independent first pass. SAR session reuse is not
independent from itself.

Author continuity is preserved by default. When provider, model, effort, and
adapter capability match, an SAR worker may become author in a later stage
using the same session. Reviewers start fresh for independent stages unless
reuse is requested. Every reuse, role transition, and replacement is recorded.

All supplied prior-round evidence comes from sealed authority, materialized into
a read-only context projection outside participant write scopes. Before delivery,
verify that supplied bytes equal their seal and record both digests in the context
receipt. A diverged collaborative copy produces APR_COLLATERAL_DIVERGED as a
nonblocking integrity diagnostic; it is never substituted for the sealed payload.
An invalid seal or projection blocks dispatch. Voluntary repository retrievals
remain subject to the visibility assurance stated above, not a claim of blinding.

### Storage Layout

Let W be the physical worktree root, R the opaque run ID, and S the stable series
ID. The following templates are normative for the new format; paths are relative
to W. IDs are validated single path components, never caller-supplied paths.

| Area                               | Relative path                                                   | Git policy                 | Write/read authority                                                                          |
| ---------------------------------- | --------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| Shared collateral                  | .scratch/peer-review/collaboration/R/shared/                    | Ignored                    | Author, reviewer and supervisor write; never attributed submission staging                    |
| Role submission staging            | .scratch/peer-review/collaboration/R/roles/ROLE/                | Ignored                    | Bound role writes its own partition; package reads/seals; cross-role writes denied            |
| Sealed authority                   | .scratch/peer-review/authority/runs/R/                          | Ignored, durable           | Package only; participants receive receipt IDs, never direct authority paths                  |
| Identity, leases and request index | .scratch/peer-review/authority/                                 | Ignored, durable           | Package only; outside every participant write scope                                           |
| Supplied context                   | .scratch/peer-review/context/R/                                 | Ignored                    | Package writes; scoped participant read-only projection, exact path supplied                  |
| Series index and portable sidecar  | docs/superpowers/peer-reviews/S/index.json                      | Trackable                  | Package publishes under the series lock; participants read subject to visibility, never write |
| Portable run record                | docs/superpowers/peer-reviews/S/runs/R/                         | Trackable                  | Package publishes immutable files; participants never write                                   |
| Telemetry amendments               | docs/superpowers/peer-reviews/S/amendments/R/A/                 | Trackable                  | Package publishes immutable amendment A; separate from sealed run                             |
| Broker endpoint                    | .scratch/peer-review/runtime/endpoint.json                      | Ignored                    | Package only, safe metadata exposed selectively                                               |
| Credentials and bindings           | .scratch/peer-review/private/                                   | Ignored, access-restricted | Trusted bridges/wrappers only; provider read and write denied                                 |
| Requests and raw logs              | .scratch/peer-review/requests/ and .scratch/peer-review/logs/R/ | Ignored                    | Controller prepares requests; package owns logs; no credential content                        |

Trackable means intended for the eventual ordinary project commit; the runtime
never stages or commits. Ignore rules and OS protections are installation
prerequisites checked before reservation; missing protection fails with setup
guidance, not an implicit edit of repository policy. Despite the scratch parent,
authority and private bindings needed by retained runs are durable and excluded
from generic scratch/log cleanup. Immutable run records and amendments are
published exclusively after seal verification; only the derivative series index
is updated, transactionally, under a series lock. Index receipts bind its entries
to sealed run manifests and the published amendment inventories below.
Sidecar lineage is published in the trackable series
index, using the shared series-index/v1 contract. Each sidecar binding records
lineage_mode, series_id, the canonical repository-relative artifact_path and
record path, plus the selected terminal run ID and manifest SHA-256. The sealed
run manifest records the same artifact/series binding, making the published
index entry verifiable. No absolute worktree path, credential or private handle
is exported. authority/series-index.json is only a derived local lookup cache;
its absence cannot imply that a FUR has no prior lineage. It is rebuilt from
validated portable records after reservation, never during read-only preview.

Each run entry in series-index/v1 also carries an ordered amendments array.
Each entry contains amendment_id, repository-relative manifest_path and
manifest_sha256; [] explicitly means no amendments published at that index
revision. Preserve the base run manifest digest unchanged. Seal and publish an
amendment before atomically appending its index reference under the series lock,
with a publication operation ID for idempotent recovery. A crash between these
steps leaves a pending publication, not an unreferenced amendment silently
included in current totals. Index receipts bind the entire run/amendment list,
index revision and publication time. This applies to both lineage modes.

Current aggregate views resolve the ordered amendment inventory for every
included run and pin the index revision/as-of time. An absent, corrupt or
unresolvable referenced amendment makes current telemetry coverage explicitly
incomplete/unverifiable, with a null complete total and a bounded diagnostic.
The original sealed verdict and reproducible base/as-of views remain available;
do not label superseded base metrics current. An export advertised as complete
must include and verify all referenced amendments. "Current" means current at
the supplied index revision, not proof that no newer index exists elsewhere.

FUR, collaboration, authority, context, evidence and private roots must not alias
or overlap each other's write scopes. Permissions give repository context reads
with explicit exclusions for authority/private/raw logs, never unrestricted
recursive access to W. A grant to one context projection grants no sibling access.
All roots are physically resolved and revalidated at writes. The project broker
discovery index is the sole shared-Git-directory exception, defined below; it is
not run authority. These templates do not relocate existing legacy records.

## FUR and Worktree Boundary

The FUR remains in the originating physical worktree and outside the review
folder. Tracked-dirty and newly created text FURs are allowed. Startup captures
the initial bytes and acquires an artifact-scoped write lease.

    FUR
      author:   read/write
      reviewer: read-only
      supervisor: bounded initialization or authorized checkpoint resolution only

    review folder/shared
      author/reviewer/supervisor: read/write/create
      attributed response submissions: forbidden

    review folder/roles/ROLE
      bound role: read/write/create within its own partition
      other participant roles: no writes
      supervisor: read/seal; writes only its own supervisor partition
      cross-role reads: subject to visibility policy

    repository context
      author/reviewer: read
      other writes: separately governed

ROLE is author, reviewer, solo or supervisor as applicable. A two-party
reviewer may edit its own submission partition and shared collateral, including
earlier shared in-progress collateral, but cannot edit FUR or another role's
partition. The author has the symmetric staging restriction. SAR uses the solo
partition for both phases. Enforce these boundaries through the provider sandbox
and physical-path checks, including denial of symlink/hard-link aliases and
parent-directory rename/delete escapes. The collaboration root itself is not
a blanket participant write grant.

Submitted response paths must lie inside the current grant's role partition;
shared collateral and other roles' paths fail APR_SUBMISSION_SCOPE_INVALID.
This correctable scope rejection consumes neither another round nor the
submission grant and does not advance the phase or revision. It returns
`next_action=submit_review_turn` for the same phase/revision, naming the exact
permitted role partition so the participant can correct its submission.
The supervisor never edits another role's staged payload and seals accepted
bytes into package-owned authority outside the collaborative folder. Shared
collateral is mutable, untrusted context, not evidence of response authorship.

During review turns only the registered author may change the FUR in its author
phase. The supervisor has two enumerated exceptions: the pre-round lineage merge
and an explicitly authorized resolve-checkpoint operation while all writers are
fenced. Both journal exact before/after bytes and produce reconstruction patches.
Unexpected changes create conflict rather than being absorbed. The supervisor,
not a participant, generates patches from exact snapshots.

The lease coordinates AIPR writers; it does not stop editors or unrelated
processes. Recheck exact bytes at each review/revision seal and acceptance.
Resolve physical paths, reject symlinks and hard-linked FURs, directory aliases
and review-folder overlap, and revalidate containment at write boundaries.
Do not alter unrelated staged or working files. SAR uses the same deterministic
core for snapshots and patches. Its single worker's separation between critique
and revision phases is an agent-compliance claim, not an independently enforced
separation between two participants.

A SAR worker is one author-capable session throughout. Its critique evaluates
an immutable input snapshot and is instructed not to edit until its findings
are sealed. The core detects premature FUR edits and enters conflict; it does
not claim a sandbox role switch between critique and revision. Headless SAR
must still enforce its combined scope (FUR, solo staging and shared collateral,
no authority or other-role writes). Two-party reviewers require enforced FUR
denial and role-isolated staging. Record these distinct
assurance claims so SAR is never presented as independent peer enforcement.

## Evidence

Contract ownership: this design declares the required shared evidence interface
for #107 and #30, rather than a second runtime-specific record format. #30 owns
its implementation and migration. Before schema freeze, its plan must adopt or
jointly revise these contracts and the associated gates; neither issue may ship
an incompatible layout independently. The target schemas are
ai-peer-review.record/v1, series-index/v1, patch-chain/v1 and
response-envelope/v1 (each with the ai-peer-review prefix). The runtime consumes
the shared snapshot/patch/export API and emits records through it.

The working tree contains the latest FUR; no per-round commits are required.
The portable run record at the Storage Layout path contains:

    runs/R/
      manifest.json
      events.jsonl
      metrics.json
      patch-chain.json
      anchors/terminal.bin
      changes/C.patch
      payloads/P.bin
      receipts/T.json
      attempts/T/attempt-evidence.json
      stages/STAGE_ID/attempts/STAGE_ATTEMPT_ID/rounds/ROUND/
        review.md
        author-response.md
        round.json

These are templates, not mandatory empty files. STAGE_ID and STAGE_ATTEMPT_ID
are immutable IDs inventoried with their ordinal positions; ROUND is the
stage-global round number. T identifies one provider attempt, P a sealed payload,
and C a globally ordered artifact change. review.md and author-response.md are
rendered envelopes pointing to payloads/P.bin and receipts/T.json. round.json
binds critique/revision attempt IDs, finding resolutions and the change ID.
Every attempt has a receipt; a no-response attempt additionally has the clearly
typed attempts/T/attempt-evidence.json, never a response filename. Pre-round
attempts have null round and a stage or run accounting owner in the manifest.

patch-chain.json totally orders changes by monotonically increasing run-local
change_sequence from the authority journal, with kind, stage/attempt/round when
applicable, before/after SHA-256 and patch path. It includes initialization,
reconciled checkpoints and between-run deltas as well as revisions; stage
boundaries add no implicit patch. Adjacent digests must match. All patches live
at changes/C.patch, so paths cannot collide across stages or attempts. Clean
acceptance emits no change; empty revisions emit an empty patch. Snapshot bytes
and payloads are sealed in authority before export; the portable payload and
terminal anchor are exact copies, not additional mutable working FURs.

Amendment A lives in the sibling amendments/R/A/ tree with its own manifest.json,
receipts/ and metrics.json, referencing the original manifest digest and prior
amendment IDs. It is not appended inside the already sealed run inventory.
Its publication becomes discoverable through the series-index amendment
inventory and receipt defined in Storage Layout.

Each patch records input/output digests. Reviewer responses bind to the digest
reviewed. Author responses bind to findings, revision, and patch. The manifest
binds the chain root, final digest, participants, decisions, and inventory.

Use SHA-256 of exact file bytes, without line-ending or Unicode normalization.
Preserve submitted response bytes and snapshots in append-only package-owned
storage outside the collaborative folder before acknowledging a submission.
Later collateral edits are allowed but cannot rewrite those sealed facts.
At export, verify against these seals; changed originals are exported under
distinct receipt paths or reconciled explicitly, never silently overwritten.
An accepted bundle must contain the exact sealed responses and all patch bytes.
Its manifest inventories paths, sizes and digests, excluding its own digest;
events and metrics must agree with sealed authority.

The final FUR plus reversible per-round patches must reconstruct every prior
byte version, including dirty/new initial content, with no dependency on an
unretained Git object. Preserve any format-aware metadata change as a separate
initialization patch. Empty revisions have an empty patch and equal digests.
Clean acceptance has a review response and equal before/after digests but no
author response or patch. Reconstruction and seal checks precede finalization.
Local hashes provide consistency, not protection against a same-user actor
rewriting the entire bundle; commits or external receipts may anchor it later.

Retain terminal sealed FUR bytes in durable evidence storage, distinct from
raw logs. A standalone portable export includes a verified terminal-byte anchor
(deduplicated by digest if desired); a repository bundle may reference an exact
retained Git blob after an ordinary commit. Never rely on a mutable path as the
only long-term anchor. The user's worktree still has one working FUR, with no
per-round working copies. Later edits do not change prior acceptance: status
reports both the accepted digest and current drift. Follow-ups record the exact
intervening delta before reviewing it. Retention must not remove the last
reconstruction anchor for a retained run, including cancelled/intervened runs.

After completion, normal project workflow may create one commit containing the
final FUR and evidence. Peer-review does not commit. Later squashing preserves
the sequence because authority lives in the digest-bound bundle.

Trackable evidence includes normalized events, metrics, responses, patches, and
manifest. Raw provider streams, credentials, cookies, private handles,
environment dumps, and verbose logs remain ignored. Raw logs are deleted after
clean finalization. Relevant diagnostics are retained temporarily after crash,
ambiguity, or intervention. A debug option may preserve them deliberately.

Every provider invocation produces a supervisor-owned execution-metrics
receipt, whether it succeeds, fails, times out, is interrupted or produces no
participant response. When a response exists, its evidence file contains the
participant-authored content as sealed bytes plus a clearly separated
supervisor-observed metrics section. The section is outside the participant
content digest so adding trusted runtime measurements cannot impersonate or
rewrite the participant. When no response exists, the attempt is represented by
attempts/T/attempt-evidence.json at run scope, never by a reviewer or author
response filename. A round references it through round.json's attempt IDs rather
than containing the file. Pre-round attempts have null round and are referenced
by their stage/run accounting owner in the manifest.

The submitted response path/digest names only the participant payload, before
any runtime annotation. The runtime keeps that sealed payload separately and
renders an evidence envelope containing the identical payload bytes and a
supervisor section referencing sealed attempt receipts. The versioned envelope
records the payload's byte offset, byte length and SHA-256; Markdown delimiters
alone are not trusted framing. Its whole-file inventory digest is distinct
from the payload digest. Exported envelopes are generated artifacts, not valid
participant submissions. Empty or binary-invalid responses fail the registered
response schema rather than being repaired by the metrics collector.

Participants cannot assert supervisor provenance through response text or edit
sealed metrics by changing collaborative files. The runtime validates both
payload and receipt references against package-owned authority. Later telemetry
does not mutate a sealed response or exported envelope; it uses the amendment
contract below. The response envelope and manifest link the same receipt IDs,
so metrics embedded for readability are never extra accounting entries.

The manifest inventories every attempt receipt and its relationship to stage,
round, role, participant/session, fallback and retry. An abandoned run therefore
retains its consumed time, tokens and cost even when it completes zero rounds.
Raw provider output is not required once bounded normalized metrics and
diagnostics have been sealed.

## Review Series and Follow-Ups

Contract ownership: #30 implements the shared series-index/v1 and patch-chain/v1
contracts declared here; #107 consumes them and records context visibility.

The start request admits lineage_mode=frontmatter or sidecar, defaulting to
frontmatter for Markdown and sidecar otherwise; frontmatter on non-Markdown
fails validation. Preview and the immediate receipt disclose the planned FUR
mutation. Authorizing start with this resolved mode grants only the bounded
initialization merge. A Markdown user may select sidecar to avoid that mutation.

After reservation and before any participant admission, capture the user's exact
initial bytes, recheck the lease/digest, and journal the proposed metadata merge.
The supervisor applies it once, records its reversible initialization patch and
seals the result. Round 1 reviews the post-merge digest. A crash reconciles the
recorded pre/post bytes before retry; any other bytes enter conflict. A Markdown
FUR in frontmatter mode receives this stable pointer:

    ---
    ai_peer_review:
      series_id: apr-series-7c...
      record: docs/superpowers/peer-reviews/apr-series-7c.../
    ---

Complete history stays in immutable run records under the series root, separate
from the writable collaborative folder. A new review validates the pointer,
previous terminal record, prior final digest, current digest, and intervening
delta, then links automatically. The user may explicitly start a new lineage
when a file is repurposed.

Preserve unrelated frontmatter. Sidecar mode uses the package-published binding
in the trackable series index instead of inserting YAML; an existing conflicting frontmatter pointer
still requires explicit reconciliation and is not silently ignored. The pointer addresses a
stable series index; each terminal run has a separate immutable record below
it. Malformed/conflicting pointers, ambiguous copied series IDs and missing
records require reconciliation rather than silently starting a new chain.
Never search outside the physical repository by trusting frontmatter paths.

For either lineage mode, discover candidate bindings from series indexes and
retained run manifests only under the canonical docs/superpowers/peer-reviews/ tree in
the current physical repository. Resolve artifact_path relative to that
repository, with normalized path separators and the existing physical-path,
alias and containment checks. This is repository-local discovery, not permission
to follow arbitrary external paths. Ignore cached absolute paths from another
checkout; the portable repository-relative binding is the lookup source.

Before allocating any new series, start and preview must perform this discovery
regardless of the requested or resolved lineage_mode, including a default
frontmatter-mode start whose Markdown FUR has no valid pointer. Absence of a
pointer or local authority/cache is never evidence that prior lineage is absent.
Malformed or conflicting pointers still require reconciliation; discovery cannot
bypass that rule. A unique valid binding links automatically
after validating its selected terminal manifest, reconstruction anchor and digest
chain, then capturing any intervening FUR delta under the existing rules. Current
FUR drift does not alone break lineage or require a matching final digest. Path
matching locates a candidate; it does not replace manifest/chain validation or
confer participant or controller authority. A content digest alone never joins
two differently named artifacts to one series.

A binding recorded with lineage_mode=sidecar is a valid link target for a
frontmatter-mode start, and a frontmatter binding is valid for a sidecar-mode
start. The mode selects the current run's pointer representation, not a separate
series namespace. A frontmatter-mode start with no pointer and a unique validated
prior binding must reuse that series and predecessor; after reservation, its
bounded initialization merge writes the existing series_id and record pointer,
never a freshly allocated series. Preview and receipt disclose both the reused
lineage and planned merge. A sidecar-mode follow-up reuses the same lineage
without writing the FUR; a consistent existing frontmatter pointer may remain.
Revalidate the selected binding under the artifact/series locks at reservation.
Record the resolved mode in the new run and its published index binding; retain
the prior manifests' original modes and bytes unchanged. Ambiguity still returns
APR_LINEAGE_UNRESOLVED rather than using a mode change to start another chain.

If a retained manifest identifies the artifact path but its published binding is
missing, malformed or inconsistent, return APR_LINEAGE_UNRESOLVED before new
reservation. Conflicting candidate series or predecessor tips and missing
referenced records return the same condition, naming reconcile_review_series
with repair-pointer, repoint or new-lineage as applicable. Do not silently
allocate a new chain or select the newest timestamp. Explicitly recorded
superseded bindings remain history, not competing active candidates. With no
discoverable prior binding or record, a first review may allocate a new series.

Publish a sidecar binding only after its referenced terminal run record has
been sealed and published; update the derivative series index atomically under
its lock. Publication or reconciliation never edits the sidecar-mode FUR.
Portable follow-up needs the FUR, series index and referenced evidence to travel
together through an ordinary commit/checkout or verified export/import. It does
not require ignored authority, credentials, old sessions or the originating
absolute directory, and it cannot resume an active run merely from exported
history. Evidence not yet exported or transferred remains local. This qualifies
automatic linking without weakening it for complete path-preserving clones or
linked worktrees; renamed artifacts require explicit lineage reconciliation.

## Metrics and Comparative Evaluation

Contract ownership: #107 emits neutral ai-peer-review.attempt-metrics/v1,
measurement/v1, aggregate-coverage/v1 and telemetry-amendment/v1 schemas (all
ai-peer-review-prefixed), consumed by #30 for packaging and #34 for analysis.
Issues #33/#34 own outcome labels, scoring and experiment design; the runtime stores
only versioned references to their optional outcome annotations. It does not
define a quality score or a second analysis configuration language. Schema
freeze requires reconciliation with both dependent plans.

Normalized records represent runs, stages, participants, rounds, findings,
costs, and outcomes. They preserve pattern and sequence, stage order, evidence
visibility, provider/model/effort, placement, continuity, artifact properties,
finding category/severity/disposition, regression, duration, token provenance,
fallback, quota, retry, disconnect, intervention, optional human quality, and
linked downstream outcomes.

Usage is captured first at provider-attempt granularity and then aggregated
without discarding the originals. When exposed, each attempt records:

- requested and observed provider, canonical model, effort, service tier and
  auxiliary models;
- start/end timestamps, controller-observed wall duration, provider-reported
  total/API duration and queue duration;
- input, output, reasoning/thinking, cache-read and cache-creation tokens using
  the provider's native categories;
- tool, web-search and web-fetch counts, including per-model counters;
- marginal cost, currency, cost basis and price provenance;
- stop reason, terminal reason, response-created status, retry/fallback parent,
  and completion/failure classification; and
- a provenance of reported, derived, estimated or unavailable for every field
  or coherent field group.

The observed controller boundary is the preferred collection point. The
motivating local-SAR experiment produced null cost values through the
worker-facing interface even though the host UI later exposed discrete session
usage. A worker therefore must not be the sole recorder of its own consumption.
The broker and provider adapter collect terminal/session telemetry outside the
worker turn whenever the host exposes it. This improves coverage without
guaranteeing that every provider exposes every measure.

Each measurement carries value, unit, provenance and source scope. Derived
values identify their input observations and formula; estimates also identify
assumptions and pricing/version dates where relevant. Unavailable values have
a reason such as not-exposed, lost-on-crash, redacted or ambiguous-scope.
Reported means supplied by the source, not independently verified or billed.
Keep requested identity separate from observed identity and its assurance.

Preserve the provider's raw normalized counters when aggregate and per-model
reports disagree; record the inconsistency instead of silently reconciling it.
Never infer ordinary input from cache counters, hidden reasoning from output,
wall time from API time, or subscription value from list-price cost. Unknown
values remain null/unavailable, not zero.

Round metrics aggregate measurements attributable to its single admitted
critique dispatch plus all revision attempts retaining that round. For a
discrete invocation that is one critique attempt, including its failed or
no-response receipt. Failed/interrupted critiques each consume their own round.
Pre-admission launch/fallback attempts are
stage-owned, or run-owned if not yet attributable to a requested stage. Every
attempt ID has exactly one accounting owner: round, stage or run. Cross-round
continuous-session attempts remain at the lowest known stage/run scope, linking
their dispatch IDs to rounds without fabricating per-round usage. A critique
dispatch within such a session consumes a round even without a new process.
Parent totals include descendant scopes once. Avoid
double counting cumulative provider reports by recording counter semantics and
the exact attempts included in each aggregate. Reports can therefore compare
successful-review cost, failed-attempt overhead, retry burden, stage marginal
yield and total sequence cost.

### Accounting Identity and Aggregation

Allocate an attempt ID durably before each provider invocation. Record its
operation ID, requested stage, stage-attempt, round (nullable before dispatch),
role/phase, local participant ID and retry/fallback parent. Provider-internal
calls and auxiliary models are child accounting scopes, not additional review
rounds. Continuous SAR worker sessions may span phases or rounds; preserve
session-scoped measurements when the source cannot attribute them more finely.
Do not invent per-round allocations from a session total.

Every observation has an idempotent identity, source scope, counter epoch and
delta/cumulative semantics. Cumulative differences require an observed baseline
in the same scope and epoch; resets or missing baselines make the attributable
delta unavailable. Replayed final results and stream updates must not add the
same usage twice. Corrections supersede observations explicitly, retaining both
with their provenance. Persist observation IDs across broker recovery.

Define a disjoint accounting partition per metric: use a parent's inclusive
total or its exclusive children, never both. Child model breakdowns remain
queryable even when the parent supplies the billed total. Record known
inclusion relationships for reasoning/output, cache/input and tool/web counters.
Never sum overlapping categories; ambiguous provider semantics remain native
measurements with no fabricated normalized total. Inconsistent parent/child
reports retain both and an inconsistency diagnostic; any selected reporting
basis is explicit and deterministic, not a silent reconciliation.

Each aggregate declares included and excluded observation/attempt IDs, units,
accounting basis and coverage. It exposes a known subtotal plus missing or
unattributed scopes; a complete total is null unless coverage is complete and
semantics are compatible. Mixed provenance remains visible in the breakdown.
Session usage not attributable to a round is counted once at its lowest known
stage/run scope, with links to affected rounds. Do not distribute it by guess.
Elapsed run time is measured from run boundaries; summed API/attempt durations
are resource duration and can exceed wall time during concurrency. Never add
queue/API/wall durations unless the source defines disjoint components.

metrics.json contains explicit round, participant/agent, stage, run, and
review-chain aggregate views over the same attempt records. The manifest
summarizes those views, their coverage, currency partitions, and metrics.json
digest without duplicating raw provider output. Agent aggregates are keyed by
stable participant ID and retain provider, model, effort, and the ordered role
bindings for each stage-attempt, including solo-to-author reuse. Role breakdowns
partition the same observations; they are not additional usage entries.

Controller observations use a separate opaque controller accounting ID, never
a participant ID or submission grant. The trusted host adapter records them in
the same measurement/receipt and amendment contracts, with a source event ID,
run attribution and any observed stage/round links. The broker does not launch
the controller and must not fabricate worker attempt IDs for these host turns.
Request construction, interventions, host-forced re-entry and final reporting
are run-owned controller overhead when attribution is observable. Unrelated
chat work is excluded. A session total spanning unrelated work or multiple runs
without separable observations is ambiguous-scope, not an allocatable run cost.
Receipt replay and cumulative-counter rules apply equally to controller usage.

Before reservation, the trusted host adapter advertises
controller_telemetry_capability as observable, partially-observable or
not-observable, together with its mapping version and per-measure availability,
source and limitations. Preview and the pre-launch receipt carry this declaration
and disclose which combined totals cannot be complete. Each controller accounting
binding records evidence_source, evidence_version and assurance
(verified-host-binding or not-observable). Observed controller identity fields
are populated only from that verified binding; self-reported labels are not
observed identity. Unknown model/effort remain null. This accounting binding
does not substitute for the independent session-distinctness admission proof.

CLI-only transport declares controller usage value=null,
provenance=unavailable, reason=not-exposed and source=host-transport, with
controller_telemetry_capability=not-observable. It does not block the run.
CLI cannot infer controller tokens from subprocess duration, worker telemetry
or caller-supplied model labels. If a separately verified host observer already
exists for the run, CLI replay preserves its declaration/observations and may
display them; CLI itself supplies no new controller-usage evidence. A CLI-only
binding may later gain verified host observations through recorded binding
evidence and the normal receipt/amendment path, never by rewriting provenance.

Persist separate worker and controller subtotals and coverage in metrics.json
and the manifest. A combined run cost/token total is complete only when both
scopes have complete, compatible coverage; a complete worker subtotal alone
cannot establish a complete run total. Missing host usage is null with its
reason and source, even when all worker telemetry is complete. Usage for the
terminal controller response may arrive after sealing and uses the existing
late-telemetry amendment path. It never delays review correctness indefinitely.

A review-chain view identifies its selected terminal tip, ordered predecessor
run IDs, sealed predecessor manifest and metrics digests, applied amendment
IDs/digests, and an as-of revision. A view embedded in the current run's
metrics.json references that run's local observations/receipts by ID; it never
embeds its own metrics or enclosing manifest digest. The enclosing manifest
binds those current metrics bytes. The same rule applies to locally contained
observations in an amendment. A separately materialized view created after
sealing can pin all input digests, including the selected tip, without a
self-reference. It uses each run's own accounting partition exactly once;
previously computed chain rollups are never summed as run usage. Repeated or
cyclic predecessor links and unverifiable inputs are reported as invalid chain
evidence. Valid legacy records with missing telemetry contribute explicit
unavailable coverage, not zero. An as-of view is immutable; later amendments
or follow-ups produce a newly versioned derived view without rewriting prior
run metrics. Status and exports disclose the same pinned accounting inputs.

Each newly dispatched critique, including a retry or fallback critique,
consumes a new round as specified by the cap contract. Transport reconnection
to an existing operation is not a new dispatch. Launch attempts before critique
admission have no round; revision retries retain the originating round and use
the sealed finite retry policy. SAR critique and revision use one participant,
but their usage is separately attributed only when exposed. All accounting
rollups use the resulting disjoint assignments, not a second retry-round model.

### Costs, Recovery and Privacy

Preserve native provider-reported cost with its stated basis, even when that
basis is unknown. Keep actual incremental/billed charges, list-price-equivalent
estimates and subscription utilization as separate measures. A subscription
provider's reported dollar figure is not evidence of marginal billing. Zero
cost requires affirmative evidence for that particular measure. Subscription
fees remain in a separate utilization ledger and are never allocated to runs.
Keep currencies separate; optional conversion is a derived view with rate,
source and effective time, not a replacement for original currency amounts.
Versioned estimates record price source, model/tier, token category, effective
date, cache/tool charges and assumptions. Unknown prices produce unavailable
estimates; no current-price lookup is needed merely to retain reported costs.

Metrics persistence is part of the launch/turn journal. Seal sanitized available
observations before raw-output deletion; mark open attempts pending rather than
zero after a crash. Reconciliation attaches recoverable terminal observations
idempotently, without relaunching a provider to recover telemetry. A bounded,
configured telemetry grace period ends in explicit unavailable fields if needed.
Review verdict and telemetry completeness are separate status dimensions:
acceptance requires review evidence integrity, not complete provider counters.
Malformed telemetry is quarantined as a bounded diagnostic and cannot corrupt
valid response authority. Failure to persist the required receipt/envelope is
an evidence failure, not permission to finalize without it.

Once a terminal bundle is sealed, late usage or billing corrections create a
linked immutable telemetry amendment with its own inventory, prior receipt
references and supersession relationships. The original manifest, response
files and verdict stay unchanged. A current aggregate view resolves amendments
once and exposes its revision/as-of time; historical views remain reproducible.
Provider adapters and controller host adapters must advertise their respective
telemetry capabilities and mapping versions separately from review capabilities.
Missing usage support does not block an otherwise
eligible provider, but is visible before launch and in every affected receipt.
Adapter development may require provider-specific research into process exit
records, session APIs, host events, or billing/usage envelopes. The adapter
contract permits richer mappings over time while keeping review correctness
independent from complete telemetry.

Normalize telemetry through an allowlist of numeric counters, units, documented
enums, sanitized model labels and opaque local correlation IDs. Exclude prompt
text, reasoning text, tool arguments/results, query URLs, credentials and private
provider session handles. Keep category counts when available; expose redaction
and completeness flags without retaining sensitive values or hashes of secrets.
Capture failures preserve safe error codes and bounded sanitized explanations.
Diagnostic/debug retention is explicit, access-restricted and finite; it does
not override credential exclusion. Sealed normalized receipts, reconstruction
anchors and amendments are durable evidence, not disposable raw runtime logs.

The downstream #34 analysis is intended to distinguish stage yield, marginal
yield, residual defects and quality improvement per token, dollar and minute.
These are analysis requirements, not runtime-defined scoring formulas. #34 may
define weighting profiles and controlled comparisons with common baselines and
counterbalanced order; production sequences require conditional analysis. The
runtime preserves raw measures and outcome references for that multidimensional
scorecard without choosing weights or collapsing it to one universal score.

## Configuration

Existing sources remain user installation config and project/worktree
.ai-peer-review.json. Request overrides project, which overrides user.
Configuration is closed, versioned, and credential-free.

Named profiles define separate solo, author, and reviewer cascades:

    {
      "schema": "ai-peer-review.config/v2",
      "review": {
        "round_caps": { "sar": 6, "spr": 10, "xpr": 12 },
        "max_rounds_limit": 1000
      },
      "orchestration": {
        "default_profile": "deep-review",
        "profiles": {
          "deep-review": {
            "solo": [
              { "selector": "claude", "model": "claude-opus-5", "effort": "high" },
              { "selector": "codex", "model": "gpt-6-astra", "effort": "high" }
            ],
            "author": [
              { "selector": "codex", "model": "gpt-6-astra", "effort": "high" }
            ],
            "reviewer": [
              { "selector": "claude", "model": "claude-opus-5", "effort": "high" },
              { "selector": "grok", "model": "grok-5", "effort": "high" },
              { "selector": "codex", "model": "gpt-6-astra", "effort": "high" }
            ],
            "fallback_kinds_by_class": {
              "sar": ["sar"], "spr": ["spr"], "xpr": ["xpr"]
            }
          }
        }
      },
      "monitoring": {
        "liveness_interval_ms": 15000,
        "warn_after_ms": 60000,
        "reconcile_after_ms": 120000,
        "hard_timeout_ms": 1800000
      },
      "broker": { "idle_grace_ms": 60000 },
      "telemetry": { "grace_period_ms": 30000 },
      "diagnostics": { "retention_ms": 604800000, "preserve_clean_logs": false },
      "retries": {
        "max_launch_attempts_per_candidate": 2,
        "max_revision_attempts_per_round": 3
      }
    }

This skeleton enumerates every v2 runtime configuration key specified here.
All objects are closed. Policy values shown are package defaults;
deep-review and its models are illustrative registry fixtures, not installed
availability claims or a bundled default profile. Package profiles default to
empty and default_profile to null; an unresolved required role fails with setup
guidance. Each candidate requires selector; model/effort omission follows the
resolution rule above. Profiles may omit unused roles and
fallback_kinds_by_class; omitted class policies default to that class alone.
fallback_kinds_by_class is keyed by requested class, not by role. Each supplied
class entry must preserve its role count. Request stages retain the array field
fallback_kinds; the map name is not a request-field alias.

Merge package, user and project in order: scalar leaves replace; round_caps and
ordinary policy objects merge by named key; profiles merge by profile name but
each supplied named profile replaces the entire prior profile. Candidate arrays
and fallback class arrays replace wholesale, never concatenate. Fill omitted
policy leaves from package defaults after profile replacement. Validate each
source document structurally, then validate references and cross-field limits
against the resolved result. Unknown keys, empty supplied
candidate lists and nonexistent default profiles fail. Stage overrides affect
only that stage; resolved caps and every precedence source are sealed.

Durations are finite positive safe integer milliseconds; threshold order is
liveness_interval_ms <= warn_after_ms < reconcile_after_ms < hard_timeout_ms.
Caps and max_rounds_limit are integers in 1..1000, caps cannot exceed the resolved
limit, and retry counts are in 1..10, including the initial attempt. Initial
max_rounds is part of the authorized start request; extend-cap is a later change
of intent and requires new user authorization. A start request may carry
unattended=true as explicit authority to proceed without a visible monitor.
Otherwise the default is false. There is no monitoring.on_missing_surface key
in v2; the closed schema rejects it. Config cannot authorize unattended
operation on the user's behalf. lineage_mode and
unattended are the only additional top-level start options defined here.

hard_timeout_ms bounds active provider operations, including quiet reasoning,
not time waiting for controller intervention. Diagnostic retention is finite
even when preserve_clean_logs is true. Analysis weighting profiles belong to
issue #34's separately versioned consumer schema, not this runtime config. Token/spend
ceilings are deferred to a versioned policy extension: this release makes no
hard monetary-cap claim from incomplete or delayed usage. Round, retry and time
bounds still apply. Configuration never adds stages.

## Fallbacks

Before launch, the first eligible candidate becomes primary. During a run,
automatic fallback occurs only when a versioned adapter positively identifies
quota or capacity exhaustion. Unknown exits, authentication, permission, and
ambiguous delivery enter intervention.

Fallback is participant replacement, not identity mutation. The runtime closes
the incomplete stage-attempt, records the event, launches the next candidate, and
requires a fresh review of current FUR. Classification may change only when the
resolved cascade preauthorized it. The replacement cannot claim predecessor
acceptance.

Replacement stage-attempts share the original requested-stage round budget;
changing class never resets or expands it. Candidates are selected once per role
per requested stage, in sealed order, without cycling. Each selection has at
most max_launch_attempts_per_candidate reconciled launch attempts; an ambiguous
launch is never retried merely because its allowance remains. Exhaustion requires
intervention. Failed launches have a separate finite retry limit in sealed
runtime policy and cannot consume unbounded time or tokens.

Fence the outgoing participant and reconcile pending operations before
replacement. Require evidence that it can no longer write or submit. Preserve
partial author bytes as a recovery checkpoint, but do not treat them as a sealed
revision. Ambiguous edits require intervention; a new reviewer receives only a
reconciled checkpoint. Fallback never switches a worker silently.

An unavailable stage may use only an explicitly declared ordered alternative
under the registered extension described above; v1 supplies only sealed role
cascades and cannot skip or substitute an entire stage.
Undeclared downgrade or silent skip is forbidden. Future hosts such as
Antigravity/Gemini become eligible only after proving launch, identity, output,
cancellation, reconciliation, and recovery.

## Permissions and Research

Headless role capabilities are sealed at startup. Authors and SAR workers may
edit FUR, their own role submission partition and shared collateral. Two-party
reviewers may edit their own partition and shared collateral, but not FUR or
another role's partition. Both may read repository context and run approved
validation under the same scope restrictions.

Public web search, documentation lookup, and read-only APIs are allowed without
per-query intervention. External writes, uploads, issue creation, remote
mutation, package installation, downloaded executable use, destructive
commands, and broader filesystem writes require explicit authority. Material
sources are cited; credentials, cookies, and raw browser logs are excluded.

## Portable Project-Local Broker

Binary-free distribution applies to AIPR and its production dependency closure.
Already-installed Node and provider CLIs are external prerequisites; AIPR does
not build, bundle or download their executables. All three normalized journeys
are required product goals, not claims of existing adapter support. Admission requires a
versioned capability matrix for the exact host/model/effort, participant role,
launch, identity, output, permissions, cancellation and recovery. Unsupported
combinations fail preflight with an actionable capability report. Installed
conformance tests, not selector presence or model-name examples, establish
support. Generalized headless authors and SAR workers are new adapter work.

The broker starts for every review because every participant is headless. SAR
uses the same managed launch, liveness, telemetry, evidence, and recovery path
as SPR/XPR, with one worker instead of two.

Broker, participant wrappers, lifecycle, locking, IPC, authentication, and
cleanup use Node APIs or audited pure-JavaScript dependencies. The target
architecture removes native broker-security and node-gyp from the required
runtime/package path. Production install has no compile hook or binary download.

Each broker binds 127.0.0.1 on port 0. The OS chooses an unused ephemeral port.
Clients do not scan or assume a port. Each physical worktree stores ignored
endpoint metadata with worktree fingerprint, instance ID, port, credential
digest, and heartbeat. The random credential is separate and untracked. Every
request authenticates and binds expected worktree/instance.

Linked worktrees can run concurrently on distinct ports with independent
authority and package versions. The portable same-user boundary protects
against accidental cross-project access and unauthenticated clients, not
malicious same-user software.

Use cryptographically random per-instance credentials, restrictive storage and
verified OS-user access protections. If those protections cannot be established
with the supported environment, refuse startup with remediation; POSIX mode
bits alone are not a Windows ACL guarantee. Do not expose credentials to
participant prompts, collateral, URLs or logs. Reject unauthenticated traffic
before dispatch, browser-origin requests, wrong-instance requests and oversized
frames. No CORS-enabled public browser control endpoint is provided. Atomically
publish endpoint records only after exclusive worktree ownership is established;
stale ownership needs reconciliation, never age-only takeover.

The v1 wire protocol is HTTP/1.1 over the loopback listener using Node built-ins,
with versioned JSON bodies. Host must be the literal 127.0.0.1 plus the exact
bound port; DNS hostnames, missing/duplicate Host, absolute-form targets, Origin
and any Sec-Fetch-\* header are rejected. Reject upgrade requests; provide no
CORS/preflight support. Credentials travel only in the Authorization header,
never URLs or query strings, and request/header logging is disabled. The trusted
bridge supplies a scoped grant bound to the worktree and instance; instance
bootstrap/cleanup credentials alone do not grant participant submission rights.
Authenticate before operation dispatch or body interpretation. Limit headers to
16 KiB, each body to 1 MiB, header/body receipt to 10 seconds and unauthenticated
idle connections to 5 seconds. Close malformed or oversized requests, with
bounded errors and no reflected credentials. Long authenticated wait responses
use bounded event frames, each at most 1 MiB; request-receipt timeout does not
limit the wait lifetime. A browser-facing read-only monitor uses a separate
redacted projection, never direct access to this authenticated control listener.

Pure JavaScript IPC is not a filesystem sandbox. A headless provider must expose
a tested permission surface enforcing the role's write scope, including denial
of package-authority writes; prompts alone do not qualify. If unavailable, fail
that topology's capability check. Read-only research remains allowed. Validation
commands are separately scoped because test tools may write caches or artifacts.
Broker-loss handling requires a tested provider cancellation/containment
contract for descendants, not just a direct-child PID signal. When safe
termination cannot be proved, fence the run and preserve recovery state instead
of launching a replacement or claiming cleanup succeeded. This boundary must be
tested separately on each supported OS, without introducing custom binaries.

The broker starts on first managed run, remains while work is active or
recoverable, and exits after a configurable idle grace. Participant wrappers
monitor its lease and terminate only the exact owned provider process tree under
the conformance-tested containment contract after permanent broker loss. An
unproved descendant exit retains the fence even if the direct child is dead.

Before each provider launch, its operation journal also records an opaque
execution_host_id, verified boot_epoch, broker_instance_id and the containment
scope covering that operation's potential writers. The host/boot observation
has a source, version and assurance supplied by a read-only OS-specific adapter;
raw machine identifiers stay private. A broker-instance change, PID absence,
wall-clock estimate, os.uptime-derived timestamp or operator assertion is not
a verified boot-epoch change. Conformance must prove that the source distinguishes
full restarts from broker restarts, sleep/resume and host-identity changes.
Supported OS adapters must provide this observation or another tested durable
termination proof for host-restart recovery using the binary-free runtime
constraints. Unknown launch epochs cannot be filled in retrospectively.

Project cleanup uses the same object through cleanup_brokers(request) or CLI:

    peer-review broker cleanup '{"schema":"ai-peer-review.cleanup-request/v1",
      "project":"/path/to/any-project-worktree","mode":"dry-run"}'

    peer-review broker cleanup --request cleanup.json

mode is dry-run or apply. Apply additionally requires action_id for replay
safety and revalidates ownership/activity at execution; a preview is no authority
to stop a broker that became active afterward. Any legacy flag facade must
normalize to this object and is not the agent-facing contract.

It resolves the Git common directory and enumerates all linked worktrees,
including those under provider directories such as ~/.claude. A derivative
project broker index supports removed-worktree cleanup without sharing run
authority. Cleanup gracefully stops authenticated idle brokers, refuses active
or recoverable work, quarantines stale records, reports mismatches, never kills
from stale PID text, and supports structured output. Independent clones remain
separate projects.

The advisory index lives at ai-peer-review/brokers/ relative to the canonical
Git common directory G (outside the Git index and never tracked). Each worktree
has its own fingerprint-keyed JSON entry; the owner publishes by exclusive
temporary create, flush and atomic rename while holding a per-entry lock with
owner identity. Cleanup acquires that same lock and compares the entry revision
before updates/quarantine. It never holds a second entry lock while acquiring
one, so independent worktrees can publish concurrently. Stale locks require
verified owner reconciliation. Invalid/stale entries move to the adjacent
quarantine/ directory with their bytes and observation receipt preserved.
Discovery is advisory; neither an index entry nor its PID proves ownership,
idleness, process identity or termination authority.

Cleanup's trusted runtime may read each target worktree's private credential
directly under the same-user boundary, after verifying the physical target and
its private storage protections. Credentials and credential digests are excluded
from tool responses, output and logs. Unreadable credentials or a removed
worktree without a verifiable authenticated endpoint produce unreconciled status;
they never permit force-stop. The index contains no credentials. Apply rechecks
the authenticated target's instance, run activity and fences under its ownership
lock. Active, recoverable or failed-but-fenced work prevents cleanup. An upgrade
may add this advisory index without altering any run journal.

## Disconnect and Recovery

- SAR, SPR, and XPR continue after originating-chat loss while their worker
  sessions and broker remain healthy.
- No participant is silently replaced.
- Another chat reconnects by run ID using durable authority.
- Unknown side effects remain fenced until reconciliation.
- CLI never bypasses broker, protocol, identity, or integrity failures.

intervene_review accepts a closed action union: cancel, resume, replace-participant,
extend-cap, reconcile-operation, resolve-checkpoint or acknowledge-unresolved.
Each carries action_id, expected_revision and validated
action-specific parameters. Mutations require authenticated controller authority;
reconnecting by run ID alone grants neither controller nor participant authority.
An exact replay returns its receipt, a stale revision fails, and unknown provider
effects block resume/replacement. Cancel fences new work, reconciles and stops
owned processes, and reports cancelled only after that is confirmed. Extending
a cap or replacing a worker identity requires explicit user authorization
recorded in the event stream; automatic fallbacks use only the sealed policy.
No intervention may turn unresolved findings into normal acceptance.

A worker session that cannot be verified on resume stays awaiting-participant
without automatic replacement. It requires exact-session recovery, a
preauthorized fallback, explicit user-authorized replacement, or cancel.
Observer reconnect does not issue a participant grant.

The additional recovery actions require a verified user-authorization receipt
from the authority mechanism and a reason, not just a model claiming recovery
is safe. Receipt IDs and the authorized action parameters enter the event stream:

- reconcile-operation supplies operation_id and evidence receipt references.
  The adapter re-observes exact process/session identity, descendants and side
  effects, or supplies the verified host-restart proof defined below, appends
  a reconciliation result, and clears only proved fences.
  Unknown observations leave the run fenced with an exact next action. This
  action remains available for a failed-but-fenced run solely to resolve its
  obligations; it cannot reopen a terminal verdict.
- resolve-checkpoint supplies checkpoint_id, expected_current_digest and either
  retain-partial or restore-sealed with the target sealed digest. Require proved
  writer quiescence and unchanged expected bytes. Seal both versions first; the
  supervisor applies the selected bytes as an authorized recovery write and
  emits a recovery patch and disposition. It never labels partial bytes a
  completed author revision. A fresh critique is required before acceptance.
  Unknown writers block the action, even with operator authorization.
- acknowledge-unresolved supplies operation IDs and the operator's reason for
  ending review work without proof of termination. It may set status=failed and
  assurance=termination-unproved, but retains every unresolved fence, artifact
  lease and cleanup obligation. It cannot mark cancelled, release the FUR for
  another run, launch replacements or claim cleanup succeeded. Later verified
  reconcile-operation may discharge those obligations without changing verdict.

For host-restart reconciliation, compare the journaled boot epoch with a fresh
verified observation of the same execution host. A proved epoch change is
positive termination evidence only for the process/descendant obligations whose
sealed containment contract confines all writers to that host. Append
terminated-by-host-restart with both evidence references and discharge those
process fences; an absent old session handle is not required to become
resolvable. Remote jobs, another execution host, migrated sessions, uncertain
containment or unknown boot evidence retain their own obligations. Revoke old
role bindings before any replacement; boot evidence never resumes a session.

Filesystem effects are separate obligations. Compare current FUR bytes with the
sealed baseline and recorded checkpoints, preserve unexplained partial bytes,
and require resolve-checkpoint when a recovery write/disposition is needed.
Only after all potential writers are proved quiescent and artifact effects
reconciled may the artifact lease be released. Other retained diagnostic or
telemetry obligations remain explicit and cannot authorize new writes. A
failed-but-fenced run remains failed after this discharge; it is not relabeled
cancelled or accepted. Recovery uses the existing authorization, journal and
replay rules, never age-based takeover or deletion of state.

Pre-start series conflicts have no run_id, so they use a distinct closed request:
reconcile_review_series (CLI reconcile-series), schema
ai-peer-review.series-reconcile-request/v1. It requires action_id, filepath,
expected pointer bytes' digest (or absent), expected index revision, user
authorization and reason, plus action=repair-pointer, repoint or new-lineage.
Repair/repoint names a validated retained series; new-lineage allocates a fresh
ID and records the predecessor when known. The core acquires the artifact and
series locks, requires no live/fenced owner, preserves prior pointer bytes and
index receipts in its recovery journal, then journals the bounded pointer or
sidecar change and reversible patch. That is the same initialization-only write
authority as the start merge, not an author turn. It never rewrites historical
records or fabricates missing evidence. Replays return a receipt; stale bytes or
an unverifiable target fail. start errors name this exact recovery operation.

Stale broker ownership follows the same evidence-first rule: the owner identity,
process tree and pending effects must be reconciled under its lock before
reclamation. No recovery action accepts elapsed age or an operator assertion as
proof of death. Fail-closed can require external remediation; the API records
that limitation and the outstanding obligations instead of inviting state deletion.

## Out-of-Band Monitor and Usage

start_review returns a receipt, then the controller calls wait_for_review. It
calls again after intervention or observer detach, always resuming from the
durable cursor. The adapter reattaches outside inference
where supported; each call covers one wait interval, not the entire conversation.
The call blocks outside model inference while a capability-tested MCP progress
surface or an equivalent out-of-band surface updates the user. Host progress
rendering and wait-duration limits are validated separately from provider
capabilities. If MCP cannot render progress, the receipt links a local read-only
monitor or CLI watch surface. If no visible surface can be established, reject
before reservation unless the submitted request explicitly authorizes unattended
operation, following APR_MONITOR_SURFACE_REQUIRED and its retry contract.
Transport timeouts detach observers, not cancel reviews; adapters reattach with
the durable cursor outside inference when possible. Host-forced model re-entry
is disclosed and measured rather than called zero-token waiting. With
`host_wait_capability=single-wakeup`, the controller model wakes only for
intervention or terminal state.

host_wait_capability is single-wakeup, model-reentry-required or unknown.
single-wakeup requires a tested out-of-band visible progress surface, durable
cursor delivery, and either a run-lifetime wait or adapter renewal/reconnection
across every wait ceiling and phase/stage boundary entirely outside inference.
The guarantee spans the entire run, not just one hard_timeout_ms operation.
A short wait ceiling is compatible only when renewal meets that condition.
unattended authorization does not confer this capability.

Preview and receipt record this capability, observed_wait_ceiling_ms (null with
reason when unbounded or unknown), ceiling_kind (finite, unbounded or unknown),
outside_inference_reattach, and evidence source/version. For a host requiring
periodic model re-entry, disclose its observed re-entry cadence before launch.
expected_reentry_count is null with reason unknown-duration unless a duration
is actually known. For the deterministic fixed-ceiling fixture with duration D,
ceiling W and terminal delivery taking precedence at an equal boundary, the
count is max(0, ceil(D/W)-1), excluding the terminal wakeup. Do not turn that
fixture formula into a fabricated prediction of provider runtime.

For `host_wait_capability=unknown`, preview and receipt explicitly disclose
that wait/reattachment behavior is unverified and that no single-wakeup guarantee
applies. If no wait ceiling is observable, report `ceiling_kind=unknown` and
`observed_wait_ceiling_ms=null` with reason `not-observable`. Report an
unobservable `outside_inference_reattach` as null with that reason, not false.
`expected_reentry_count` is null with reason `unknown-capability`, even when a
duration is supplied; this takes precedence over the known-capability
duration formula above. Do not invent a re-entry cadence. Preserve any
independently verified component observation, such as a finite ceiling, with
its evidence without promoting the overall capability.

Unknown wait capability alone does not reject a run or require unattended
authorization: `unattended=false` is admissible when a visible monitor surface
is verified and the other admission checks pass. An unavailable or unverified
visible surface still follows `APR_MONITOR_SURFACE_REQUIRED`. Observe and
account for actual host-forced re-entries; do not introduce periodic model
polling as a substitute for unknown wait behavior. Later capability evidence
is recorded explicitly rather than retroactively claiming a guarantee.

After the initial receipt, successful controller wakeups are bounded by
actionable interventions + host-forced re-entries + one terminal result.
Repeated delivery of the same cursor does not create another wakeup. In a
fault-free SAR, SPR, or XPR with `host_wait_capability=single-wakeup`, exactly
one post-receipt model wakeup delivers terminal status. Provider monitoring and participant handoffs
never create periodic controller model turns.
Unexpected periodic re-entry on a host advertised as single-wakeup is a
capability violation: record the diagnostic and observed degradation, and fail
the corresponding conformance gate rather than exempting those wakeups.

    XPR · stage 2/2 · round 2/12 · elapsed 04:12

    Controller  supervising           wait tokens unavailable (not-exposed)
    Author      GPT-6 Astra / high     revising · 00:38 · event 3s ago
    Reviewer    Claude Opus 5 / high   waiting  · response sealed

    Usage       controller unavailable (not-exposed; host-transport)
                author 21.4k reported · reviewer 16.8k reported
                worker known subtotal 38.2k derived · combined total unavailable

The registered structured fixture for this rendering has controller model and
effort null, controller usage and wait-token values null with
provenance=unavailable, reason=not-exposed and source=host-transport. Its author
and reviewer observations are respectively 21400 and 16800 tokens, each with
provenance=reported, its own provider-adapter source/version and observation ID.
The fixture declares these two token measures disjoint and compatible; 38200
is a derived known subtotal referencing both IDs, not another observation.
Controller coverage is missing and the complete combined total is null.
The schema-validated fixture generates this display; no zero or identity label
is supplied by a display-only default.

SPR and XPR always show separate controller, author, and reviewer lines. SAR
shows separate controller and solo-worker lines, with critique/revision as the
worker phase. The monitor shows total and phase duration, stage/round/cap,
liveness, last provider event, protocol progress, and usage provenance.

The monitor updates elapsed time locally. Config defaults are exact:
monitoring.liveness_interval_ms=15000, warn_after_ms=60000 and
reconcile_after_ms=120000. Provider-output age is measured from the latest
observed provider event, or dispatch if none exists. Observation staleness is
measured from the last successful liveness check; declare the observer stale
after two missed liveness intervals. Each check warns at age >= warn_after_ms
and performs a read-only reconciliation probe at age >= reconcile_after_ms,
without killing a legitimate long reasoning turn. A proved-live quiet provider
remains running; unknown effects fence it. hard_timeout_ms defaults to 1800000
from active-operation admission and intervenes with fencing/cancellation checks.
The 120-second reconciliation threshold ensures that roughly two minutes of
silence produces visible diagnostic progress rather than appearing to be a
crashed or abandoned review.

Use an injected monotonic clock for intervals; UTC timestamps are for display
and audit. Across restart, record a new clock epoch and reconcile outstanding
deadlines before dispatch; clock uncertainty never renews a budget silently.
Deterministic tests advance fake time with zero logical threshold tolerance.
Live checks run on the next event-loop observation, normally within one liveness
interval; scheduling lateness is reported, not treated as proof of process death.
These are runtime timers, not model wakeups.
Distinguish broker heartbeat, provider-process health, provider output and
protocol progress. No output is a quiet/stalled indication, not proof of death.
Show the last successful observation and stale status when monitoring itself
disconnects. The read-only monitor cannot exercise controller actions.

Progress is not accumulated into model context. Terminal output is bounded and
links to evidence. Usage is reported, derived, estimated, or unavailable. Hidden
reasoning and provider-internal usage are never represented as zero. Broker,
CLI, and MCP compute consume no model tokens.

Request construction, interventions, returned tool text and terminal summaries
may consume controller tokens. Show these separately from worker usage and idle
wait compute; controller usage is unavailable if the host cannot report it.
Normalize cumulative versus per-turn provider usage to prevent double counting.
Cost estimates require price provenance; subscription utilization remains
separate from marginal API cost and is never represented as a free review.

The monitor displays provisional attempt metrics as they become available, but
the sealed evidence remains authoritative. Some providers return usage only
when a process exits or is interrupted; the wrapper captures that terminal
result before deleting raw output. If termination yields a structured usage
record but no response, the failed attempt still appears in the round and run
totals. Metrics collection failure cannot turn a failed review into success or
block evidence finalization when the affected values are honestly unavailable.
The monitor labels incomplete coverage as a known subtotal and distinguishes
reported dollar equivalents from actual charges. It uses the same accounting
view and amendment revision as status/exports; it never independently sums
embedded response metrics. Failure to persist evidence still blocks sealing.

## Agent-First MCP and CLI

Preferred MCP tools are:

    start_review(request)
    preview_review(request)
    wait_for_review(run_id, after_cursor)
    get_review_status(run_id)
    intervene_review(run_id, action)
    submit_review_turn(request)
    get_peer_review_help(topic)
    cleanup_brokers(request)
    reconcile_review_series(request)

These signatures describe logical arguments. Each concrete tool takes one
versioned closed JSON object, identical to its CLI inline/--request input.
Status and wait requests carry run_id; wait also has after_cursor. Intervention
adds action_id, expected_revision and a discriminated action with parameters.
Help has topic and format (structured by default). Authentication travels in
the local transport binding, never model-visible JSON. Read capabilities expose
only their authorized run/status data; monitor access is scoped separately from
controller mutation authority and excludes private handles and credentials.
CLI status, wait, intervene, submit, help, cleanup and reconcile-series use the
same registry and envelopes.

submit_review_turn carries schema, run_id, stage_attempt_id, round, action_id,
expected_revision, phase (critique or revision), reviewed_digest and response
path/digest within the bound role's submission partition in the review folder.
Paths in shared collateral or another role's partition are rejected before
sealing. Critique responses contain verdict, stable
findings and resolutions (an empty array if there are no prior open findings).
Each resolution names `finding_id`, state and rationale, plus target_ids for
duplicate/superseded/split lineage as applicable. Revision responses contain
dispositions and revised_digest.
The runtime reads/seals response bytes itself, checks the active phase, verifies
the participant's bound session and checks FUR bytes before advancing. It
generates patches rather than trusting participant-supplied patches. Exact
action replay returns the receipt; conflicting replay, wrong role/phase or stale
digest/revision fails without advancing. Controller credentials cannot submit
participant turns. Every headless wrapper uses the same transition contract
under its role binding.
Every handoff supplies an exact structured next_action naming this operation
and its schema. Every critique/revision handoff, including resume and replacement,
also supplies `submission_partition_path` and `shared_collateral_path` as exact
absolute paths in the originating physical worktree, bound to the current role
grant and checked against the enforced write scope. SAR receives the solo
partition. Participants use these supplied paths rather than constructing them
from run IDs, role names or storage templates. Critique handoffs also carry the
already-used-ID context reference defined in Findings and Debate. These local
handoff paths do not add absolute paths to portable evidence. The worker never
edits package authority directly.

All responses carry schema, ok, mutation_occurred, retry_safe and bounded
next_action. Run responses include run_id, status, revision, cursor, evidence
paths and the applicable capability/usage provenance. status is deliberately
coarse. The response registry additionally requires these orthogonal dimensions:

- liveness: broker_heartbeat_age_ms, broker_health (live,
  lost, recovering, unknown or not-applicable), last_protocol_progress_at,
  last_successful_observation_at, observation_age_ms and monitor_stale.
- participants: one entry per role with participant ID, placement, phase
  (launch, critique, revision, waiting or terminal), role_state (active,
  awaiting-resume, quiet, stopped, unknown or complete), process_health
  (live, dead, unknown or not-applicable), last_provider_event_at and
  provider_output_age_ms. Unavailable observations are null with a reason,
  never fabricated timestamps or zero ages.
- fencing: active plus entries naming participant/operation IDs, stable reason
  codes, outstanding obligations and the exact recovery action. A terminal
  failure can retain active fencing. Observer connection state and stale age
  are reported by each observer even when the broker cannot be reached.
- `dispatch_admission`: `held` (boolean), `reason_code` and `required_action`.
  The observer hold uses `held=true`,
  `reason_code=awaiting-visible-observer` and
  `required_action=reattach-visible-observer`; otherwise these last two fields
  are null and `held=false`. This dimension describes the additional visibility
  hold, not permission to bypass phase, cap, identity, fence or terminal checks.
  Status, wait events and monitor projections expose the same journaled hold.
  An unreachable observer reports its last-known value with the existing stale
  observation marker, never an invented current clearance.

Required observable tuples, under the named fixture conditions, are:

Except where observer loss is specified, these fixtures retain a verified visible
surface. The observer-only hold fixture has no independent failure or fence.

| Fixture                                                                            | status                | Liveness/participant observation                                                     | Fencing                                                           | dispatch_admission                                                                          |
| ---------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Observer disconnect during worker activity                                         | running, last known   | Observer monitor_stale=true after its threshold; remote health unknown until recheck | Last known fencing with stale marker, never invented remote proof | Last known value with stale marker                                                          |
| Last visible surface lost during an active run, unattended=false; broker reachable | running               | Broker and admitted workers remain healthy; admitted work may finish and seal        | inactive                                                          | held=true; reason_code=awaiting-visible-observer; required_action=reattach-visible-observer |
| Quiet reasoning with proved-live process                                           | running               | process_health=live, role_state=quiet after warning, increasing output age           | inactive                                                          | held=false                                                                                  |
| Unexpected process death mid-turn                                                  | intervention-required | process_health=dead, role_state=stopped                                              | active: provider-process-dead and pending-effect obligations      | held=false                                                                                  |
| Broker restart before reconciliation                                               | reconciling           | broker_health=recovering, participants unknown pending observation                   | active: broker-restart                                            | held=false                                                                                  |
| Second participant launch failure                                                  | intervention-required | Failed role stopped/dead if proved; first role observed separately                   | active: partial-launch, first role and launch operation fenced    | held=false                                                                                  |

Current observations may refine these tuples only through recorded
reconciliation or the journaled observer-hold transitions defined above; they
do not redefine the coarse state enum.

Error issues are bounded
with a truncation count when necessary. The help registry provides exact
schema IDs and every action variant; consumers do not infer state transitions
from prose summaries. Read-only tools never silently create a run or broker.

CLI is the last fallback when MCP is unsupported, unconfigured, stale, failed,
disconnected, or blocked by a host sandbox. It uses identical schemas.
MCP failure does not imply broker failure; broker failure does not authorize
CLI bypass.

Responses lead with stable fields, mutation status, retry safety, bounded
summary, evidence paths, and exact next action. Large artifacts are not injected
into context.

## Errors and Self-Discovery

Invalid requests fail before broker startup, state creation, or provider
launch. Errors include stable code/message, every issue with JSON Pointer,
rule, received value when safe, expected shape, correction, mutation status,
retry safety, schema, help topic, and examples.

    {
      "schema": "ai-peer-review.response/v1",
      "ok": false,
      "mutation_occurred": false,
      "retry_safe": true,
      "next_action": {
        "tool": "get_peer_review_help",
        "arguments": {
          "schema": "ai-peer-review.help-request/v1",
          "topic": "start-request",
          "format": "structured"
        }
      },
      "error": {
        "code": "APR_REQUEST_INVALID",
        "message": "Review request is malformed.",
        "issues": [{
          "path": "/stages/0/kind",
          "rule": "enum",
          "received": "sra",
          "expected": ["sar", "spr", "xpr"],
          "suggestion": "sar"
        }],
        "help_topic": "start-request",
        "schema": "ai-peer-review.start-request/v1",
        "examples": ["sar"]
      }
    }

One machine-readable registry drives CLI help, MCP tool schemas/descriptions,
JSON Schemas, examples, error documentation, and golden tests. Offline help
validates every emitted example against its registered schema, including config,
monitor/status, error and participant-submission envelopes. Model/effort examples
use a pinned conformance fixture registry for offline tests; installed admission
separately validates real capabilities. Rendered monitor examples derive from
validated structured status fixtures, not unvalidated display-only strings.
The registry supplies schemas for response
bodies as well as tool inputs. Offline help
covers commands, request schema, classes, sequences, fallbacks, permissions,
monitoring, evidence, broker, errors, and all three normalized user journeys.

The registry also defines versioned attempt receipts, measurements, aggregate
coverage, response-envelope framing, manifest receipt references and telemetry
amendments. They share operation/attempt/observation identities with protocol
events. Provider adapter mappings validate into these schemas before persistence;
unknown versions fail explicitly. Participant submissions contain participant
content only, never writable supervisor fields. Status and error envelopes
expose telemetry completeness and safe collection diagnostics separately from
review status, with exact recovery actions for evidence-persistence failures.

The installed skill stays small: recognize intent, query help when uncertain,
construct request, prefer MCP, fall back to CLI, and follow structured next
actions. It does not duplicate runtime policy.

## Relationship to Current Architecture

The design preserves separation among skill, CLI, MCP, protocol, provider
adapters, transports, and project-local supervision:

- protocol/evidence remains durable review truth;
- adapters remain responsible for capability and identity evidence;
- MCP remains host adapter rather than universal controller;
- CLI remains complete fallback and recovery surface;
- project broker owns managed process lifetime and routing; and
- native broker security/build requirements are removed.

It replaces assumptions that every review has exactly two participants, the
invoking session is a participant, manual XPR is a human-relayed product mode,
and startup should be numerous CLI flags.

## Migration Principles

- Read terminal historical records without rewriting them.
- Do not reinterpret historical transport claims.
- Preserve old broker-owned review recovery under compatible runtime.
- Introduce request/config/evidence changes under explicit schema versions.
- Migrate public startup only with clear release compatibility notes.
- Remove native closure only after JavaScript broker proves lifecycle,
  authentication, concurrency, stale recovery, reconciliation, and installed
  cross-platform behavior.
- Keep #102 as the version-policy owner, with the explicit coexistence dependency
  below; do not duplicate its resolution policy inside orchestration.

Active legacy reviews remain pinned to their compatible installed runtime and
authority format until drained or explicitly exported at a reconciled terminal
boundary. The new package neither rewrites live journals nor ships the retired
native helper to resume them. Upgrade preflight reports these dependencies and
requires retaining the old installation when needed. Imported terminal records
retain original schema and assurance labels. The v1 config reader remains
available for legacy use; v2 migration is explicit and never maps max_turns to
max_rounds as if they counted the same events. Unknown schema versions fail
with version/help guidance, not permissive parsing.

For new-runtime starts/previews, any participating v1 user or project config
fails before mutation with APR_CONFIG_MIGRATION_REQUIRED. The error lists legacy
keys, changed semantics, proposed v2 equivalents and prospective caps/sources;
it never ignores max_turns or silently adopts default round caps. The user must
explicitly migrate to v2 before new runs; legacy runs still use their pinned v1
reader. Mixed v1/v2 layers also fail for new runs. A migration tool may preview
changes but cannot infer a numerically equivalent round cap from max_turns.

Do not remove the existing manual XPR startup path until an installed
cross-family headless-author/headless-reviewer combination passes launch,
identity, role enforcement, external telemetry observation, cancellation,
recovery and end-to-end evidence conformance on each platform advertised for
the replacement. Until then, the
legacy entry point remains explicitly available in its retained compatible
installation alongside the new runtime, with its original assurance labels.
Unsupported new-runtime topologies fail with guidance to that explicit legacy
choice; they never silently assign the controller to a participant role.
Retirement notes must identify the tested
replacement, invocation changes, retained-run recovery and explicit config
migration. The final replacement release must demonstrate all three journeys for
its advertised capability matrix; incremental previews cannot claim completion.

Each new run seals a runtime_binding with package version, canonical installed
runtime locator, installation digest, authority schema and adapter versions in
its package-owned run header. Legacy discovery records the compatible locator
in a separate protected routing record referencing unchanged legacy authority.
Issue #102 must support per-run pinned installation coexistence within one worktree;
this is an implementation prerequisite, not an assertion about its current plan.
CLI/MCP lookup verifies that binding before any mutation and dispatches to the
pinned entry point; brokers and workers independently verify the same binding.
An absent/mismatched installation returns APR_PINNED_RUNTIME_UNAVAILABLE with
the required version/digest and recovery guidance, never current-runtime replay
of an old journal or automatic installation.

Old and new broker namespaces remain distinct during drain. The #102 routing
facade must consult active/fenced legacy ownership before granting a new FUR
lease; uncertain overlap refuses a new start. One new-runtime broker owns each
physical worktree; different modern run bindings must negotiate compatibility
or defer activation until a broker can be safely replaced. This prevents two
same-worktree brokers from becoming competing writers merely because both
installations are retained. Terminal imports preserve their original assurance.

## Current-State Gap Assessment

This design is a major evolution of the current product model, but it is not a
greenfield rewrite. The repository already contains a strong integrity and
recovery core. The largest changes are above and around that core: request
model, participant topology, orchestration, portable broker implementation,
monitoring, and evidence shape.

### Reuse With Extension

- The append-only protocol store, reducer, optimistic revision checks, locks,
  terminal receipts, recovery states, and compatibility machinery remain the
  starting point for durable authority.
- Participant identity evidence, provider capability checks, Claude launch
  isolation, exact-session continuity, and provider conformance remain useful.
- Project identity, physical-worktree binding, broker registry, idle lifecycle,
  worker abstraction, and fail-closed reconciliation remain useful concepts.
- Git repository containment, exact-path transactions, artifact digests,
  sealed responses, and no-commit snapshots provide reusable integrity
  primitives even though ordinary review rounds will stop committing.
- Existing offline help, configuration loading, CLI parsing, packaging tests,
  and MCP stdio setup are reusable implementation surfaces.

### Material Rework

- Startup currently assumes the invoking session is the author, selects one
  reviewer, and derives only SPR or XPR. It has no SAR, permanently
  non-participant controller, normalized headless-worker topology, or ordered
  review-stage sequence.
- The public CLI accepts a positional artifact plus many flags. It needs the
  canonical versioned JSON request, request-id idempotency, preview, and
  generated validation/help contract.
- MCP currently exposes only `wait_for_handoff`. The agent-first start, preview,
  status, wait, intervention, and help tool family is new.
- Protocol state is a two-participant alternating-turn machine with one global
  turn budget. It needs run/stage/round structure, SAR role co-location,
  explicit controller state, per-class caps, finding lineage, author
  dispositions, and sequence termination on non-acceptance.
- Existing transport modes describe manual relay, resume-only, and automatic
  handoff. The target product instead fixes participant placement as headless
  and makes managed execution the normal broker-owned path.
- Configuration v1 has one `review.max_turns` and transport preferences. It
  needs v2 class caps, named role-specific cascades, fallback authorization,
  monitoring policy, and user/project merge behavior.
- Current broker authentication and private IPC require the native
  `broker-security` addon and `node-gyp`. The target uses portable loopback TCP,
  ephemeral ports, credentials, and pure JavaScript lifecycle controls.
- Existing collateral assumes committed triads and narrowly allocated response
  files. The target permits role-owned submission staging and shared collateral
  writes, keeps one mutable FUR, and lets the supervisor generate digest-bound
  patches while denying cross-role staging writes.
- Current wait behavior is handoff-oriented. A zero-model-turn progress stream,
  liveness policy, participant lines, usage provenance, and bounded terminal
  summaries are new.

The practical distance is therefore **major but foundation-preserving**. The
integrity, identity, recovery, and provider work should be evolved in place;
the current public startup contract and participant state machine should not be
incrementally stretched until their old assumptions become hidden policy.

## Backlog Ownership and Overlap

This assessment records backlog observations from the design session on
2026-09-27 against source baseline fa78855. It is provisional planning input,
not live issue authority. Revalidate bodies, dependencies and status before
implementation planning or issue mutation; this design does not change them.

| Issue                | Status             | Relationship to this design           | Ownership boundary                                                                                                                                                                                                       |
| -------------------- | ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #107                 | Backlog            | Direct but materially misaligned      | Rewrite as the orchestration/API/runtime parent. Its current requirement for broker-free manual XPR conflicts with the approved rule that managed headless work uses the project-local broker.                           |
| #30                  | Plan               | Shared contract prerequisite          | Implement and migrate the shared record, series-index, patch-chain and response-envelope interfaces declared here. Reconcile its plan before schema freeze; #107 consumes that implementation, never a parallel layout.  |
| #31                  | Ready for Planning | Partial overlap                       | Own clone-shared projection and coordination. It may project review state and support project-wide cleanup discovery, but disposable SQLite must not become broker or run authority.                                     |
| #32                  | Ready for Planning | Partial overlap                       | Own bounded project knowledge retrieval. The runtime owns prior-stage visibility and records the exact context receipt supplied to each participant.                                                                     |
| #33                  | Ready for Planning | Downstream overlap                    | Own defect attribution, review escapes, and governed lessons. The runtime emits normalized finding and outcome linkage needed by that analysis.                                                                          |
| #34                  | Ready for Planning | Telemetry contract consumer           | Consume #107 attempt-metrics, measurement, aggregate-coverage and telemetry-amendment contracts. Own outcome/scoring vocabulary, weights, experiment arms and non-delivery comparisons; reconcile schemas before freeze. |
| #102                 | Plan               | Runtime resolution prerequisite       | Own per-run pinned installation routing and cross-entry-point compatibility, including same-worktree legacy coexistence and artifact ownership checks required here. Reconcile this dependency before implementation.    |
| #39-#51              | Done               | Reusable foundation plus one conflict | Preserve project identity, startup fencing, registry, workers, recovery, adapters, help, and packaging work. Replace the native broker-security closure and reinterpret transport around the new topology.               |
| #88, #90, #101, #106 | Done               | Reusable hardening                    | Preserve provider authority, isolation, response freshness and launch diagnostics. Retain #106 manual startup through the explicit migration gate, then preserve its regression lessons in the replacement.              |
| #9                   | Done               | Conceptual overlap                    | Reuse durable, context-efficient wakeup lessons when implementing the out-of-band monitor.                                                                                                                               |
| #10                  | Done               | Adjacent, not equivalent              | Multi-artifact phases are artifact sequencing inside one review; SAR/SPR/XPR stages are review-pattern sequencing. Keep both concepts explicit.                                                                          |
| #70                  | Backlog            | No product overlap                    | AITM estimation-rubric configuration only.                                                                                                                                                                               |

The principal collision is #107 versus #30/#34. Build the implementation plan
from the reviewed specification first, then supersede or rewrite backlog #107
around that approved plan. Declare schema contracts with #30 and telemetry
contracts with #34. These ownership assignments are proposals to reconcile with
their current plans, avoiding two evidence layouts or analytics vocabularies.

The likely delivery shape is an epic rather than the current single code story:

1. Canonical request/config/help registry and compatibility facade.
2. Run/stage/round protocol with SAR and generalized participant topology.
3. Portable JavaScript broker, adapters, fallback, and project cleanup.
4. Agent-first MCP tools and out-of-band monitoring.
5. Evidence integration with #30 and metrics integration with #34.
6. Installed-package, cross-platform, migration, and end-to-end verification.

## Required Verification Themes

Planning must cover all three normalized topologies; JSON input equivalence; detailed errors;
cross-transport idempotency; classification and fallback transitions; caps;
author responses and finding lineage; participant/session identity and proved
controller/worker and worker/worker distinctness; reviewer FUR denial and
role-isolated submissions with shared collateral writes; dirty/new FUR snapshots and leases;
supervisor patch chains; automatic lineage; visibility; web research;
concurrent worktree brokers; ephemeral ports; authentication; restart;
reconnect; cleanup; binary-free production tarball; zero-turn monitoring;
usage provenance; evidence reconstruction; CLI fallback; and one-source help.

Concrete release gates include the shared interfaces declared here. Gates 3,
10, 11 and 12 require #30/#34 contract adoption; gate 8 requires #102 routing
adoption. Those dependencies block release, rather than making gates optional:

1. Equivalent CLI/MCP JSON returns one run despite whitespace/key order;
   max_rounds forms 6, 6.0 and 6e0 and filepath strings "spec.md" versus
   "\u0073pec.md" produce identical canonical bytes and no second launch.
   Encoder unit fixtures cover escaping and UTF-16 ordering with non-BMP keys;
   unknown request keys still fail the closed schema before reservation.
   Lone surrogates and invalid numeric domains fail before hashing/reservation;
   different content with the same ID conflicts. Concurrent retries and a crash
   after each launch-journal write never cause an unobserved duplicate launch.
   Raw duplicate keys fail where observable; parsed-only MCP records that limit.
   Reusing an ID with spec.md versus ./spec.md conflicts without a second launch.
2. Clean review on the last permitted round accepts; a last-round revision
   stops the sequence. Quota replacement shares the cap and exhausts a finite
   candidate list without overlapping writers.
   Clean verdicts with unresolved disputed IDs fail with APR*FINDINGS_UNRESOLVED.
   Role-count-changing fallback policy fails before mutation; seal-time exclusions
   consume no try, including each reachable-counterpart eligibility case.
   A replacement reviewer reusing an inherited open or resolved ID for a new
   finding receives APR_FINDING_ID_CONFLICT without ledger/grant advancement;
   duplicate IDs within a submission and invalid lineage targets also fail.
   Registry fixtures compare the published code-formatted `finding_id` grammar
   byte-for-byte with `^[A-Za-z]A-Za-z0-9.*-]{0,63}$`, compile it as ECMAScript
without flags, and enforce whole-input matching. Accept `A`, `XPR-001`,
`a.b_c-9`and a 64-character ID consisting of`A`plus 63 digits. Reject
the empty string, a leading digit, a 65-character ID, non-ASCII characters
and an otherwise valid ID followed by a newline. Replacement handoffs expose
the complete already-used-ID context array, including resolved history,
with matching count/digest/revision and no allocation-pool interpretation.
Exact replay remains idempotent. Exhausted revision retries enter
intervention-required with receipts, lease and fences retained, without
advancing stages or resetting the retry counter. Partial-byte recovery
requires quiescence and checkpoint resolution before a replacement's fresh
critique; a replacement uses the remaining stage budget, never a reset cap.
With`max_revision_attempts_per_round=3`, exhaust round N, reconcile and
   authorize replacement, then require a fresh critique in round N+1. If that
   round needs revision, its allowance is three attempts including the initial
   attempt; a fourth is denied. Round N remains exhausted through replacement,
   resume and extend-cap, and extend-cap alone does not authorize replacement.
3. Mutating old collateral never changes sealed evidence or supplied next-turn
   context; its divergence produces the documented diagnostic. Reconstruct every
   round from final bytes and patches, including CRLF, no trailing newline,
   empty patches and dirty/new baselines; corrupt patches or receipts fail.
   SAR -> XPR and replacement attempts produce collision-free paths and one
   ordered patch chain. Frontmatter initialization is authorized, reversible and
   included in round 1's digest; sidecar mode does not edit the FUR.
   Sidecar fixtures cover non-Markdown and opted-out Markdown FURs in a fresh
   clone and a linked worktree with no pre-existing authority/cache: transferred
   index/records link to the original series, including a verified intervening
   delta. Missing bindings with discoverable history, conflicting series/tips,
   corrupt anchors and escaping paths fail without a silent new chain. Neither
   lookup nor cache reconstruction mutates the FUR or imports old role authority.
   Cross-mode fixtures perform start and preview with lineage_mode omitted against
   a pointerless Markdown FUR with prior sidecar lineage, in a checkout without
   local authority/cache. The default frontmatter start reuses the existing series
   and predecessor; preview is read-only, and only the authorized initialization
   merge writes that existing pointer. No new series is silently allocated and
   historical manifests remain unchanged. Also test explicit frontmatter mode,
   the reverse frontmatter-to-sidecar follow-up without FUR mutation, and
   ambiguous cross-mode candidates returning APR_LINEAGE_UNRESOLVED.
   No-response evidence exists only at attempts/T/attempt-evidence.json, with
   round.json references for admitted attempts and null-round owner references
   for pre-admission attempts; no response filename is generated.
4. Two-party reviewer FUR writes, headless authority writes, cross-role
   submission-partition writes and path-alias/parent-directory escapes are
   denied. Own-role staging, shared collateral and permitted web research
   succeed. Submitting another role's or shared-area path fails with
   APR_SUBMISSION_SCOPE_INVALID before sealing. Overwriting shared collateral
   cannot alter role-attributed staged or sealed payloads. A capability mismatch
   fails preflight rather than weakening enforcement.
   Every critique/revision, resume and replacement handoff supplies exact
   absolute role-partition and shared-collateral paths, including solo paths
   for SAR. A scope rejection leaves the round, phase, revision and grant
   unchanged and names `submit_review_turn` plus the permitted partition;
   a corrected submission succeeds without an additional round or dispatch.
5. Two simultaneous starts in one worktree acquire one broker; separate linked
   worktrees get distinct endpoints. Wrong tokens, instances, browser indicators
   and rebinding-style Host mismatches fail, as do oversized/slow HTTP requests.
   Cleanup refuses active/recoverable/fenced runs and stale PID reuse. Concurrent
   advisory-index publication is atomic; unreadable credentials stay unreconciled
   and neither credentials nor their digests appear in output.
6. Disconnect, quiet reasoning, process death, broker restart and second-launch
   failure produce the status/liveness/fencing tuples specified above. Injected
   monotonic time tests warning, reconciliation, stale-observer and hard-timeout
   thresholds at their exact configured values, including clock-epoch recovery.
   A single-wakeup fixture host refreshes elapsed time and renews waits without
   inference across multiple operations/stages. Fault-free SAR, SPR and XPR
   each produce exactly one post-receipt terminal wakeup; periodic host re-entry
   fails that gate. A model-reentry-required fixture with W=60000 and D=150000
   discloses two expected re-entries before launch and observes two plus terminal
   delivery; unknown-duration starts disclose cadence and a null predicted count.
   An unknown-wait-capability fixture with a verified visible surface and
   `unattended=false` is admitted. Preview and receipt disclose
   `host_wait_capability=unknown`, `ceiling_kind=unknown`,
   `observed_wait_ceiling_ms=null` and `outside_inference_reattach=null` with
   reason `not-observable`, and `expected_reentry_count=null` with reason
   `unknown-capability`. No single-wakeup claim or fabricated cadence is
   rendered. Removing the verified surface invokes the separate monitor
   admission rejection; unknown wait behavior cannot authorize unattended work.
   Monitor fixtures validate unavailable controller usage, per-entry provenance
   and the absence of fabricated zero/model labels against the registry.
   Missing surfaces with unattended=false reject before reservation with
   mutation_occurred=false and no run/lease. An explicitly authorized corrected
   request uses a fresh ID and unattended=true; its retries create exactly one
   run. No automatic consent occurs. Post-reservation surface loss retains
   authority and reports `dispatch_admission.held=true` with
   `reason_code=awaiting-visible-observer` and
   `required_action=reattach-visible-observer`. In the observer-only active-run
   fixture, status remains running and fencing inactive while admitted work
   finishes and seals; no new critique/revision dispatch is admitted. A
   verified visible reattachment clears the hold and its reason/action without
   clearing unrelated gates. Transport-only reconnection or status polling
   cannot clear it. A sealed unattended run does not acquire this observer hold.
7. An installed pure-JavaScript package passes OS-specific credential storage,
   role-write denial, child-containment and durable host-restart termination
   evidence tests. Untested combinations cannot
   advertise those topologies. No required native build or download is hidden
   in the production dependency tree.
8. Legacy active work stays recoverable under its pinned installation; terminal
   imports preserve original claims. Same-worktree old/new runtime routing refuses
   uncertain artifact overlap and missing/mismatched installations. New starts
   reject v1 or mixed config with migration guidance and prospective cap sources.
   Manual XPR is not retired before the installed cross-family replacement gate
   passes. All three journey, config and monitor fixtures validate against the same
   registry used by offline CLI help and MCP schemas; all three journeys require
   installed conformance before the final replacement release claims completion.
9. Headless SAR workers, authors, and reviewers submit through broker-owned
   role tools without commits. Wrong-role, stale-digest and stale-revision
   submissions fail; replay does not advance twice. A controller grant cannot
   submit a participant turn. Exact-session worker resume succeeds; a same-model
   different session fails. Expired or wrong-round grants fail, with assurance
   labels preserved. Unrecoverable workers wait for fallback, explicit
   replacement, or cancel without silent identity substitution.
   A worker identity equal to the controller's fences with
   APR_CONTROLLER_WORKER_SESSION_COLLISION before any participant grant;
   an SPR with one session for both workers fences with
   APR_WORKER_SESSION_COLLISION. Equal model labels with distinct proved
   sessions succeed. Unproved separation fences with
   APR_SESSION_DISTINCTNESS_UNPROVED. CLI-only missing controller telemetry
   remains admissible when fresh-session creation independently proves separation.
   Private stdio role tools attach credentials only inside the wrapper; provider
   prompts, environment and readable files contain none. Direct unauthenticated
   broker calls and stale/rebound pipe capabilities fail with bounded diagnostics.
10. Successful, failed, timed-out, interrupted and no-response provider attempts
    produce provenance-tagged metrics receipts. Fixtures cover provider totals,
    per-model/auxiliary counters, cache and reasoning tokens, inconsistent
    counters, cumulative-versus-delta reports, unknown usage, retries and
    fallback. Round/stage/run aggregates reconcile to their included attempts
    without treating missing values as zero or allocating subscription spend.
    A failed critique consumes its own round; revision retries retain theirs;
    pre-admission attempts and continuous unallocated usage are counted once at
    their declared stage/run owner, with incomplete per-round coverage explicit.
    Controller receipts remain outside the participant roster, deduplicate host
    events, and exclude unrelated chat usage. Complete worker usage with missing
    controller usage must produce an incomplete combined run total; terminal
    controller reporting is incorporated only by the late-amendment contract.
    CLI-only fixtures declare controller telemetry not-observable before launch
    and retain null/not-exposed/host-transport measurements; caller model labels
    cannot become observed controller identity. Verified host bindings carry
    source/version and assurance independently of telemetry availability.
    The monitor fixture's reported worker values and derived subtotal validate
    from their observation IDs while complete combined usage remains null.
11. Byte-offset envelope extraction reproduces submitted response bytes despite
    delimiter-like participant text. Tampered annotations cannot alter sealed
    receipts. Late telemetry creates an amendment without changing terminal
    files or verdict; replay and crash recovery count observations once.
12. Accounting fixtures cover parent/auxiliary overlap, session resets, missing
    cumulative baselines, partially known totals, unallocated session usage,
    concurrent durations, currencies, subscription equivalents and billing
    corrections. Privacy fixtures reject tool arguments, query URLs and secrets;
    missing telemetry stays distinct from failed evidence persistence.
    Chain fixtures pin predecessor manifests, metrics and amendment revisions,
    reject cycles/repeated inputs, and count each run once across follow-ups.
    Embedded views seal without self-referential digests; post-seal derived
    views verify every external input against its pinned digest.
    Legacy telemetry gaps preserve incomplete coverage; solo-to-author reuse
    preserves role history without duplicating the agent's observations.
    Transfer an index and sealed runs while omitting a referenced amendments/
    tree: current coverage becomes incomplete/unverifiable, never
    superseded-as-current, and the original verdict stays unchanged. Replaying
    amendment publication after a crash between bundle and index publication
    produces one ordered reference and counts each correction once.
13. Recovery fixtures cover every action and replay: unresolved acknowledgment
    marks failed without releasing fences/leases; only verified reconciliation
    clears obligations. Checkpoint resolution requires quiescence and produces
    a patch, never acceptance. Pre-start series repair preserves pointer bytes
    and refuses stale digests, live owners and fabricated target evidence.
    A simulated verified boot-epoch change on the same execution host discharges
    covered local process obligations as terminated-by-host-restart. Resolve
    remaining filesystem checkpoints, then release the lease without changing
    the failed verdict. Broker-only restart, sleep/resume, a different host,
    unknown epochs and surviving remote writers cannot use that proof.
    Crash/replay during discharge never clears an unproved obligation.
14. Preflight and preview use only documented session-free checks, never start a
    broker/provider or mutate credentials. Missing review capabilities reject;
    missing telemetry remains admissible with explicit unavailable coverage.
    Lineage/FUR/protection and host monitor/telemetry observations are read-only
    and lock-free; neither preview nor pre-reservation start consults or writes
    the derived authority series cache. Reservation revalidates mutable inputs.
15. Config precedence and whole-profile/array replacement have golden fixtures.
    Cap/limit and retry bounds, threshold ordering, omitted model/effort defaults
    and unsupported explicit selections are validated before reservation.
    Request fallback_kinds arrays and profile fallback_kinds_by_class maps
    generate exact source/JSON Pointers, including escaped profile names and
    invalid element indexes. SAR admits only ["sar"]. The removed
    monitoring.on_missing_surface key fails closed-schema validation; no
    configuration value can authorize unattended operation.

Fault-injection fixtures cover each persisted transition and replay path;
installed provider tests establish feasibility independently of mocked tests.

## Resolved Decisions

- Every review has one visible non-participant controller and only headless
  worker participants.
- SAR uses one worker for critique and revision; SPR/XPR use distinct author
  and reviewer workers.
- Acceptance requires a fresh clean pass and explicit resolution of all open findings.
- Caps are SAR 6, SPR 10, XPR 12 and are configurable/overridable.
- A non-accepting exhausted cap stops the full sequence for intervention.
- Monitoring is out of band and includes controller/author/reviewer lines.
- Worker runs survive origin disconnect and preserve exact-session identity.
- Dirty/new FURs need no per-round commit.
- Normalized evidence is trackable by ordinary project workflow; raw logs are ephemeral.
- Every provider attempt contributes provenance-tagged token, duration, tool
  and cost evidence, including attempts that never produce a response.
- metrics.json and the manifest expose coverage-aware round, agent, stage, run,
  and review-chain aggregates without converting unavailable values to zero.
- Evaluation is multidimensional across quality, cost, and time.
- Two-party reviewers can write their own submission partition and shared
  collateral and research the web, but cannot write FUR or another role's staging.
- Package authority is outside the collaborative review folder.
- Classification is explicit and validated.
- Named role-specific provider cascades live in user/project config.
- Fallback is a new stage-attempt with the same budget and preauthorized class.
- Only user-requested stages run.
- Prior evidence visibility is configurable; independent first pass is default.
- Compatible SAR worker-to-author continuity is default; reviewers start fresh.
- Broker is on-demand, project-local, JavaScript, loopback, and ephemeral-port.
- Cleanup covers every linked worktree in the Git project.
- MCP is primary; CLI is always the final fallback.
- Starts use one versioned JSON request with request_id and filepath.
- Start validates before atomic reservation; launch is journaled and reconciled.
- Follow-ups automatically link through FUR frontmatter or trackable sidecar
  bindings and verified digest continuity when the pointer/index and referenced
  evidence are present in the checkout; ignored lookup caches are not required.

## Deferred Low-Level Choices

Implementation planning may settle whether an audited pure-JavaScript helper
is warranted over Node built-ins, finding taxonomy, host-specific progress
implementation, and provider-specific native-counter mappings. Timing defaults,
storage paths, named configuration fields and response dimensions above are
contracts, not deferred choices. #30/#34/#102 plan reconciliation must precede
schema freeze; proposed changes to those contracts return to specification
review rather than becoming undocumented implementation choices.
