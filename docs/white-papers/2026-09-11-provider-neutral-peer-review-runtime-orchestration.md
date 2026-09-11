# Provider-Neutral Runtime Orchestration for Governed AI Peer Review

<!-- cspell:words decorrelate headlessly preauthorized wakeups -->

## Abstract

AI agents can already perform substantive peer review across provider boundaries.
The difficult product problem is not generating criticism. It is preserving role
separation, routing the next turn to the correct session, recovering from partial
failure, and leaving evidence that a person can audit later.

This paper proposes three first-class runtime modes for `ai-peer-review`:
headless-managed, session-managed, and cooperative handoff. The modes share one
provider-neutral review protocol but differ in who owns the reviewer process and
how the reviewer is activated. A lightweight, review-scoped Node.js coordinator
observes durable filesystem events and invokes only documented provider control
surfaces. The existing MCP wait remains available as a compatibility adapter,
not the center of the architecture.

The result is a design that can run unattended when the selected provider and
permission policy permit it, can incorporate a person without requiring one,
and fails into an explicit recovery state instead of losing a review or leaving
an orphaned process.

## Executive summary

The recommended product direction is:

1. Keep the append-only review workspace as the authority for participants,
   turns, artifacts, deliveries, and decisions.
2. Ask the user to select and pin one runtime mode when the review starts.
3. Treat activation as a separate, ordered wake policy. A runtime may use a
   session API, targeted CLI resume, the existing MCP live wait, or a documented
   user recovery command.
4. Run a small coordinator only for the lifetime of one review. Bind it to an
   exclusive instance lease, its child processes, and its owning host. Shut it
   down deterministically at every terminal or unrecoverable boundary.
5. Support provider differences through capability-negotiated adapters rather
   than provider branches in the protocol.
6. Add Gemini through its documented CLI and Agent Client Protocol (ACP) first.
   The new Gemini desktop applications are credible interactive surfaces, but
   Google currently documents them as user-facing desktop assistants, not as
   inbound session-control APIs.[^1][^2]

The key distinction is simple:

> Runtime mode answers “who owns the reviewer session?” Wake policy answers
> “how is the next durable handoff delivered to it?”

Conflating those questions produces brittle configuration and unsafe fallback.
Separating them permits new providers and host applications without changing the
review protocol.

## The problem exposed by manual orchestration

The repository's manual cross-provider case study proves that Codex can author a
specification, launch Claude Code headlessly, preserve Claude's provider session
identifier, investigate findings, resume the same reviewer, and obtain terminal
agreement.[^3] It also shows the gap between a successful expert-operated run
and a reusable product:

- the orchestrator had to distinguish an operating-system process handle from
  the provider's durable session identity;
- a long-running turn exposed too little state to diagnose confidently;
- reviewer output was copied into the governed workspace by the author;
- read-only behavior depended partly on prompt and launch configuration;
- session activation and recovery were provider-specific; and
- correct cleanup depended on the orchestrator remembering every step.

The current package already solves many governance concerns. It uses an
append-only event ledger, sealed responses, participant fingerprints,
artifact/commit binding, role-aware state transitions, stable `APR_*` errors,
and explicit recovery. Its `wait_for_handoff` MCP tool uses filesystem events so
an unchanged wait occurs outside model execution. The live-wait implementation
checks durable authority before and after subscription, which closes the classic
“event arrived just before watch began” race.

What remains incomplete is runtime orchestration. The current transport names
(`manual`, `resume-only`, `live-wait`, and `native-push`) mix user experience,
session ownership, and wake mechanism. The `native-push` surface validates an
injected Codex dispatcher but does not itself connect to a running host. The
resume adapter can invoke documented CLI forms for Codex, Claude, and Grok, but
it is not yet an end-to-end session coordinator.

The next version should preserve the protocol strengths and make the runtime
boundary explicit.

## The three runtime modes

### 1. Headless-managed

In headless-managed mode, `ai-peer-review` owns the reviewer process. It creates
the review workspace, constructs a provider-specific but protocol-governed
prompt, launches the provider CLI, parses structured output, records the exact
provider session handle in private scratch state, and manages subsequent turns.

This is the most naturally unattended mode. Codex documents `codex exec` for
non-interactive work, including JSONL output and exact session resume.[^4]
Claude Code documents print mode, JSON/streaming JSON, exact session resume,
turn limits, and unattended permission controls.[^5] Grok Build documents
headless JSON output and exact-ID resume.[^6] Gemini CLI documents `-p`, JSON or
JSONL output, session metadata, tool events, and process exit classes.[^7]

The coordinator owns:

- the exact executable and argument vector;
- canonical repository working directory;
- environment allowlist and credential references;
- stdout/stderr parsing and size limits;
- process cancellation and bounded shutdown;
- provider session identity extraction;
- turn deadline, cost/turn budget where supported, and retry policy; and
- conversion of provider output into a sealed protocol response.

It does **not** own the review decision. Provider telemetry is diagnostic; the
event ledger and sealed response remain authoritative.

Headless mode is not synonymous with unrestricted execution. A reviewer should
receive a read-only sandbox or tool policy. If a provider cannot satisfy that
contract, `doctor` must reject unattended review rather than silently select an
“always approve” or “YOLO” mode. Permission requests that cannot be safely
answered by the configured policy become explicit intervention events.

### 2. Session-managed (cross-window)

In session-managed mode, a reviewer session already exists in another window,
application, IDE, or host process. `ai-peer-review` does not create or own that
session. It holds an opaque handle granted by an official session API, sends a
bounded prompt to that exact session, observes structured lifecycle events, and
collects the result.

The distinction from UI automation is essential. Keyboard injection, window
focus, accessibility scraping, and private transcript edits are not acceptable
control planes. They are ambiguous under multiple windows, break on interface
changes, and can deliver review authority to the wrong conversation.

Codex App Server is a strong example of the intended surface: it exposes
`thread/start`, `thread/resume`, `turn/start`, streamed item notifications, and
explicit approval/sandbox policy through JSON-RPC.[^8] The Codex SDK can also
resume a thread by ID and run another turn.[^9] Gemini CLI's ACP mode is another
example: a client controls an agent over JSON-RPC on stdio using methods for
initialization, authentication, new/load session, prompt, and cancellation.[^10]

This mode may be fully automatic, or a person may also interact with the window.
Human presence is permitted but is not part of the activation contract. The
adapter must detect or prevent concurrent turns, bind every message to an exact
session, and preserve provider-issued identifiers only in untracked scratch.

A pre-existing window is not automatically controllable. Session-managed mode
is available only when the host exposes a documented inbound API and an
end-to-end capability probe succeeds. Otherwise the user must choose headless or
handoff. A runtime must never fall back to manipulating the UI.

### 3. Cooperative handoff

In cooperative handoff mode, the author and reviewer are independently owned.
Each agent completes a turn by sealing its result and writing a durable delivery
event that names the recipient and result path. A small external coordinator, a
pending MCP wait, a targeted resume command, or a person then prods the opposite
agent to inspect the log and continue.

This mode is the least coupled and the easiest to recover. Neither agent needs
to share a process tree or vendor API. It is appropriate for long reviews,
different machines that share the governed workspace, providers with only a
resume command, and workflows in which a person wants to inspect the evidence
between turns.

The workspace—not the wake signal—is authoritative. The signal carries only an
invitation such as “review `<workspace>` after sequence 14.” On activation, the
recipient validates the ledger, reads the sealed result, and derives its one
legal next action. Duplicate signals are harmless because delivery consumption
is idempotent and sequence-bound.

The existing MCP `wait_for_handoff` is a good adapter for an agent already
parked in a pending tool call. It eliminates timer-based model wakeups and their
token cost. It is not, however, a general mechanism for injecting a turn into an
arbitrary dormant desktop window. The external coordinator fills that gap by
watching the same durable deliveries and invoking a supported session or resume
surface.

## One protocol, three control planes

```text
                 governed review workspace
        events + seals + artifacts + delivery receipts
                              |
                    re-read and validate
                              v
                 review-scoped coordinator
             capability probe + wake policy + lease
                  /            |             \
                 /             |              \
        headless process   official session   independent session
          owned child           API            or human-owned UI
              |                 |                    |
       structured output   structured events    sealed handoff log
                 \             |              /
                  +------ next protocol event +
```

The protocol core must not import provider process logic. It answers:

- Who are the registered author and reviewer?
- Which immutable artifact or snapshot is under review?
- Who owns the next turn?
- Which response bytes were sealed?
- Has the delivery been acknowledged?
- Is the review agreed, abandoned, or awaiting human authority?

Runtime drivers answer:

- Who owns the session/process?
- How is a turn started, observed, cancelled, and resumed?
- Which permission requests can be handled unattended?

Wake adapters answer:

- How is a durable delivery announced to the recipient?
- What is the next preauthorized fallback?
- What exact recovery command should a person run?

This layering allows a handoff review to use a session API as its primary wake
mechanism or a headless driver to persist provider session continuity without
changing protocol semantics.

## Capability negotiation and fail-closed selection

Runtime support should be declared as tested capabilities, not inferred from a
provider name. At start, `doctor` records a versioned capability observation:

| Capability          | Meaning                                               |
| ------------------- | ----------------------------------------------------- |
| `launch`            | Start a fresh non-interactive reviewer                |
| `structured-output` | Parse an unambiguous result/event stream              |
| `exact-resume`      | Continue a recorded provider session by exact ID      |
| `session-inject`    | Send a turn through a documented session API          |
| `turn-observe`      | Observe completion, failure, and permission requests  |
| `cancel`            | Cancel the exact in-flight turn                       |
| `read-only`         | Enforce the configured reviewer non-mutation boundary |
| `identity`          | Return stable provider/session/model evidence         |

The selected runtime is pinned in the start event. Capability observations are
diagnostic snapshots and must be refreshed before each activation. If an update
removes a required flag or method, the review enters intervention-required
rather than degrading into a different ownership model.

Fallback is therefore ordered but bounded. A reasonable handoff chain is:

```text
official session API -> exact CLI resume -> MCP live wait -> user recovery
```

Only methods explicitly authorized at review start may run automatically. A
session-managed review may fall back from an app API to an exact resume command
if both target the same recorded session and the user selected that chain. It
must not create a fresh headless reviewer, choose the provider's “latest”
session, or switch identities silently.

## The lightweight coordinator

An external Node.js process is appropriate because the authority is already on
the local filesystem and Node runs on every supported project regardless of the
project's implementation language. `fs.watch()` can observe delivery-directory
changes without model polling, and an `AbortSignal` can close the watcher.[^11]
Node explicitly warns that `fs.watch()` behavior differs across platforms and
can be unreliable on network filesystems. Therefore a notification is only a
hint: every callback re-reads and validates the durable event ledger. Startup
also performs a read-before-subscribe and immediate post-subscribe re-read.

The coordinator should be foreground or host-owned, never an untracked detached
daemon. Exactly one instance may coordinate a review. Its lease contains:

- review ID and canonical workspace identity;
- coordinator instance UUID;
- owning process/IPC identity;
- start time and monotonic heartbeat;
- selected runtime and wake policy digest;
- child process identity, when present; and
- shutdown state.

The PID is diagnostic, not authority. Operating systems reuse PIDs, and Node
warns that signalling a reassigned PID can affect the wrong process.[^12] Before
signalling a child, the coordinator must match its own captured child object,
instance nonce, and lease record.

### No-orphan shutdown contract

Shutdown begins on:

- terminal review state (`AGREED`, `ABANDONED`, or final human disposition);
- retry/fallback exhaustion;
- owner IPC loss or invalid lease;
- `SIGINT`, `SIGTERM`, or supported `SIGHUP`;
- watcher error or workspace identity change;
- protocol integrity/version failure; or
- an explicit, identity-matched `coordinator stop` command.

The ordered shutdown sequence is:

1. Mark the instance `stopping` and reject new activation work.
2. Close the watcher and cancel timers and pending API calls.
3. Request graceful cancellation of the exact active provider turn.
4. Wait for a bounded provider-specific grace period.
5. Terminate only the exact child instance still owned by this coordinator.
6. Flush a final scratch diagnostic and recovery record.
7. Remove the lock/lease only if its instance UUID still matches.
8. Exit with a stable coordinator status code.

Windows signal behavior differs from POSIX and must be tested separately; Node
documents that several familiar signals terminate a Windows child abruptly.[^12]
Crash recovery therefore occurs at `start`, `status`, and `doctor`: inspect a
stale lease, prove the prior instance is absent, reconcile any sealed delivery,
and print an exact recovery action. Never kill a process merely because a stale
file contains its PID.

## Permission and human-interaction model

The modes define ownership, not whether a human is allowed to participate.

- Headless-managed is intended to run without human interaction. A provider
  permission request not covered by policy stops the turn and records
  intervention-required.
- Session-managed can run unattended through a host permission callback, or a
  person can answer in the owning application. The protocol records only the
  resulting authority evidence, not a guess about who clicked.
- Cooperative handoff may be entirely automated by the coordinator or advanced
  manually with the exact recovery command.

The reviewer contract should default to source-only access. Network, shell,
write, secret, and external-system capabilities must be separately declared.
Provider “bypass permissions” modes are not a substitute for a review policy.
Claude offers plan/restricted modes and explicit behavior for unattended
permission prompts.[^5] Gemini has folder-trust and headless behavior that can
fail on an untrusted workspace; while it offers `--skip-trust`, an adapter should
not use that flag to trust an arbitrary directory automatically.[^13]

Credentials remain in provider-owned stores or environment references. Raw
tokens, desktop cookies, and provider transcript files never enter tracked
review collateral.

## Provider feasibility

| Provider surface             | Headless-managed                            | Session-managed              | Cooperative handoff | Recommended first integration                |
| ---------------------------- | ------------------------------------------- | ---------------------------- | ------------------- | -------------------------------------------- |
| Codex CLI / SDK / App Server | Strong                                      | Strong                       | Strong              | App Server plus exact `codex exec resume`    |
| Claude Code                  | Strong                                      | Moderate; host/SDK dependent | Strong              | Print-mode adapter plus exact session resume |
| Grok Build                   | Strong                                      | Strong where ACP is enabled  | Strong              | Headless JSON, then ACP                      |
| Gemini CLI                   | Strong                                      | Strong through ACP           | Strong              | Headless/ACP conformance adapter             |
| Gemini desktop app           | Interactive only on current public evidence | Not yet established          | Human-assisted only | Capability research; no UI automation        |

The official Grok Build repository describes the CLI as usable interactively,
headlessly, and through ACP, which makes the session path credible but still
subject to installed-version conformance testing.[^16]

### Gemini assessment

Google now documents native Gemini apps for macOS and Windows. The Mac app
requires Apple Silicon and macOS 15 or later and supports interactive chat,
window sharing, and “Speak to Window”; the Windows app supports interactive
desktop access on Windows 10 or later.[^1][^2] Local inspection for this research
confirmed the user's Mac app is installed and running as version `1.111.1.839`;
the separate `gemini` CLI executable was not present on `PATH`.

That is valuable for human-assisted review but does not prove an inbound
automation API. The public desktop help pages do not document a way for an
external process to address a specific Gemini conversation, inject a prompt,
observe a turn, or answer a permission request. Undocumented URL schemes,
accessibility automation, and private application files are explicitly outside
the design.

Gemini CLI is a much stronger delivery target:

- headless mode returns JSON or JSONL with session, message, tool, error, and
  final-result events;[^7]
- sessions are stored per project and can be resumed by full UUID;[^14]
- ACP supplies JSON-RPC programmatic control, session loading, prompts, and
  cancellation;[^10]
- cached authentication works headlessly, while new environments can use an API
  key or Vertex AI configuration;[^15] and
- folder trust has explicit automated-environment behavior.[^13]

The adapter should invoke Gemini from the canonical repository root, record the
full session UUID, and capability-test the installed CLI version. Installation
of the desktop app and installation/authentication of Gemini CLI are separate
preconditions. Supporting one does not imply the other.

## Recovery as a product surface

Every exhausted activation path should leave the review valid and the next
action obvious. The durable turn remains `delivery-pending`; failure to wake a
session never unseals or reassigns it. The CLI should emit:

- a stable code such as `APR_WAKE_FAILED` or `APR_COORDINATOR_STALE`;
- the failed adapter chain and safe diagnostic facts;
- whether an exact provider session remains resumable;
- one copyable recovery command; and
- a scratch recovery note that `status --next` can reconstruct.

Representative operator commands are:

```text
peer-review coordinator status <workspace>
peer-review coordinator stop <workspace>
peer-review coordinator recover <workspace>
peer-review status <workspace> --next
peer-review explain APR_WAKE_FAILED
peer-review explain APR_COORDINATOR_STALE
```

The recovery command must target the exact review and participant. “Open the
latest session” is not acceptable because it can violate reviewer identity.

## Why MCP remains optional

MCP is not inherently too heavy for the problem. The current pending-tool wait
is efficient and avoids timer-driven token spend. Its limitation is scope: it
requires each agent host to configure the server, keep a tool call pending, and
support a sufficiently long tool timeout. It wakes the session already blocked
on that call; it does not universally control a session in another application.

The recommended migration is additive:

- preserve `wait_for_handoff` as the `mcp-live-wait` wake adapter;
- move filesystem observation into a reusable delivery source;
- add the standalone review-scoped coordinator over that source;
- add session-API and CLI-resume wake adapters;
- deprecate configuration that treats `live-wait` as a runtime mode; and
- keep manual recovery permanently available.

This retains the token-saving work already built while making MCP one tool in a
broader activation strategy.

## Security and integrity properties

The architecture should preserve these invariants:

1. The ledger, not a process or model transcript, determines review state.
2. Only the current turn owner can submit the next governed response.
3. Wake signals never contain secrets or authority to mutate protocol state.
4. Provider session handles are opaque, untracked, and exact—not “latest.”
5. A reviewer cannot mutate the reviewed repository through the supported
   launch policy.
6. Runtime fallback cannot change participant identity or execution ownership
   silently.
7. Duplicate, delayed, or replayed wake events are idempotent.
8. One review has at most one valid coordinator lease.
9. Terminal review state causes deterministic coordinator shutdown.
10. Stale process metadata is inspected and reconciled, never trusted as a kill
    target by itself.

These controls matter more than provider diversity. A different model can
decorrelate reasoning errors, but only protocol evidence makes the exchange
auditable.

## Expected operational impact

The design removes repeated model polling from every mode. Headless and session
drivers wait on provider process/API events; handoff waits on filesystem events
or a pending MCP call. It should therefore reduce idle token consumption while
improving latency over timer-based wake cycles.

The coordinator adds a small resident process during active reviews, but its
state is bounded and observable. The main costs remain provider inference,
review depth, and repository exploration. Provider-reported cost and timing may
be recorded as non-authoritative diagnostics, never as review evidence or a
portable comparison.

## Recommended delivery sequence

1. Separate runtime mode from wake policy in a backward-compatible protocol
   revision.
2. Build coordinator lifecycle, lease, shutdown, recovery, and cross-platform
   tests before connecting provider processes.
3. Deliver cooperative handoff first using the existing event/delivery source,
   targeted resume, MCP compatibility, and user recovery.
4. Add a generic headless driver and conformance harness, then Codex, Claude,
   and Grok adapters.
5. Add session-managed Codex App Server support and a general session adapter
   contract.
6. Add Gemini CLI headless and ACP adapters after a focused safety/conformance
   spike.
7. Keep Gemini desktop session automation gated on a documented Google control
   surface.

This ordering proves the dangerous lifecycle code independently of provider
quirks and delivers useful no-poll handoff early.

## Conclusion

The three runtime modes are not competing implementations. They are a coherent
set of ownership choices over one governed protocol.

Headless-managed offers the simplest unattended experience. Session-managed
lets an existing agent window participate through a supported control plane.
Cooperative handoff remains the universal, resilient path when sessions are
independently owned. A lightweight Node coordinator can connect all three
without turning the review protocol into a process manager or requiring MCP
everywhere.

The design's most important promise is not that every provider will always wake
automatically. It is that activation failure never corrupts the review, changes
the reviewer, or strands an invisible daemon. The work remains sealed, the
coordinator stops, and the user receives one exact way to continue.

## Sources

[^1]: Google, [Use the Gemini app on Mac](https://support.google.com/gemini/answer/17011627?hl=en), accessed September 11, 2026.

[^2]: Google, [Use the Gemini app for Windows](https://support.google.com/gemini/answer/18263854?hl=en), accessed September 11, 2026.

[^3]: `ai-peer-review`, [Manual Cross-Provider Peer Review](../manual-cross-provider-peer-review.md), repository case study.

[^4]: OpenAI, [Codex CLI reference](https://developers.openai.com/codex/cli/reference) and [Non-interactive mode](https://developers.openai.com/codex/noninteractive), accessed September 11, 2026.

[^5]: Anthropic, [Claude Code CLI reference](https://code.claude.com/docs/en/cli-usage), accessed September 11, 2026.

[^6]: xAI, [Grok Build headless mode](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/14-headless-mode.md), accessed September 11, 2026.

[^7]: Google, [Gemini CLI headless mode reference](https://geminicli.com/docs/cli/headless/), updated March 10, 2026.

[^8]: OpenAI, [Codex App Server](https://developers.openai.com/codex/app-server), accessed September 11, 2026.

[^9]: OpenAI, [Codex SDK](https://developers.openai.com/codex/sdk), accessed September 11, 2026.

[^10]: Google, [Gemini CLI ACP mode](https://geminicli.com/docs/cli/acp-mode/), accessed September 11, 2026.

[^11]: Node.js, [`fs.watch()` documentation](https://nodejs.org/api/fs.html#fswatchfilename-options-listener), accessed September 11, 2026.

[^12]: Node.js, [Child process documentation](https://nodejs.org/api/child_process.html) and [Process signal documentation](https://nodejs.org/api/process.html#signal-events), accessed September 11, 2026.

[^13]: Google, [Gemini CLI trusted folders](https://geminicli.com/docs/cli/trusted-folders/), accessed September 11, 2026.

[^14]: Google, [Gemini CLI session management](https://geminicli.com/docs/cli/session-management/), accessed September 11, 2026.

[^15]: Google, [Gemini CLI authentication setup](https://geminicli.com/docs/get-started/authentication/), updated August 17, 2026.

[^16]: xAI, [Grok Build repository and product documentation](https://github.com/xai-org/grok-build), accessed September 11, 2026.
