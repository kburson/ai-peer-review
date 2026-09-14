# Project-Local SPR/XPR Broker Design

## Document status

- **Date:** 2026-09-14
- **Status:** Draft for human review
- **Scope:** Design reconciliation only; no implementation or backlog mutation is
  authorized by this document
- **Supersedes in part:**
  [provider-neutral runtime orchestration design](2026-09-11-provider-neutral-runtime-orchestration-design.md)
- **Supersedes/replaces as product design:**
  [durable co-review wakeups design](2026-09-13-9-durable-co-review-wakeups-design.md)

## Summary

`ai-peer-review` remains one npm package. Cross-provider orchestration uses a
project-local broker shipped inside that package, not a separate npm package and
not a machine-wide daemon. The broker exists only while one canonical project
root has active cross-provider review work or pending recovery state.

The agent-facing startup API is author/reviewer intent, not runtime mechanics:

```text
peer-review start <artifact> \
  --reviewer-provider <provider> \
  --reviewer-model <model> \
  [--reviewer-effort <effort>]
```

The invoking agent session is the author by default. The user is the requester,
sponsor, or operator, but not a protocol participant unless a later Human
Authority decision says so. Reviewer provider and model are required. Reviewer
effort defaults to `medium`.

Startup classifies the requested review:

- `SPR`: single-provider review. Author and reviewer are different sessions or
  models under the same provider family.
- `XPR`: cross-provider review. Author and reviewer use different providers.

SPR should prefer provider-native orchestration. XPR requires the project-local
broker because no single provider owns both sides.

## Decisions

1. `peer-review start <artifact>` remains the durable entrypoint.
2. `spr` and `xpr` may exist as help topics or aliases, but they are not the
   primary API and must not make `start` ambiguous.
3. The invoking runtime session is the default author.
4. Reviewer provider and reviewer model are required for agent-driven starts.
5. Reviewer effort defaults to `medium`.
6. Runtime mode remains an internal sealed descriptor, derived from provider
   capabilities, project config, and explicit flags when present.
7. A project-local broker is an included runtime helper in `ai-peer-review`.
8. The broker manages XPR startup and active-review routing for one canonical
   project root.
9. Issue #9 is superseded as a product design. Its wake ledger, capsule, and
   idempotent delivery mechanics may be reused only where they fit the
   project-local broker architecture. Its public coordinator-first CLI/API
   surface must be removed before publication, with no backward compatibility
   requirement.
10. A project-local broker is not a detached machine-wide service and is not
    useful outside `ai-peer-review`.

## Goals

- Let a user ask an active agent for peer review without teaching the user
  runtime vocabulary.
- Teach agents the complete CLI contract through offline help and examples.
- Keep same-provider review lightweight where one provider interface can spawn,
  resume, and monitor its own sessions.
- Require a broker only when review crosses provider boundaries or otherwise
  needs cross-provider coordination.
- Allow two different projects on one laptop to run independent XPR sessions
  without sharing package versions, IPC endpoints, review queues, or broker
  state.
- Preserve exact participant identity, sealed responses, reviewer non-mutation,
  event authority, durable wakeups, and fail-closed recovery.
- Remove documentation ambiguity left by earlier `--runtime`-first startup
  examples.

## Non-goals

- Creating a global broker package.
- Installing a global npm dependency, daemon, scheduler, or launch agent.
- Making one broker coordinate multiple project roots.
- Preserving the issue #9 public coordinator surface for backward
  compatibility.
- Treating MCP as a universal desktop-controller or session-injection system.
- Inferring author identity from the human requester.
- Falling back from XPR to SPR, or from one reviewer identity to another,
  without an explicit new review request.

## Role model

The initiating agent is the author. It owns artifact changes, author responses,
finalization, and any commits. The reviewer is selected by provider, model, and
effort from the user's request or project policy.

If runtime identity cannot identify the invoking agent, startup fails closed
unless a restricted declared-identity path is explicitly supported. Declared
identity cannot claim runtime, automatic wake, or provider-conformance
capabilities.

The reviewer selection contract is:

```text
reviewer_provider: required
reviewer_model: required
reviewer_effort: optional, default medium
```

Examples:

```bash
peer-review start docs/design/foo.md \
  --reviewer-provider claude \
  --reviewer-model opus \
  --reviewer-effort high

peer-review start docs/design/foo.md \
  --reviewer-provider codex \
  --reviewer-model gpt-5.6-sol
```

## SPR and XPR classification

Startup resolves author identity first, then reviewer identity. Classification
is derived from those resolved participants:

```text
same provider family      -> SPR
different provider family -> XPR
```

SPR can still use the same protocol ledger, response seals, reviewer
non-mutation checks, and review-of-record flow. Its runtime path may use a
provider-native API to create a second session or model turn under the same
provider. It does not require the project-local broker unless an implementation
chooses to reuse broker plumbing internally.

XPR must use the project-local broker. If the broker cannot start or connect,
startup returns `APR_BROKER_START_FAILED` or a more specific stable error and
does not create an ambiguous partially automated review.

## Project-local broker

The broker is included in the `ai-peer-review` package and launched from the
current project's installed package. It is addressed by canonical project
identity, not by a global port or package singleton.

The canonical broker identity includes:

- physical project root;
- Git common directory when present;
- current operating-system user;
- package version;
- broker protocol version; and
- Node runtime major version where compatibility requires it.

The derived IPC endpoint lives outside the repository so deletion of ignored
scratch files does not orphan a socket path, but it includes the project root
digest so Project A and Project B never collide:

```text
<user-cache>/ai-peer-review/brokers/<project-root-digest>/
  broker.sock
  broker.lock
  broker.json
```

The broker serves only its own canonical project root. A CLI invocation from
Project B must compute Project B's endpoint and must not connect to Project A's
broker.

## Broker lifecycle

`peer-review start` starts or connects to the project-local broker only when the
request needs XPR. The command is idempotent for the current project root:

1. compute canonical project identity;
2. probe the project-scoped broker endpoint;
3. connect if a live compatible broker owns that identity;
4. recover or refuse stale ownership according to lease evidence;
5. start a broker from the current package when none is live;
6. register the XPR startup request; and
7. return stable review status and next action.

The broker may manage more than one active XPR for the same project. Each review
still has its own review workspace, participant registry, coordinator lease,
provider handles, wake operations, and terminal state.

The broker shuts down after all reviews it owns are terminal and the idle grace
period expires. Terminal broker-visible states include consensus, abandon,
superseded, cancelled, failed-unrecoverable, and explicit recovery-required with
no live automatic work remaining.

## Relationship to the issue #9 implementation

Issue #9 delivered unpublished review-scoped durable wakeups: one coordinator
watches one review workspace, reserves idempotent wake operations, and invokes
validated wake adapters without consuming model turns while idle.

This design supersedes #9 as the product design. It keeps only the #9 mechanics
that still fit the project-local broker architecture and retires the public
coordinator-first shape. The broker becomes the user-facing orchestration
runtime for XPR. Wake decision, capsule, ledger, and adapter reconciliation
become internal broker machinery rather than a separate public command family:

```text
project-local broker
  routes XPR startup and active review management for one project
  owns per-review wake workers using the #9 idempotent wake mechanics
```

The event ledger remains review authority. Broker wake workers may still be
review-scoped internally, but they should not be exposed as the primary CLI,
help, README, or public API surface.

## Multi-project behavior

Two projects on one laptop run independently:

```text
Project A -> broker A -> review A1, review A2
Project B -> broker B -> review B1
```

Each broker runs from its project's local `ai-peer-review` package. Different
projects may therefore use different package versions. Cross-project
compatibility is not required because brokers do not coordinate across project
roots.

A later discovery command may list all live project brokers by scanning
user-cache identity files, but discovery is diagnostic. It is not a routing
authority and does not turn brokers into a machine-wide service.

## Provider resource leases

Broker isolation does not guarantee provider isolation. Two brokers may contend
for the same provider account, desktop application, CLI session, or external API
quota.

Provider adapters must report whether their surface supports concurrent
sessions. Headless CLI sessions with exact resume may support parallel runs.
Desktop-window or UI-session adapters are exclusive unless conformance tests
prove exact-session targeting under concurrency.

The package records provider leases in ignored runtime state and fails closed
when a requested reviewer surface is busy, ambiguous, or cannot prove the
selected session.

## Documentation reconciliation

The September 11 runtime orchestration design remains useful for provider
capabilities, runtime/wake separation, session-managed safety, and adapter
conformance. Its `--runtime`-first agent startup examples are superseded by this
design's author/reviewer startup contract.

The issue #9 durable wake design is historical implementation input only. Its
idempotent wake mechanics may be retained where useful, but its public
coordinator command model is superseded by project-local broker orchestration
and should not be preserved for compatibility.

The README should present:

- `peer-review start <artifact>` as the primary entrypoint;
- invoking agent equals author;
- reviewer provider/model/effort selection;
- SPR versus XPR classification;
- XPR starts or connects to the project-local broker; and
- broker commands as XPR orchestration/status operations.

## Open questions

- Should `spr` and `xpr` be command aliases, help topics only, or both?
- Which provider family names are canonical for classification?
- Should `--reviewer-effort medium` be printed in generated commands even though
  it is the default?
- What idle grace period should the broker use before shutdown?
- Which user-cache directory should be preferred on macOS, Linux, and Windows?

## Acceptance criteria

- Agent-facing help states that the invoking session is the author.
- Agent-facing help requires reviewer provider and model and defaults reviewer
  effort to `medium`.
- `peer-review start <artifact>` remains valid.
- Startup classifies SPR versus XPR from resolved participants.
- XPR starts or connects only to the current project's broker endpoint.
- Project A and Project B can run simultaneous brokers without endpoint
  collision or package-version negotiation.
- The broker exits after terminal active reviews and idle grace.
- Issue #9 mechanics are reused only as internal broker machinery where they
  still fit; public coordinator commands are removed before publication.
- Older runtime docs clearly point to this design for agent-facing startup and
  project-local broker semantics.
