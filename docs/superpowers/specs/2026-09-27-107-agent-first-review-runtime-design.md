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
out-of-band monitor. Waiting consumes no controller model tokens. The model
wakes only for an attached participant turn, intervention, or terminal result.
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
only by beginning a new, explicitly recorded replacement stage.

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
             reviewer=claude/claude-opus-5/medium]

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

The client generates request_id before the first call. The runtime stores the
canonical request digest:

- exact replay through MCP or CLI returns the existing run;
- reuse with different bytes returns APR_REQUEST_ID_CONFLICT; and
- a lost MCP response can be retried through CLI without duplicate launch.

start_review performs complete validation, capability resolution, and launch
atomically. preview_review is optional and read-only.

## Stage and Participant Resolution

A stage contains kind, optional max-round override, participant placement and
selection, optional profile, prior-stage visibility, declared fallback
alternatives, and any explicit conditional rule.

Attached roles inherit the current-session identity. An explicit headless
provider/model becomes primary and configured role fallbacks are appended after
deduplication. An unspecified headless role uses the first eligible candidate
from the selected/default profile.

The runtime displays and seals the complete sequence, roster, fallback chain,
caps, permissions, visibility, and supervision mode before launch.

## Round Contract and Caps

One round has the same structure in all classes:

1. Reviewer evaluates the exact current FUR digest.
2. If no actionable findings remain, the stage accepts.
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
Any stage reaching its cap stops the entire sequence with
intervention-required. Later stages do not start. A final-round revision cannot
claim acceptance without a subsequent clean review pass.

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

The reviewer may create or edit any file inside the active review folder,
including earlier in-progress collateral, but cannot edit the FUR.
Package-owned protocol authority therefore lives outside the collaborative
folder.

Only the registered author may change the FUR during an author turn.
Unexpected changes create conflict rather than being absorbed. The supervisor,
not a participant, generates patches from exact snapshots.

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

After completion, normal project workflow may create one commit containing the
final FUR and evidence. Peer-review does not commit. Later squashing preserves
the sequence because authority lives in the digest-bound bundle.

Tracked evidence includes normalized events, metrics, responses, patches, and
manifest. Raw provider streams, credentials, cookies, private handles,
environment dumps, and verbose logs remain ignored. Raw logs are deleted after
clean finalization. Relevant diagnostics are retained temporarily after crash,
ambiguity, or intervention. A debug option may preserve them deliberately.

## Review Series and Follow-Ups

Before the first snapshot, the FUR receives a stable pointer:

    ---
    ai_peer_review:
      series_id: apr-series-7c...
      record: docs/superpowers/peer-reviews/example/
    ---

Complete history stays in the review folder. A new review validates the pointer,
previous terminal record, prior final digest, current digest, and intervening
delta, then links automatically. The user may explicitly start a new lineage
when a file is repurposed.

## Metrics and Comparative Evaluation

Normalized records represent runs, stages, participants, rounds, findings,
costs, and outcomes. They preserve pattern and sequence, stage order, evidence
visibility, provider/model/effort, placement, continuity, artifact properties,
finding category/severity/disposition, regression, duration, token provenance,
fallback, quota, retry, disconnect, intervention, optional human quality, and
linked downstream outcomes.

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
the incomplete stage, records the event, launches the next candidate, and
requires a fresh review of current FUR. Classification may change only when the
resolved cascade preauthorized it. The replacement cannot claim predecessor
acceptance.

An unavailable stage may use only an explicitly declared ordered alternative.
Undeclared downgrade or silent skip is forbidden. Future hosts such as
Antigravity/Gemini become eligible only after proving launch, identity, output,
cancellation, reconciliation, and recovery.

## Permissions and Research

Headless role capabilities are sealed at startup. Authors may edit FUR and
review folder; reviewers may edit review folder but not FUR. Both may read
repository context and run approved validation.

Public web search, documentation lookup, and read-only APIs are allowed without
per-query intervention. External writes, uploads, issue creation, remote
mutation, package installation, downloaded executable use, destructive
commands, and broader filesystem writes require explicit authority. Material
sources are cited; credentials, cookies, and raw browser logs are excluded.

## Portable Project-Local Broker

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

The broker starts on first managed run, remains while work is active or
recoverable, and exits after a configurable idle grace. Participant wrappers
monitor its lease and terminate only the exact provider child they launched
after permanent broker loss.

Project cleanup is:

    peer-review broker cleanup --project <any-project-worktree> --dry-run
    peer-review broker cleanup --project <any-project-worktree> --apply

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

## Out-of-Band Monitor and Usage

start_review returns a receipt, then the controller calls wait_for_review once.
The call blocks outside model inference while MCP progress or an equivalent
host surface updates the user. The model wakes only for attached work,
intervention, or terminal state.

    XPR · stage 2/2 · round 2/12 · elapsed 04:12

    Controller  GPT-6 Sol / medium     supervising · 0 wait tokens
    Author      GPT-6 Astra / high     revising · 00:38 · event 3s ago
    Reviewer    Claude Opus 5 / high   waiting  · response sealed

    Usage       controller 3.1k · author 21.4k · reviewer 16.8k reported

Overlapping controller/author roles combine into one line. The monitor shows
total and phase duration, stage/round/cap, liveness, last provider event,
protocol progress, and usage provenance.

It returns an immediate receipt, updates elapsed time locally, checks liveness
about every 15 seconds, warns after about 60 seconds without provider events,
and reconciles/report known state after about 120 seconds without killing a
legitimate long reasoning turn. A configurable hard timeout intervenes.

Progress is not accumulated into model context. Terminal output is bounded and
links to evidence. Usage is reported, estimated, or unavailable. Hidden
reasoning and provider-internal usage are never represented as zero. Broker,
CLI, and MCP compute consume no model tokens.

## Agent-First MCP and CLI

Preferred MCP tools are:

    start_review(request)
    preview_review(request)
    wait_for_review(run_id, after_cursor)
    get_review_status(run_id)
    intervene_review(run_id, action)
    get_peer_review_help(topic)

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
      "ok": false,
      "error": {
        "code": "APR_REQUEST_INVALID",
        "message": "Review request is malformed.",
        "mutation_occurred": false,
        "retry_safe": true,
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
covers commands, request schema, classes, sequences, fallbacks, permissions,
monitoring, evidence, broker, errors, and all six user journeys.

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

This assessment reflects the live backlog on 2026-09-27.

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

The principal collision is #107 versus #30/#34. Implementation planning should
first rewrite #107 around the six topologies, structured API, portable broker,
and monitoring, then declare schema contracts with #30 and telemetry contracts
with #34. This avoids two evidence layouts and two analytics vocabularies.

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

## Resolved Decisions

- Headless SAR uses one participant for critique and revision.
- Acceptance requires a fresh no-findings pass.
- Caps are SAR 6, SPR 10, XPR 12 and are configurable/overridable.
- Any cap stops the full sequence for intervention.
- Monitoring is out of band and includes controller/author/reviewer lines.
- Headless runs survive origin disconnect; attached roles wait for exact return.
- Dirty/new FURs need no per-round commit.
- Normalized evidence is tracked; raw runtime logs are ephemeral.
- Evaluation is multidimensional across quality, cost, and time.
- Reviewers can write the review folder and research the public web, not FUR.
- Package authority is outside the collaborative review folder.
- Classification is explicit and validated.
- Named role-specific provider cascades live in user/project config.
- Fallback is a new participant stage and may change class when preauthorized.
- Only user-requested stages run.
- Prior evidence visibility is configurable; independent first pass is default.
- Compatible SAR worker-to-author continuity is default; reviewers start fresh.
- Broker is on-demand, project-local, JavaScript, loopback, and ephemeral-port.
- Cleanup covers every linked worktree in the Git project.
- MCP is primary; CLI is always the final fallback.
- Starts use one versioned JSON request with request_id and filepath.
- Start validates and launches atomically; preview is optional.
- Follow-ups automatically link through FUR frontmatter and digest continuity.

## Deferred Low-Level Choices

Implementation planning may settle exact idle/hard-timeout defaults, whether a
pure-JavaScript helper is warranted over Node built-ins, field names beneath
the canonical top level, finding taxonomy, host-specific progress fallback,
and retention duration for failure-only diagnostics.
