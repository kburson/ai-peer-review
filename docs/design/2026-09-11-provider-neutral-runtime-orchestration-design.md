# Provider-Neutral Runtime Orchestration Design

<!-- cspell:words preauthorized wakeups -->

## Document status

- **Date:** 2026-09-11
- **Status:** Draft for human review
- **Scope:** Design only; no runtime implementation or backlog issues are
  authorized by this document
- **Related evidence:**
  [manual cross-provider case study](../manual-cross-provider-peer-review.md),
  [runtime orchestration white paper](2026-09-11-provider-neutral-runtime-orchestration-white-paper.md),
  and
  [original extraction design](2026-09-07-ai-peer-review-extraction-design.md)

## Summary

Extend `ai-peer-review` with three explicit, start-time runtime modes:

1. `headless`: the package launches and owns a provider CLI agent;
2. `session`: the package addresses an existing agent session through an
   official session API; and
3. `handoff`: independently owned agents exchange sealed results through the
   review workspace and are activated by a configured wake chain.

All modes use the current event-authorized review protocol. Runtime ownership
and wake delivery become separate configuration axes. A review-scoped Node.js
coordinator observes durable deliveries, drives only documented provider
surfaces, and shuts down deterministically. Existing MCP live-wait behavior is
retained as an optional wake adapter.

The design adds Gemini CLI headless and ACP support through a conformance-gated
adapter. It does not automate the Gemini desktop UI. Desktop session support
remains unavailable until Google exposes a documented inbound session-control
surface that meets the adapter contract.

## Goals

- Let a user choose a runtime protocol explicitly when a review begins.
- Explain the three modes, their requirements, and their recovery behavior in
  offline CLI help that an agent can query.
- Run headless reviews without human interaction when provider authentication,
  reviewer permissions, and review policy permit it.
- Allow session and handoff reviews to run without a person while retaining the
  option for human participation.
- Remove timer-driven model wakeups from normal orchestration.
- Preserve exact provider-session continuity without publishing raw handles in
  tracked collateral.
- Provide an automatic, preauthorized wake fallback chain that never changes
  participant identity or runtime ownership silently.
- Leave one exact recovery action when automatic activation fails.
- Guarantee that a coordinator and its owned child processes are shut down at
  the end of a review or on unrecoverable failure.
- Add provider support through capability-tested adapters, beginning with the
  current Codex, Claude, and Grok surfaces and adding Gemini CLI.
- Preserve all protocol invariants, reviewer non-mutation checks, sealed
  responses, and event-derived recovery behavior.

## Non-goals

- Automating provider desktop interfaces with keyboard, mouse, accessibility,
  screen scraping, or undocumented URL schemes.
- Creating a universal provider transcript format.
- Treating provider telemetry, process status, or session files as protocol
  authority.
- Silently approving tool access or bypassing provider security controls.
- Running a detached, machine-wide peer-review daemon.
- Replacing provider authentication or storing provider secrets.
- Automatically changing from an existing reviewer to a fresh reviewer when a
  wake attempt fails.
- Moving the review workspace to a database or remote service.
- Removing manual recovery or the existing MCP wait.
- Creating backlog issues or implementing the design before human ratification
  and peer review of this specification.

## Definitions

### Runtime mode

The ownership model for the agent session that performs review turns.

### Wake adapter

A mechanism that announces an already-sealed delivery to the exact registered
recipient session. A wake adapter does not create protocol state or decide turn
ownership.

### Runtime driver

A component that starts or addresses a provider session, sends a bounded turn,
observes provider events, and returns normalized output.

### Provider adapter

A versioned implementation of provider-specific launch, session, identity,
permission, output, and cancellation behavior.

### Coordinator

A foreground or host-owned Node.js process scoped to one review. It observes the
workspace, executes the configured runtime/wake policy, owns any child processes
it launches, and exits at the end of the review.

### Human participation

An allowed but mode-independent interaction. A person may inspect state, answer
an authorized provider permission request, manually run a recovery command, or
make a protocol Human Authority decision. Runtime selection does not imply that
a person is or is not present.

## Required invariants

1. The append-only event ledger remains the sole review-state authority.
2. Runtime configuration is sealed in the review-created event and cannot
   change after startup.
3. A fallback may change wake mechanism only. It may not change the registered
   participant, provider session, or runtime mode.
4. Every programmatic activation targets an exact opaque session handle. No
   automatic path may select “latest” or use a title when an exact ID exists.
5. Provider handles and process metadata remain under ignored review scratch.
6. Wake notifications contain a review ID, recipient, and event cursor—not
   response content or secrets.
7. The recipient revalidates event authority and sealed content after every
   activation.
8. Delivery retries are idempotent and never create a second protocol turn.
9. Exactly one valid coordinator lease may exist for one review.
10. The coordinator removes only its own matching lease and terminates only its
    own exact child instances.
11. Terminal review state and unrecoverable coordinator state trigger shutdown.
12. An activation failure leaves the sealed turn recoverable and emits one exact
    next action.
13. The reviewer non-mutation boundary applies equally in all runtime modes.
14. Session/API capability must be documented and probed; UI automation is not a
    fallback.

## Architecture

```text
CLI / package API
       |
       +-- protocol core ------------------------------+
       |   event validation, reducer, seals, recovery  |
       |                                               |
       +-- orchestration service                       |
           runtime selection, capability plan          |
                    |                                  |
             review coordinator                        |
          /             |             \                |
 runtime driver     wake policy     recovery reporter  |
       |                |                    |          |
 provider adapter  wake adapters       CLI/help        |
       |                |                               |
 headless/ACP/API   session API -> CLI resume ->        |
                    MCP wait -> user recovery           |
                        |                               |
                        +---- durable workspace --------+
```

### Protocol core

The current event store, reducer, path validation, response seals, role checks,
claims, delivery receipts, and recovery projections remain provider-neutral.
The core gains orchestration metadata validation but never launches a process.

### Orchestration service

The service resolves the sealed runtime descriptor, obtains a fresh capability
observation, selects the next preauthorized activation method, and starts the
coordinator. It returns a stable result before any long-running work begins.

### Runtime driver interface

```js
RuntimeDriver = {
  mode: 'headless' | 'session' | 'handoff',
  async preflight(context): CapabilityObservation,
  async activate(turn, signal): ActivationResult,
  async cancel(reason): CancellationResult,
  async close(): CloseResult,
}
```

`activate` receives only normalized protocol context and scratch references. It
does not receive authority to append events directly. It returns a result for
the orchestration service to validate and seal.

### Provider adapter interface

```js
ProviderAdapter = {
  provider: 'codex' | 'claude' | 'grok' | 'gemini',
  version: '<adapter-semver>',
  async inspect(runtime): CapabilityObservation,
  buildLaunch(turn): { executable, args, cwd, env },
  parseEvent(record): ProviderEvent,
  extractIdentity(events): ProviderIdentity,
  async connect(handle, signal): SessionConnection,
  async cancel(target): CancellationResult,
  recovery(target): RecoveryInstruction,
}
```

Methods not supported by a provider are absent and reflected in capability
observation. `buildLaunch` returns an argument vector; it never returns a shell
command string. The child process is launched without a shell.

### Wake adapter interface

```js
WakeAdapter = {
  name: 'session-api' | 'cli-resume' | 'mcp-live-wait' | 'user-recovery',
  async inspect(recipient): WakeObservation,
  async deliver(invitation, signal): DeliveryAttempt,
  async close(): CloseResult,
}
```

A `delivered` result means the target surface acknowledged the invitation. It
does not mean the agent read or accepted the review result. The subsequent
protocol event supplies that evidence.

### Recovery reporter

Every failure path produces a stable `APR_*` code, structured details safe for
display, the next permitted adapter, and one exact recovery command. The
reporter writes no event unless the protocol service authorizes the transition.

## Configuration and protocol versioning

### New configuration schema

New configuration uses `ai-peer-review.config/v2`:

```yaml
schema: ai-peer-review.config/v2
review:
  runtime:
    mode: handoff
    reviewer_provider: gemini
    session_handle: null
  wake:
    primary: session-api
    fallbacks:
      - cli-resume
      - mcp-live-wait
      - user-recovery
    attempts_per_adapter: 1
    activation_timeout_ms: 30000
  coordinator:
    owner_loss_grace_ms: 5000
    provider_shutdown_grace_ms: 10000
    heartbeat_interval_ms: 5000
    lease_stale_after_ms: 20000
```

Project configuration may set defaults, but the CLI resolves and displays the
complete runtime descriptor before `start`. The normalized descriptor is sealed
into startup authority:

```yaml
schema: ai-peer-review.orchestration/v2
runtime_mode: handoff
reviewer_provider: gemini
session_handle_digest: null
wake_chain:
  - session-api
  - cli-resume
  - mcp-live-wait
  - user-recovery
policy_digest: sha256:...
adapter_requirements:
  protocol: '>=1'
  exact_resume: true
  read_only: true
```

The raw session handle is stored separately as
`ai-peer-review.session-handle/v2` in ignored scratch. The startup event stores
only its digest and provider/session fingerprint binding.

### Backward compatibility

The package continues to read `config/v1`, `protocol/v1`, and existing reviews.
It projects existing transport modes as follows:

| Existing value                       | Compatibility projection                             |
| ------------------------------------ | ---------------------------------------------------- |
| `manual`                             | `handoff` with `user-recovery`                       |
| `resume-only`                        | `handoff` with `cli-resume`, then `user-recovery`    |
| `automatic-required` + `live-wait`   | `handoff` with `mcp-live-wait`, then `user-recovery` |
| `automatic-required` + `native-push` | `handoff` with `session-api`, then `user-recovery`   |

Compatibility projection is read-time only. It does not rewrite event logs or
claim that old reviews selected the new semantics. New reviews write v2. The CLI
prints a deprecation notice for v1 configuration with an exact `config migrate
--check` command. Migration never edits an active review.

## CLI experience

### Start commands

```text
peer-review start <artifact> --runtime headless --reviewer claude
peer-review start <artifact> --runtime session \
  --reviewer codex --reviewer-session <opaque-reference>
peer-review start <artifact> --runtime handoff \
  --reviewer gemini --wake cli-resume,mcp-live-wait,user-recovery
```

`--runtime` is required for interactive and agent-driven starts unless project
configuration declares exactly one default. Startup output always states:

- who owns the reviewer process/session;
- whether an existing session is required;
- whether unattended progress is possible;
- required provider capabilities and authentication;
- reviewer permission boundary;
- exact wake chain and fallback limit;
- whether the coordinator will launch;
- where private handles and diagnostics are stored; and
- the exact stop/recovery commands.

### Help and explain

```text
peer-review help runtimes
peer-review help runtime headless
peer-review help runtime session
peer-review help runtime handoff
peer-review explain runtime:handoff
peer-review explain APR_WAKE_FAILED
peer-review explain APR_COORDINATOR_STALE
```

Help topics are offline, available in prose and `--json`, and golden-tested.
Each runtime topic documents ownership, session prerequisites, human interaction,
permission behavior, wake/fallback, evidence, failure states, security boundary,
examples, and recovery.

### Coordinator commands

```text
peer-review coordinator start <workspace>
peer-review coordinator status <workspace> [--json]
peer-review coordinator stop <workspace>
peer-review coordinator recover <workspace>
peer-review coordinator run <workspace> # foreground host integration
```

Normal `start` launches `coordinator run` as an owned foreground/host child when
automation is required. `coordinator start` is explicit and refuses to detach.
`stop` validates review, instance UUID, and lease before signalling. It does not
accept a PID argument.

`status --next` remains the universal recovery entry point.

## Runtime behavior

### Headless runtime

1. Preflight validates provider executable, version, authentication state,
   canonical repository root, structured output, exact resume, and read-only
   permission policy.
2. Coordinator acquires the review lease.
3. Driver writes the complete prompt to a protected scratch file when the
   provider supports prompt files; otherwise it supplies the prompt through
   stdin or an argument without using a shell.
4. Coordinator launches one child process with bounded stdout/stderr capture and
   an abort controller.
5. Adapter parses events, records the exact session handle privately, and emits
   non-authoritative progress.
6. On success, the protocol service validates the output contract and seals the
   response bytes.
7. On a recoverable interruption, the next turn uses the exact session ID.
8. On provider or permission failure, the review enters intervention-required;
   it does not relaunch a fresh reviewer automatically.

The child inherits only an allowlisted environment plus provider-required
credential references. Secrets are redacted from diagnostics. Output limits
prevent an unbounded provider stream from exhausting memory or disk.

### Session runtime

1. User or host supplies an opaque exact-session reference.
2. Adapter establishes a documented API connection and proves the session is
   addressable and idle.
3. The session identity is normalized and compared with the registered reviewer
   fingerprint.
4. Driver sends a bounded prompt naming the review, cursor, and governed result
   paths.
5. Adapter streams turn lifecycle and handles permission requests according to
   the sealed policy.
6. Output is returned to the protocol service for validation and sealing.
7. Loss of API connection may use an authorized exact-resume fallback only when
   it addresses the same provider session.

Concurrent external interaction is allowed between turns. If a person starts a
turn while the coordinator is activating the session, the adapter returns
`APR_SESSION_BUSY`; it never steers or interrupts the person's turn unless that
behavior was explicitly selected and the host provides exact active-turn
identity.

### Handoff runtime

1. Current participant submits and seals its result.
2. Protocol service appends `delivery-written` and creates the matching receipt.
3. Coordinator's filesystem notification triggers a full authority re-read.
4. Wake policy tries each preauthorized adapter once, in order.
5. Acknowledged delivery records a diagnostic attempt; protocol state advances
   only when the recipient claims/consumes the delivery.
6. Duplicate filesystem events or wake acknowledgments are deduplicated by
   review ID, delivery ID, sequence, recipient fingerprint, and adapter attempt.
7. If the chain exhausts, coordinator writes the recovery note, marks
   intervention-required through the protocol service, shuts down, and exits.

The filesystem watcher implements read-before-subscribe and post-subscribe
re-read. Every notification is a hint. The event ledger and receipt bytes are
revalidated even if the watcher supplies a filename.

## Wake and fallback policy

The supported ordered adapters are:

1. `session-api`: inject through an official host/provider session API;
2. `cli-resume`: invoke the provider's exact resume form with a bounded prompt;
3. `mcp-live-wait`: satisfy the current pending `wait_for_handoff` call; and
4. `user-recovery`: print and persist the exact manual continuation command.

Rules:

- `user-recovery` is always the final logical path, even if omitted from config.
- Automatic adapters must be explicitly listed or implied by the selected
  runtime's documented default and confirmed in startup output.
- Each adapter has a bounded attempt count and timeout.
- Transient retry uses capped exponential backoff within the same adapter and
  does not wake the model between attempts.
- Permanent capability, identity, integrity, or permission errors skip retry.
- No adapter can target a session whose handle digest/fingerprint differs from
  startup authority.
- Successful API/CLI invocation without subsequent protocol consumption before
  the activation deadline becomes `APR_WAKE_UNCONFIRMED`, not success.
- Fallback attempts are append-only scratch diagnostics. A final
  intervention-required transition is authoritative.

## Coordinator lifecycle and no-orphan guarantee

### Lease

The coordinator acquires an exclusive file lock under the review workspace and
atomically writes:

```yaml
schema: ai-peer-review.coordinator-lease/v1
review_id: <id>
instance_id: <random UUID>
owner:
  kind: cli | app-host
  pid: <diagnostic PID>
  nonce: <random nonce>
process:
  pid: <diagnostic PID>
  started_at: <RFC-3339>
  executable_digest: <digest>
heartbeat:
  sequence: <integer>
  observed_at: <RFC-3339>
runtime_mode: <mode>
policy_digest: <sha256>
state: starting | active | stopping
```

The process also holds the open lock/IPC resource. File contents alone never
prove liveness. Heartbeat replacement uses atomic rename and a monotonic
sequence.

### Shutdown triggers

- protocol terminal state;
- final delivery/fallback exhaustion;
- explicit identity-matched stop;
- owner IPC loss after its grace period;
- lock/lease replacement or workspace identity change;
- filesystem watcher error;
- provider protocol/parser integrity error;
- incompatible protocol or adapter version;
- `SIGINT`, `SIGTERM`, and POSIX `SIGHUP`; or
- internal uncaught/fatal error after diagnostic preservation.

### Shutdown sequence

1. Atomically set local state to `stopping`; reject new work.
2. Abort filesystem watcher, timers, session requests, and pending backoff.
3. Ask the exact provider turn/session to cancel when supported.
4. Ask the owned child to terminate gracefully and wait the configured bound.
5. Escalate only against the still-matching child object/instance. Platform
   adapters implement Windows and POSIX behavior separately.
6. Await child `close` so stdio is drained.
7. Write final scratch status with reason, last authoritative cursor, active
   delivery, child result, and recovery command.
8. Release the lock and remove the lease only when `instance_id` and nonce match.
9. Exit with zero for normal terminal review, a stable nonzero coordinator code
   for recovery-required outcomes.

Shutdown is idempotent. A second trigger joins the in-progress shutdown promise.
No signal handler calls `process.exit()` before cleanup completes; a hard upper
bound remains to prevent shutdown from hanging forever.

### Crash recovery

`start`, `status`, `doctor`, and `coordinator recover` inspect stale leases.
Recovery:

1. validates workspace containment and physical directory identity;
2. checks lock/IPC absence and lease age;
3. treats PID existence as diagnostic only;
4. reconciles sealed deliveries and provider session scratch;
5. refuses to kill an ambiguous process;
6. archives the stale diagnostic under the review scratch directory;
7. removes a lease only after proving no matching live instance owns it; and
8. emits the exact safe next action.

## Provider requirements

### Codex

- Headless: `codex exec` with JSONL and exact `codex exec resume <id>`.
- Session: Codex App Server `thread/resume` and `turn/start`, or the Codex SDK
  resume/run contract.
- Handoff: exact CLI resume, current MCP wait, or host-injected App Server wake.
- Use configured read-only sandbox and approval policy for reviewer turns.

### Claude

- Headless: `claude -p` with JSON/stream JSON, exact `--resume <id>`, bounded
  turns, read-only tools, and unattended permission behavior.
- Session: supported Agent SDK/host connection only; do not assume an arbitrary
  desktop window can be injected.
- Handoff: exact CLI resume or MCP live wait.
- Never use `--continue` for automatic routing.

### Grok

- Headless: `grok -p` with JSON/streaming JSON and exact `--resume <id>`.
- Session: ACP/agent stdio only after versioned conformance testing.
- Handoff: exact resume or MCP live wait.
- Never use `--continue` for automatic routing.
- Map the exact resume syntax by tested adapter version; do not preserve a
  static command form after current provider help or documentation changes.

### Gemini

- Installation check distinguishes Gemini desktop from Gemini CLI.
- Headless: use `gemini -p` with JSONL, parse `init`, `message`, `tool_use`,
  `tool_result`, `error`, and `result`, and normalize documented exit codes.
- Session: prefer Gemini CLI ACP (`initialize`, `authenticate`, `newSession` or
  `loadSession`, `prompt`, `cancel`).
- Resume: invoke from the canonical project root with the full UUID.
- Authentication: use existing cached auth or user-configured API key/Vertex
  environment; never copy desktop cookies or tokens.
- Trust: fail preflight on an untrusted repository. Do not automatically apply
  `--skip-trust` unless the user has explicitly configured that exact canonical
  repository for automated trust.
- Read-only: require a tested installed-version policy/sandbox profile. A prompt
  instruction alone is insufficient for unattended reviewer conformance.
- Desktop: report `interactive-only` until a documented inbound session API
  supports exact session addressing, prompt delivery, lifecycle observation,
  cancellation, and permission handling.

## Permission requests

Provider events normalize to:

```yaml
schema: ai-peer-review.permission-request/v1
provider: <provider>
session_fingerprint: <digest>
turn_id: <provider turn reference>
capability: filesystem-write | shell | network | external-system | secret | other
target: <redacted normalized target>
provider_request_digest: <digest>
```

The coordinator may answer only when sealed startup policy contains an exact
matching allow or deny rule. An unmatched request records
`APR_PERMISSION_INTERVENTION_REQUIRED`, preserves the provider session, writes
the recovery action, and stops automatic progress. Headless mode does not wait
indefinitely for a person who may be absent.

Reviewers default to deny filesystem write, external mutation, secret access,
and unbounded shell. A provider without enforceable read-only capability fails
the corresponding unattended preflight.

## State and diagnostics

New scratch records are versioned and canonical JSON despite YAML examples in
this design:

```text
.scratch/peer-review/<review-id>/
├── coordinator/
│   ├── lease.json
│   ├── final-status.json
│   └── stale/<instance-id>.json
├── sessions/
│   └── <participant>.json
├── activation/
│   └── <delivery-id>-<attempt>.json
└── providers/
    └── <provider>/<turn-id>.jsonl
```

Provider streams are size-limited, redacted, ignored, and diagnostic. The
sealed tracked response and protocol event digest remain authoritative. A user
can opt out of raw provider diagnostics without weakening the review.

## Stable errors

| Code                                   | Meaning                                              | Default recovery                                               |
| -------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| `APR_RUNTIME_REQUIRED`                 | Runtime was not selected                             | Re-run `start --runtime <mode>`                                |
| `APR_RUNTIME_UNAVAILABLE`              | Required provider capability failed preflight        | Run `doctor --runtime <mode> --provider <name>`                |
| `APR_SESSION_HANDLE_INVALID`           | Exact handle is missing, mismatched, or stale        | Re-register through explicit participant recovery              |
| `APR_SESSION_BUSY`                     | Another turn owns the session                        | Wait for or explicitly resolve the active turn                 |
| `APR_WAKE_FAILED`                      | Authorized wake chain exhausted                      | Run `status <workspace> --next`                                |
| `APR_WAKE_UNCONFIRMED`                 | Invocation succeeded but delivery was not consumed   | Inspect exact session, then run the printed resume command     |
| `APR_COORDINATOR_ACTIVE`               | A valid instance already owns the review             | Run `coordinator status <workspace>`                           |
| `APR_COORDINATOR_STALE`                | Lease exists without proven owner liveness           | Run `coordinator recover <workspace>`                          |
| `APR_COORDINATOR_OWNER_LOST`           | Host/CLI ownership channel ended                     | Run `status <workspace> --next`                                |
| `APR_COORDINATOR_SHUTDOWN_FAILED`      | Exact child did not close cleanly                    | Inspect final status; do not kill by recorded PID alone        |
| `APR_PERMISSION_INTERVENTION_REQUIRED` | Provider requested unmatched authority               | Inspect request and resume only with explicit policy/authority |
| `APR_PROVIDER_PROTOCOL_INVALID`        | Structured provider output violated adapter contract | Preserve diagnostic and run provider doctor                    |
| `APR_GEMINI_DESKTOP_UNSUPPORTED`       | Desktop app has no supported inbound API             | Install/configure Gemini CLI or use human handoff              |

Each `explain` topic contains safe structured details and exactly one primary
recovery command.

## Testing strategy

### Unit tests

- configuration v1 projection and v2 validation;
- runtime/wake separation and forbidden fallback transitions;
- provider event parsers with captured, redacted fixtures;
- exact-session identity binding;
- adapter timeout/retry classification;
- coordinator lease acquisition, heartbeat, and identity match;
- idempotent shutdown under every trigger pair;
- stale lease reconciliation and PID-reuse simulation;
- permission normalization and policy decisions;
- help JSON/prose schemas and all stable errors.

### Integration tests

- `fs.watch` race: delivery before subscribe, between initial read and
  subscribe, after subscribe, duplicate event, dropped filename, directory
  replacement, and watcher error;
- headless child success, malformed JSONL, partial stdout, stderr flood,
  timeout, cancellation, authentication failure, and child ignoring graceful
  termination;
- session API disconnect, busy turn, permission request, wrong handle, and exact
  resume fallback;
- handoff session API -> CLI resume -> MCP -> user recovery chain;
- terminal review and failure paths leave no coordinator or owned child alive;
- stale lease recovery never signals an unrelated reused PID;
- POSIX and Windows shutdown behavior;
- spaces and Unicode in repository paths without shell interpretation.

### Provider conformance tests

Tests run against supported installed-version ranges behind explicit environment
gates. Each adapter must prove:

- launch/connect and identity extraction;
- exact resume;
- structured completion and error parsing;
- cancellation;
- reviewer read-only enforcement;
- permission-request behavior;
- no secret leakage in diagnostics; and
- upgrade failure is fail-closed.

Gemini conformance additionally tests desktop-only detection, CLI auth state,
project-root session scoping, full UUID resume, ACP load/prompt/cancel, folder
trust, documented exit codes, and policy behavior in non-interactive mode.

### Packaging and smoke tests

- zero-install and installed CLI behavior;
- Node 22 minimum runtime;
- MCP remains optional and setup remains valid;
- coordinator exits when parent process/IPC closes;
- package uninstall during no active review leaves no daemon;
- all example/help commands parse;
- release package contains no test credentials, provider transcripts, or local
  session handles.

## Observability

`coordinator status --json` returns:

- authoritative review state and cursor;
- runtime mode and wake chain;
- coordinator instance state and lease age;
- current adapter/attempt and deadline;
- provider child/API state at the adapter's stated evidence strength;
- last delivery acknowledgment and consumption evidence;
- shutdown status; and
- exact next action.

It must label inference. “Process exists” is not “agent is reasoning,” and “API
acknowledged” is not “delivery consumed.” Provider token, time, and cost data are
optional diagnostics and never used to decide agreement.

## Delivery backlog

The following issue-ready stories are ordered by dependency. Issue IDs are not
assigned in this design.

### Story 1: Runtime schema and compatibility projection

Add config/protocol orchestration v2, runtime/wake separation, immutable startup
descriptor, raw-handle digest binding, and v1 read-time projection. Include
migration `--check` and golden help updates.

**Acceptance:** existing v1 reviews remain readable/resumable; new reviews seal
one mode and ordered wake chain; runtime ownership cannot change through
fallback or recovery.

### Story 2: Coordinator lifecycle foundation

Build the review-scoped foreground coordinator, exclusive lease, heartbeat,
owner connection, status, stop, and recover commands without provider launch.

**Acceptance:** exactly one instance owns a review; every terminal/error/signal
path is idempotently shut down; stale PID data can never kill an unrelated
process; POSIX and Windows lifecycle tests pass.

### Story 3: Durable delivery source and wake policy engine

Extract/reuse the current race-safe filesystem delivery source. Add ordered,
bounded adapter attempts, consumption confirmation, scratch diagnostics, and
stable recovery errors.

**Acceptance:** no timer wakes the model; missed/duplicate watcher events do not
lose or duplicate a turn; exhausted fallback leaves a sealed delivery and one
exact manual action.

### Story 4: Cooperative handoff runtime

Deliver `handoff` using exact CLI resume, existing MCP live wait, and user
recovery. Add start/help/doctor behavior and end-to-end two-session fixtures.

**Acceptance:** a complete review can advance unattended where exact resume is
available, or recover manually without changing the reviewer; the coordinator
exits at terminal agreement.

### Story 5: Generic headless driver

Implement safe child process ownership, non-shell arguments, environment
allowlist, bounded output, event normalization, cancellation, exact session
scratch, and permission intervention.

**Acceptance:** provider fixture adapters complete/recover multi-turn reviews;
all abnormal child exits drain and close; no launched child survives
coordinator shutdown.

### Story 6: Codex, Claude, and Grok headless adapters

Implement and conformance-test documented CLI launch, structured output, exact
resume, identity, read-only policy, and recovery for the three current provider
identities.

**Acceptance:** each provider passes the shared conformance suite for a declared
version range; an unsupported version fails before a review turn is launched.

### Story 7: Session-managed runtime and Codex App Server adapter

Implement the session driver, exact-handle registration, busy-turn behavior,
stream observation, permission callbacks, disconnect recovery, and the first
official Codex App Server adapter.

**Acceptance:** an existing Codex thread in another host window can receive and
complete a review turn without UI automation; wrong/busy sessions fail closed;
fallback targets only the same session.

### Story 8: Gemini CLI safety and conformance spike

Pin a candidate supported Gemini CLI version range and empirically validate
headless JSONL, full UUID resume, ACP load/prompt/cancel, read-only reviewer
policy, folder trust, authentication, permission behavior, cancellation, and
shutdown on macOS and Windows.

**Acceptance:** produce a committed evidence report with pass/fail results and a
go/no-go decision for each runtime. Desktop app remains explicitly separate.

### Story 9: Gemini CLI headless and ACP adapters

Implement only the modes approved by Story 8, including desktop-only diagnostics
and precise installation/help guidance.

**Acceptance:** Gemini passes the shared provider suite; desktop-only systems get
`APR_GEMINI_DESKTOP_UNSUPPORTED` with a valid handoff/CLI recovery path; no UI or
private app-state automation exists.

### Story 10: Migration, documentation, and release hardening

Update setup, full help, security model, architecture docs, examples, package
smoke tests, and deprecation messaging. Validate the complete fallback and
no-orphan matrix on supported platforms.

**Acceptance:** all old examples are either valid or carry exact migration
guidance; MCP continues to work as an optional adapter; release verification
proves no coordinator remains after all terminal scenarios.

## Acceptance criteria for the complete capability

- User can start any new review with exactly one of `headless`, `session`, or
  `handoff`, and CLI help explains the consequences before mutation.
- Headless review can complete author/reviewer turns without human input when
  provider policy permits and stops cleanly on an unmatched permission request.
- Session review can address an exact existing supported session through an
  official API without UI automation.
- Handoff review can use a Node filesystem coordinator with no model polling and
  preserve the MCP wait as an optional fallback.
- Every automatic fallback is visible, bounded, preauthorized, and identity
  preserving.
- Every failed activation leaves the ledger and sealed response valid and
  provides one exact recovery command.
- Review completion, abandonment, unrecoverable transport failure, owner loss,
  signal, watcher failure, and protocol failure all stop the coordinator and its
  exact owned children.
- Stale coordinator recovery does not kill by PID alone.
- Codex, Claude, Grok, and approved Gemini CLI modes pass a common provider
  conformance suite.
- Gemini desktop is reported accurately as interactive-only unless a future
  documented control surface passes the same session adapter contract.
- Existing v1 reviews and MCP live-wait installations remain usable.

## Decisions captured for peer review

- The three runtime modes are explicit and immutable at review start.
- Runtime ownership and wake mechanism are separate concepts.
- The external Node.js coordinator is the default handoff orchestrator.
- MCP live wait is retained as an optional adapter, not removed.
- Fallback is automatic only inside a start-time authorized chain and may not
  switch reviewer or ownership mode.
- Manual exact-session recovery is always available.
- The coordinator is review-scoped and non-detached with deterministic,
  identity-matched cleanup.
- Gemini delivery targets CLI headless and ACP; the desktop app is not automated
  without a documented API.
- This design is ready for human review, then independent peer review. It does
  not authorize implementation.
