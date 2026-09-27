# Agent-First Review API and Portable Runtime Design

## Document Status

- **Date:** 2026-09-27
- **Issue:** #107
- **Status:** Design captured from the operator-approved brainstorming session; implementation and backlog decomposition remain subject to refinement and plan approval
- **Scope:** Local and headless SAR, orchestrated SPR/XPR, agent-first API, portable supervision, durable evidence, and review analytics
- **Related work:** #39 project-local broker, #88 provider authority and recovery, #90 Claude launch identity, #102 install/version policy, and #106 manual XPR startup

## Summary

AI Peer Review will expose one agent-first structured API capable of running a
single requested SAR, SPR, or XPR stage or an explicit ordered sequence. The
user selects the pattern and sequence in natural language. The host agent
translates that intent into one versioned JSON request. The runtime validates
the complete request before mutation, resolves provider capabilities and
configured fallbacks, then runs through either an inline path or a portable
project-local broker.

SAR, SPR, and XPR describe review participants. They do not describe process
placement, controller ownership, or transport. Attached versus headless
placement and inline versus managed supervision are separate axes. The
originating controller is not counted as a review participant unless it also
acts as the SAR worker or author.

The project-local broker is an on-demand background Node.js service written
entirely in portable JavaScript. It uses loopback TCP with an operating-system
assigned ephemeral port. The package ships no native addon, custom executable,
post-install compilation, node-gyp requirement, per-platform artifact, or
runtime binary download. MCP is the preferred host adapter. The CLI is the last
fallback and accepts the identical request and response schemas.

The originating chat receives an immediate receipt and a continuously updated
out-of-band monitor on a validated host surface. Runtime waiting consumes no
controller model tokens; host-imposed model wakeups are accounted separately.
On capable hosts, the model wakes only for an attached participant turn,
intervention, or terminal result.
Eligible headless work survives originating-chat disconnects.

Each round binds reviewer findings, the author response, and a
supervisor-generated patch to exact before/after artifact digests. The current
File Under Review (FUR) remains the only working copy. Normalized evidence
supports later analysis of model, provider, pattern, pattern sequence, quality,
duration, and token efficiency without preserving raw provider exhaust in Git.

## Goals

- Support local SAR from a request such as “run an SAR on this spec.”
- Support a headless SAR by a selected model without leaving the host chat.
- Support an attached author plus a headless reviewer for SPR and XPR.
- Support two headless participants with a controller-only originating chat.
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
- Counting the controller as a reviewer merely because it supervises.
- Using MCP as protocol authority or lifetime owner of a headless run.
- Running a machine-wide broker daemon.
- Resisting malicious software already running as the same OS user.
- Tracking credentials, private handles, or raw provider transcripts.
- Automatically committing the FUR or evidence bundle.
- Ranking models from acceptance alone without outcome evidence.

## Independent Axes

### Review Class

- **SAR:** One participant performs both critique and revision. It may be the
  attached current agent or one headless agent.
- **SPR:** Author and reviewer are distinct sessions in one provider family.
- **XPR:** Author and reviewer are distinct sessions in different provider
  families.

The class is explicit user intent and is validated against the resolved roster.
A mismatch fails with a correction. A preauthorized fallback may change class
only by beginning a new, explicitly recorded replacement stage-attempt under
the original requested-stage budget. SAR cannot automatically become a two-party
class or vice versa; only SPR/XPR class changes retain the same role topology.

### Controller Role

- **Participant-controller:** The originating chat is also the SAR worker or
  attached author.
- **Controller-only:** The originating chat launches, monitors, and intervenes
  but performs no review or revision.

The protocol calls this role controller. “Orchestrator” remains acceptable
user language but does not create a third review participant.

### Placement and Supervision

- **Attached:** The role is performed by the current host chat.
- **Headless:** The broker owns a provider CLI process/session for the role.
- **Inline:** A local attached SAR uses the protocol/evidence core directly.
- **Managed:** The project broker owns lifecycle, routing, fallback, and
  recovery for one or more headless roles.

## Required User Journeys

1. **Local SAR:** The current agent repeatedly critiques and revises the FUR
   inline. No provider process or broker is launched.
2. **Headless SAR:** One spawned participant owns critique and revision. The
   originating chat is controller-only.
3. **SPR with headless reviewer:** The attached current agent is author and
   controller; a distinct same-provider headless session is reviewer.
4. **SPR with two headless agents:** The controller launches distinct headless
   author and reviewer sessions under one provider family.
5. **XPR with headless reviewer:** The attached current agent is author and
   controller; the reviewer belongs to a different provider family.
6. **XPR with two headless agents:** The controller launches headless author
   and reviewer sessions from different provider families.

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
validated JSON with recursively sorted object keys, preserved array order and
string values, and insignificant JSON whitespace removed. Duplicate JSON keys
are invalid. MCP objects and CLI JSON must produce the same canonical bytes.
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

## Stage and Participant Resolution

A stage contains kind, optional max-round override, participant placement and
selection, optional profile, prior-stage visibility, declared fallback
alternatives, and any explicit conditional rule.

Attached roles inherit the current-session identity. An explicit headless
provider/model becomes primary and configured role fallbacks are appended after
deduplication. An unspecified headless role uses the first eligible candidate
from the selected/default profile.

The runtime displays and seals the complete intended sequence, selections,
fallback chain, caps, permissions, visibility, and supervision mode before
launch. Actual session fingerprints are observed and bound after launch, before
participant work is admitted. A mismatch fences the operation. Attached
identity is verified before reservation; two-party roles cannot share a session.

The v1 nested contract uses stages[].max_rounds (positive safe integer),
stages[].participants, profile, prior_evidence, and fallback_kinds. SAR has only
participants.solo; SPR/XPR have author and reviewer. Each selection has placement
(attached or headless); headless selections may specify selector, model and
effort, resolved together through the selected profile. Attached identity is
runtime-derived, never supplied as a fingerprint by the caller. An omitted
participant map means attached solo for SAR, or attached author and headless
reviewer for SPR/XPR. Only solo or author may be attached; an attached reviewer
or two attached roles are invalid for these six topologies. prior_evidence is independent
or shared; fallback_kinds is an explicit allowed class set, defaulting to the
requested class unless a profile explicitly authorizes a different allowed set.
Candidate membership alone cannot expand that set.

Resolve the initial roster to the requested class. If none is eligible, return
the class/capability conflict before mutation. Cross-class fallback permission
applies only to replacement after the requested stage starts. Profile fallback
authorization supplies allowed classes when omitted from the request; the
default remains the requested class. A request override is explicit intent
and is sealed. Changes that alter role count need a new user-requested stage.

Headless SAR followed by a two-headless XPR uses, for example:

    {
      "schema": "ai-peer-review.start-request/v1",
      "request_id": "apr-request-example",
      "filepath": "spec.md",
      "stages": [
        {
          "kind": "sar",
          "max_rounds": 6,
          "participants": {
            "solo": { "placement": "headless", "selector": "codex",
              "model": "gpt-6-astra", "effort": "high" }
          }
        },
        {
          "kind": "xpr",
          "participants": {
            "author": { "placement": "headless", "selector": "codex",
              "model": "gpt-6-astra", "effort": "high" },
            "reviewer": { "placement": "headless", "selector": "claude",
              "model": "claude-opus-5", "effort": "high" }
          }
        }
      ]
    }

These model names express user intent, not verified provider availability.
The registry distinguishes selector (for example claude), host (claude-code),
and provider family (anthropic). Config candidate host keys are selector aliases
in v2 and normalize through this registry. Model/effort mismatches fail with
supported choices rather than silently substituting. Conditional stage rules
and explicit ordered alternative rosters require a registered schema extension;
v1 rejects them until that extension defines validation and transitions.

## Round Contract and Caps

One round has the same structure in all classes:

1. Reviewer evaluates the exact current FUR digest.
2. If no actionable findings remain, seal the clean reviewer response against
   that digest, revalidate unchanged FUR bytes, then accept the stage.
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

Run states are starting, running, awaiting-attached-participant, reconciling,
intervention-required, accepted, cancelled and failed. Each requested stage has
an ID; replacements have new stage-attempt IDs under it. Acceptance requires
all requested stages accepted and all findings resolved, including reviewer
agreement with disputed dispositions. Cancellation is never acceptance.

## Findings and Debate

Every finding has a stable lifetime ID and records stage, originating round,
category, severity, reviewed digest, reviewer rationale and evidence, author
disposition and rationale, reviewer resolution, and split/duplicate/supersede
lineage.

Narrative remains free-form inside the structured response. A disputed finding
may produce an empty patch. The next review must accept the rationale, refine
the finding, or maintain the objection. The cap bounds disagreement.

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

## FUR and Worktree Boundary

The FUR remains in the originating physical worktree and outside the review
folder. Tracked-dirty and newly created text FURs are allowed. Startup captures
the initial bytes and acquires an artifact-scoped write lease.

    FUR
      author:   read/write
      reviewer: read-only

    review folder
      author:     read/write/create
      reviewer:   read/write/create
      supervisor: read/write/create

    repository context
      author/reviewer: read
      other writes: separately governed

The two-party reviewer may create or edit any file inside the active review folder,
including earlier in-progress collateral, but cannot edit the FUR.
Package-owned protocol authority therefore lives outside the collaborative
folder.

Only the registered author may change the FUR during an author turn.
Unexpected changes create conflict rather than being absorbed. The supervisor,
not a participant, generates patches from exact snapshots.

The lease coordinates AIPR writers; it does not stop editors or unrelated
processes. Recheck exact bytes at each review/revision seal and acceptance.
Resolve physical paths, reject symlinks and hard-linked FURs, directory aliases
and review-folder overlap, and revalidate containment at write boundaries.
Do not alter unrelated staged or working files. Local SAR uses the same
deterministic core for snapshots and patches, with agent compliance rather than
an independently enforced separation between its two roles.

A SAR worker is one author-capable session throughout. Its critique evaluates
an immutable input snapshot and is instructed not to edit until its findings
are sealed. The core detects premature FUR edits and enters conflict; it does
not claim a sandbox role switch between critique and revision. Headless SAR
must still enforce its combined scope (FUR plus review folder, no authority
writes). Two-party reviewers require enforced FUR denial. Record these distinct
assurance claims so SAR is never presented as independent peer enforcement.

## Evidence

The working tree contains the latest FUR; no per-round commits are required.
The portable review record contains:

    review-record/
      manifest.json
      events.jsonl
      metrics.json
      rounds/
        01-review.md
        01-author-response.md
        01.patch
        02-review.md
        02-author-response.md
        02.patch

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

Tracked evidence includes normalized events, metrics, responses, patches, and
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
rewrite the participant. When no response exists, the round contains an
attempt-evidence file instead; it is never mislabeled as a reviewer or author
response.

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

Capture the user's exact initial bytes before adding metadata. A Markdown FUR
then receives a stable pointer through a format-aware frontmatter merge:

    ---
    ai_peer_review:
      series_id: apr-series-7c...
      record: docs/superpowers/peer-reviews/example/
    ---

Complete history stays in the review folder. A new review validates the pointer,
previous terminal record, prior final digest, current digest, and intervening
delta, then links automatically. The user may explicitly start a new lineage
when a file is repurposed.

Preserve unrelated frontmatter. Non-Markdown files use a package-owned sidecar
index instead of inserting YAML into code or data. The pointer addresses a
stable series index; each terminal run has a separate immutable record below
it. Malformed/conflicting pointers, ambiguous copied series IDs and missing
records require reconciliation rather than silently starting a new chain.
Never search outside the physical repository by trusting frontmatter paths.

## Metrics and Comparative Evaluation

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

Round metrics aggregate all attempts needed to obtain that reviewer or author
turn, including failed attempts that produced no response. Stage and run totals
then aggregate round metrics plus pre-round startup/fallback attempts. Avoid
double counting cumulative provider reports by recording counter semantics and
the exact attempts included in each aggregate. Reports can therefore compare
successful-review cost, failed-attempt overhead, retry burden, stage marginal
yield and total sequence cost.

### Accounting Identity and Aggregation

Allocate an attempt ID durably before each provider invocation. Record its
operation ID, requested stage, stage-attempt, round (nullable before dispatch),
role/phase, local participant ID and retry/fallback parent. Provider-internal
calls and auxiliary models are child accounting scopes, not additional review
rounds. Attached and continuous SAR sessions may span phases or rounds; preserve
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
Adapters must advertise telemetry capabilities and mapping versions separately
from review capabilities. Missing usage support does not block an otherwise
eligible provider, but is visible before launch and in every affected receipt.

Normalize telemetry through an allowlist of numeric counters, units, documented
enums, sanitized model labels and opaque local correlation IDs. Exclude prompt
text, reasoning text, tool arguments/results, query URLs, credentials and private
provider session handles. Keep category counts when available; expose redaction
and completeness flags without retaining sensitive values or hashes of secrets.
Capture failures preserve safe error codes and bounded sanitized explanations.
Diagnostic/debug retention is explicit, access-restricted and finite; it does
not override credential exclusion. Sealed normalized receipts, reconstruction
anchors and amendments are durable evidence, not disposable raw runtime logs.

Analysis distinguishes stage yield, marginal yield, residual defects, and
quality improvement per token, dollar, and minute. Results remain a
multidimensional scorecard. Analysis profiles may weight dimensions but never
replace the raw measures with one universal score. Controlled comparisons use
common baselines and counterbalanced order; ordinary production sequences are
analyzed conditionally.

## Configuration

Existing sources remain user installation config and project/worktree
.ai-peer-review.json. Request overrides project, which overrides user.
Configuration is closed, versioned, and credential-free.

Named profiles define separate solo, author, and reviewer cascades:

    {
      "schema": "ai-peer-review.config/v2",
      "review": {
        "round_caps": { "sar": 6, "spr": 10, "xpr": 12 }
      },
      "orchestration": {
        "default_profile": "deep-review",
        "profiles": {
          "deep-review": {
            "solo": [
              { "host": "claude", "model": "claude-opus-5", "effort": "high" },
              { "host": "codex", "model": "gpt-6-astra", "effort": "high" }
            ],
            "author": [
              { "host": "codex", "model": "gpt-6-astra", "effort": "high" }
            ],
            "reviewer": [
              { "host": "claude", "model": "claude-opus-5", "effort": "high" },
              { "host": "grok", "model": "grok-5", "effort": "high" },
              { "host": "codex", "model": "gpt-6-astra", "effort": "high" }
            ]
          }
        }
      }
    }

Project profiles replace/add closed named units; arrays are not unpredictably
interleaved. Configuration determines how to fulfill a requested stage, never
which stages to add.

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
changing class never resets or expands it. Candidates are tried once per role
per requested stage, in sealed order, without cycling. Exhaustion requires
intervention. Failed launches have a separate finite retry limit in sealed
runtime policy and cannot consume unbounded time or tokens.

Fence the outgoing participant and reconcile pending operations before
replacement. Require evidence that it can no longer write or submit. Preserve
partial author bytes as a recovery checkpoint, but do not treat them as a sealed
revision. Ambiguous edits require intervention; a new reviewer receives only a
reconciled checkpoint. Fallback never switches an attached participant silently.

An unavailable stage may use only an explicitly declared ordered alternative.
Undeclared downgrade or silent skip is forbidden. Future hosts such as
Antigravity/Gemini become eligible only after proving launch, identity, output,
cancellation, reconciliation, and recovery.

## Permissions and Research

Headless role capabilities are sealed at startup. Authors and SAR workers may
edit FUR and review folder; two-party reviewers may edit review folder but not FUR. Both may read
repository context and run approved validation.

Public web search, documentation lookup, and read-only APIs are allowed without
per-query intervention. External writes, uploads, issue creation, remote
mutation, package installation, downloaded executable use, destructive
commands, and broader filesystem writes require explicit authority. Material
sources are cited; credentials, cookies, and raw browser logs are excluded.

## Portable Project-Local Broker

Binary-free distribution applies to AIPR and its production dependency closure.
Already-installed Node and provider CLIs are external prerequisites; AIPR does
not build, bundle or download their executables. All six journeys are required
product goals, not claims of existing adapter support. Admission requires a
versioned capability matrix for the exact host/model/effort, participant role,
launch, identity, output, permissions, cancellation and recovery. Unsupported
combinations fail preflight with an actionable capability report. Installed
conformance tests, not selector presence or model-name examples, establish
support. Generalized headless authors and SAR workers are new adapter work.

The broker starts only for headless or durable cross-session work. Local
attached SAR remains inline.

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
monitor its lease and terminate only the exact provider child they launched
after permanent broker loss.

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

## Disconnect and Recovery

- Two-headless runs continue after originating-chat loss.
- Attached-author runs may finish the reviewer turn, then wait for exact author.
- Local SAR pauses when its sole attached participant disappears.
- No participant is silently replaced.
- Another chat reconnects by run ID using durable authority.
- Unknown side effects remain fenced until reconciliation.
- CLI never bypasses broker, protocol, identity, or integrity failures.

intervene_review accepts a closed action union: cancel, resume, replace-participant
or extend-cap. Each carries action_id, expected_revision and validated
action-specific parameters. Mutations require authenticated controller authority;
reconnecting by run ID alone grants neither authority nor an attached role.
An exact replay returns its receipt, a stale revision fails, and unknown provider
effects block resume/replacement. Cancel fences new work, reconciles and stops
owned processes, and reports cancelled only after that is confirmed. Extending
a cap or replacing an attached identity requires explicit user authorization
recorded in the event stream; automatic fallbacks use only the sealed policy.
No intervention may turn unresolved findings into normal acceptance.

## Out-of-Band Monitor and Usage

start_review returns a receipt, then the controller calls wait_for_review once.
The call blocks outside model inference while a capability-tested MCP progress
surface or an equivalent out-of-band surface updates the user. Host progress
rendering and wait-duration limits are validated separately from provider
capabilities. If MCP cannot render progress, the receipt links a local read-only
monitor or CLI watch surface. If no visible surface can be established, report
the limitation before launch and require an explicit unattended choice.
Transport timeouts detach observers, not cancel reviews; adapters reattach with
the durable cursor outside inference when possible. Host-forced model re-entry
is disclosed and measured rather than called zero-token waiting. On capable
hosts the model wakes only for attached work, intervention, or terminal state.

    XPR · stage 2/2 · round 2/12 · elapsed 04:12

    Controller  GPT-6 Sol / medium     supervising · 0 wait tokens
    Author      GPT-6 Astra / high     revising · 00:38 · event 3s ago
    Reviewer    Claude Opus 5 / high   waiting  · response sealed

    Usage       controller 3.1k · author 21.4k · reviewer 16.8k reported

Overlapping controller/author roles combine into one line. The monitor shows
one combined critique/revision line for a SAR worker. It shows
total and phase duration, stage/round/cap, liveness, last provider event,
protocol progress, and usage provenance.

It returns an immediate receipt, updates elapsed time locally, checks liveness
about every 15 seconds, warns after about 60 seconds without provider events,
and reconciles/reports known state after about 120 seconds without killing a
legitimate long reasoning turn. A configurable hard timeout intervenes.

These are target intervals measured by runtime timers, not model wakeups.
Distinguish broker heartbeat, provider-process health, provider output and
protocol progress. No output is a quiet/stalled indication, not proof of death.
Show the last successful observation and stale status when monitoring itself
disconnects. The read-only monitor cannot exercise controller actions.

Progress is not accumulated into model context. Terminal output is bounded and
links to evidence. Usage is reported, derived, estimated, or unavailable. Hidden
reasoning and provider-internal usage are never represented as zero. Broker,
CLI, and MCP compute consume no model tokens.

Request construction, attached-role work, interventions, returned tool text and
terminal summaries may consume controller tokens. Show these separately from
idle wait compute; controller usage is unavailable if the host cannot report it.
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

These signatures describe logical arguments. Each concrete tool takes one
versioned closed JSON object, identical to its CLI inline/--request input.
Status and wait requests carry run_id; wait also has after_cursor. Intervention
adds action_id, expected_revision and a discriminated action with parameters.
Help has topic and format (structured by default). Authentication travels in
the local transport binding, never model-visible JSON. Read capabilities expose
only their authorized run/status data; monitor access is scoped separately from
controller mutation authority and excludes private handles and credentials.
CLI status, wait, intervene, submit, help and cleanup use the same registry and envelopes.

submit_review_turn carries schema, run_id, stage_attempt_id, round, action_id,
expected_revision, phase (critique or revision), reviewed_digest and response
path/digest within the review folder. Critique responses contain verdict and
stable findings; revision responses contain dispositions and revised_digest.
The runtime reads/seals response bytes itself, checks the active phase, verifies
the participant's bound session and checks FUR bytes before advancing. It
generates patches rather than trusting participant-supplied patches. Exact
action replay returns the receipt; conflicting replay, wrong role/phase or stale
digest/revision fails without advancing. Controller-only credentials cannot
submit participant turns. Inline SAR invokes the same core through local tools;
headless wrappers use the same transition contract under their role binding.
Every handoff supplies an exact structured next_action naming this operation
and its schema. The worker never edits package authority directly.

All responses carry schema, ok, mutation_occurred, retry_safe and bounded
next_action. Run responses include run_id, status, revision, cursor, evidence
paths and the applicable capability/usage provenance. Error issues are bounded
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
        "examples": ["sar-attached"]
      }
    }

One machine-readable registry drives CLI help, MCP tool schemas/descriptions,
JSON Schemas, examples, error documentation, and golden tests. Offline help
validates every emitted example against its registered schema, including error
and participant-submission envelopes. The registry supplies schemas for response
bodies as well as tool inputs. Offline help
covers commands, request schema, classes, sequences, fallbacks, permissions,
monitoring, evidence, broker, errors, and all six user journeys.

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
invoking session must always be author, manual XPR is a human-relayed product
mode, and startup should be numerous CLI flags.

## Migration Principles

- Read terminal historical records without rewriting them.
- Do not reinterpret historical transport claims.
- Preserve old broker-owned review recovery under compatible runtime.
- Introduce request/config/evidence changes under explicit schema versions.
- Migrate public startup only with clear release compatibility notes.
- Remove native closure only after JavaScript broker proves lifecycle,
  authentication, concurrency, stale recovery, reconciliation, and installed
  cross-platform behavior.
- Keep #102 version policy independent.

Active legacy reviews remain pinned to their compatible installed runtime and
authority format until drained or explicitly exported at a reconciled terminal
boundary. The new package neither rewrites live journals nor ships the retired
native helper to resume them. Upgrade preflight reports these dependencies and
requires retaining the old installation when needed. Imported terminal records
retain original schema and assurance labels. The v1 config reader remains
available for legacy use; v2 migration is explicit and never maps max_turns to
max_rounds as if they counted the same events. Unknown schema versions fail
with version/help guidance, not permissive parsing.

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
  reviewer, and derives only SPR or XPR. It has no SAR, controller-only role,
  two-headless topology, or ordered review-stage sequence.
- The public CLI accepts a positional artifact plus many flags. It needs the
  canonical versioned JSON request, request-id idempotency, preview, and
  generated validation/help contract.
- MCP currently exposes only `wait_for_handoff`. The agent-first start, preview,
  status, wait, intervention, and help tool family is new.
- Protocol state is a two-participant alternating-turn machine with one global
  turn budget. It needs run/stage/round structure, SAR role co-location,
  explicit controller state, per-class caps, finding lineage, author
  dispositions, and sequence short-circuiting.
- Existing transport modes describe manual relay, resume-only, and automatic
  handoff. The target product instead separates placement from supervision and
  makes managed headless execution the normal broker-owned path.
- Configuration v1 has one `review.max_turns` and transport preferences. It
  needs v2 class caps, named role-specific cascades, fallback authorization,
  monitoring policy, and user/project merge behavior.
- Current broker authentication and private IPC require the native
  `broker-security` addon and `node-gyp`. The target uses portable loopback TCP,
  ephemeral ports, credentials, and pure JavaScript lifecycle controls.
- Existing collateral assumes committed triads and narrowly allocated response
  files. The target permits reviewer writes throughout the review folder,
  keeps one mutable FUR, and lets the supervisor generate digest-bound patches.
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
| #30                  | Plan               | High overlap                          | Own canonical artifact lifecycle, compact evidence, stable series/chain identity, package-generated patches, indexes, and migration. The runtime consumes these contracts rather than creating a second evidence system. |
| #31                  | Ready for Planning | Partial overlap                       | Own clone-shared projection and coordination. It may project review state and support project-wide cleanup discovery, but disposable SQLite must not become broker or run authority.                                     |
| #32                  | Ready for Planning | Partial overlap                       | Own bounded project knowledge retrieval. The runtime owns prior-stage visibility and records the exact context receipt supplied to each participant.                                                                     |
| #33                  | Ready for Planning | Downstream overlap                    | Own defect attribution, review escapes, and governed lessons. The runtime emits normalized finding and outcome linkage needed by that analysis.                                                                          |
| #34                  | Ready for Planning | High overlap                          | Own controlled provider-comparison experiments and comparative analysis. The runtime emits neutral run metrics; #34 owns experiment arms, controls, scoring methodology, and non-delivery comparison workflow.           |
| #102                 | Plan               | Independent prerequisite              | Own package pinning and cross-entry-point version compatibility. Keep it independent and enforce its policy in every new CLI, MCP, broker, and worker entry point.                                                       |
| #39-#51              | Done               | Reusable foundation plus one conflict | Preserve project identity, startup fencing, registry, workers, recovery, adapters, help, and packaging work. Replace the native broker-security closure and reinterpret transport around the new topology.               |
| #88, #90, #101, #106 | Done               | Reusable hardening                    | Preserve provider-authority, environment isolation, response freshness, launch diagnostics, and manual-startup lessons as regression requirements.                                                                       |
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

Planning must cover all six topologies; JSON input equivalence; detailed errors;
cross-transport idempotency; classification and fallback transitions; caps;
author responses and finding lineage; participant/session identity; reviewer
FUR denial with review-folder writes; dirty/new FUR snapshots and leases;
supervisor patch chains; automatic lineage; visibility; web research;
concurrent worktree brokers; ephemeral ports; authentication; restart;
reconnect; cleanup; binary-free production tarball; zero-turn monitoring;
usage provenance; evidence reconstruction; CLI fallback; and one-source help.

Concrete release gates include:

1. Equivalent CLI/MCP JSON returns one run despite whitespace/key order;
   different content with the same ID conflicts. Concurrent retries and a crash
   after each launch-journal write never cause an unobserved duplicate launch.
2. Clean review on the last permitted round accepts; a last-round revision
   stops the sequence. Quota replacement shares the cap and exhausts a finite
   candidate list without overlapping writers.
3. Mutating old collateral never changes sealed evidence. Reconstruct every
   round from final bytes and patches, including CRLF, no trailing newline,
   empty patches and dirty/new baselines; corrupt patches or receipts fail.
4. Two-party reviewer FUR writes, headless authority writes and path-alias escapes are denied while review
   folder writes and permitted web research succeed. A capability mismatch
   fails preflight rather than weakening enforcement.
5. Two simultaneous starts in one worktree acquire one broker; separate linked
   worktrees get distinct endpoints. Wrong tokens, instances and browser
   origins fail. Cleanup refuses active/recoverable runs and stale PID reuse.
6. Disconnect, quiet reasoning, process death, broker restart and second-launch
   failure produce distinct observable states. A capable monitor refreshes
   elapsed time without model inference and reports the 60/120-second stale
   observations. Unsupported host progress is disclosed before launch.
7. An installed pure-JavaScript package passes OS-specific credential storage,
   role-write denial and child-containment tests. Untested combinations cannot
   advertise those topologies. No required native build or download is hidden
   in the production dependency tree.
8. Legacy active work stays recoverable under its pinned installation; terminal
   imports preserve original claims. All six journey examples validate against
   the same registry used by offline CLI help and MCP schemas.
9. Attached SAR and attached-author handoffs can submit through MCP and CLI
   without commits. Wrong-role, stale-digest and stale-revision submissions fail;
   replay does not advance twice. Controller-only access cannot submit a verdict.
10. Successful, failed, timed-out, interrupted and no-response provider attempts
    produce provenance-tagged metrics receipts. Fixtures cover provider totals,
    per-model/auxiliary counters, cache and reasoning tokens, inconsistent
    counters, cumulative-versus-delta reports, unknown usage, retries and
    fallback. Round/stage/run aggregates reconcile to their included attempts
    without treating missing values as zero or allocating subscription spend.
11. Byte-offset envelope extraction reproduces submitted response bytes despite
    delimiter-like participant text. Tampered annotations cannot alter sealed
    receipts. Late telemetry creates an amendment without changing terminal
    files or verdict; replay and crash recovery count observations once.
12. Accounting fixtures cover parent/auxiliary overlap, session resets, missing
    cumulative baselines, partially known totals, unallocated session usage,
    concurrent durations, currencies, subscription equivalents and billing
    corrections. Privacy fixtures reject tool arguments, query URLs and secrets;
    missing telemetry stays distinct from failed evidence persistence.

Fault-injection fixtures cover each persisted transition and replay path;
installed provider tests establish feasibility independently of mocked tests.

## Resolved Decisions

- Headless SAR uses one participant for critique and revision.
- Acceptance requires a fresh no-findings pass.
- Caps are SAR 6, SPR 10, XPR 12 and are configurable/overridable.
- A non-accepting exhausted cap stops the full sequence for intervention.
- Monitoring is out of band and includes controller/author/reviewer lines.
- Headless runs survive origin disconnect; attached roles wait for exact return.
- Dirty/new FURs need no per-round commit.
- Normalized evidence is tracked; raw runtime logs are ephemeral.
- Every provider attempt contributes provenance-tagged token, duration, tool
  and cost evidence, including attempts that never produce a response.
- Evaluation is multidimensional across quality, cost, and time.
- Two-party reviewers can write the review folder and research the web, not FUR.
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
- Follow-ups automatically link through FUR frontmatter and digest continuity.

## Deferred Low-Level Choices

Implementation planning may settle exact idle/hard-timeout defaults, whether a
pure-JavaScript helper is warranted over Node built-ins, field names beneath
the documented nested contract, finding taxonomy, host-specific progress implementation,
retention duration for failure-only diagnostics, and provider-specific mappings
from native usage counters into the normalized metrics schema.
