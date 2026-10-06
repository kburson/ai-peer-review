<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-b9a20b7ba40e0363b2cecb59a3293f6e"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-26-106-manual-xpr-startup-design.md"
artifact_commit: "877e107592c3f61ae08f39017bc3b60e3d894afb"
artifact_blob: "d11777a69d3ea88f9ed4e7c69c16780ce465e584"
artifact_digest: "sha256:f2092d5ab0ffc3dd18733d2b79b7032bfc3d8a57b6148d05d5683087546762d3"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "claude-opus-5"
  session_fingerprint: "sha256:90eea9d89a947209c001ee7a09bda0560fdf35194b34d988ab207010d59d72c8"
  identity_source: "runtime"
started_at: "2026-09-26T23:53:38.861Z"
submitted_at: "2026-09-27T00:05:52.972Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Scope of this review: the design contract in
`docs/superpowers/specs/2026-09-26-106-manual-xpr-startup-design.md` and the
implementation it names — `src/startup/runtime.mjs`, `src/cli/run.mjs`,
`src/providers/claude-stream.mjs`, `src/provider/claude-launch.mjs`,
`src/provider/preflight.mjs`, `src/providers/claude.mjs`, and
`test/integration/manual-xpr-startup.test.mjs` — read against commit
`877e107592c3f61ae08f39017bc3b60e3d894afb`.

The core repair is sound and the three defects named in the problem statement are
each addressed by a real mechanism, not by narrative:

- Required behavior 1 (manual broker startup never requests automatic launch) is
  implemented at `src/startup/runtime.mjs:348-355`: the broker branch now
  short-circuits to `save('manual')` when `prepared.runtime.transport_mode ===
  'manual'`, before any `requestBroker(..., 'launch', ...)`. Resume-only and
  automatic-required retain validated dispatch, and the reworked broker tests
  (`automaticRequest` in `test/integration/broker-startup.test.mjs:1377`) keep
  launch coverage on an explicitly non-manual transport. `automatic-required`
  dispatch remains covered by `test/integration/automatic-required.test.mjs` and
  `test/integration/start-join.test.mjs`, so the helper rename did not silently
  drop that lane.
- Required behavior 2 (streamed identity binding) is implemented at
  `src/cli/run.mjs:5104-5116`: the explicit launcher now runs through
  `createClaudeStreamRecorder` + `createClaudeStreamingExec` instead of a bare
  `execFile`, and the recorder refuses any join tool-use that is not bound to the
  observed `system/init` session (`src/providers/claude-stream.mjs:126-155`).
  "Successful exit is not submission" is genuinely enforced: `status: 'submitted'`
  requires a new `reviewer-accepted`/`reviewer-revisions-requested` event whose
  actor equals the registered reviewer fingerprint
  (`src/provider/claude-launch.mjs:606-644`), and `collectClaudeStream` refuses a
  stream with no terminal `result` event.
- Required behavior 4 (sealed manual transport beats an inherited resume command)
  is implemented for `join` at `src/cli/run.mjs:5227-5235`, keyed off the sealed
  `protocol.startup.transport_mode` rather than the caller's configuration. This
  is the correct source of truth and it fixes the reported join failure, where a
  computed `resume-only` capability could not match the registered
  `protocol.transports.reviewer` at `src/cli/run.mjs:1616`.

Verification I ran: `node --test test/integration/manual-xpr-startup.test.mjs` —
4 tests, 4 pass, 0 fail (2.9s). I did not run the full suite.

Three gaps remain. One is a contract/implementation mismatch inside required
behavior 4 (the `start` side honors only the *explicit* flag, not the effective
sealed mode). One is an unstated scope boundary in required behavior 3 (the child
environment strips provider *identity* but forwards the parent Claude session's
live control-channel variables). One is an ordering claim in required behavior 2
that the implementation does not actually enforce. None of the three defeats the
repair; all three are specific enough to fix without redesign.

I reviewed the contract and implementation only. I did not attempt to
authenticate the provider, and I make no claim about verified human authority —
consistent with the artifact's own statement of what the evidence verifier does.

## Findings

1. **`start` honors only an explicit `--transport-mode manual`, not the effective
   sealed mode** (`src/cli/run.mjs:5145-5152`). Required behavior 4 says CLI
   startup and join honor "explicit/sealed" manual transport. The `join` fix
   correctly reads the sealed mode (`src/cli/run.mjs:5230`), but the `start` fix
   tests `parsed.options.transportMode === 'manual'` — the literal flag. The
   effective mode is `input.transportMode ?? configuredReview.transport_mode`
   (`src/cli/run.mjs:874`), defaulting to `'manual'` in `configuredTransport`
   (`src/cli/run.mjs:497`). So a review that is manual *by default or by
   `review.transport_mode` config* still resolves `transportCapability` through
   `resumable ? 'resume-only' : 'manual'`.

   Concrete failure: author has `hosts.codex.resume.command` configured (a
   documented, supported config) and runs `peer-review start docs/x.md
   --artifact-kind spec --reviewer-provider claude ...` without
   `--transport-mode`. `configuredTransport` accepts mode `manual` with
   capability `resume-only` (nothing at `src/cli/run.mjs:517-535` or
   `src/protocol/events.mjs:760-771` forbids that pairing), so the review seals
   `transport_mode: 'manual'` alongside `author_transport_capability:
   'resume-only'`, and `src/cli/run.mjs:5176-5177` writes the author's raw resume
   handle to `<workspace>/handoffs/author-resume.json` for a review that will
   never use resume delivery. Worse, that capability is part of the
   idempotent-restart identity check at `src/cli/run.mjs:1070`: if the resume
   command is added to (or removed from) configuration between the first `start`
   and an exact retry of the same startup request, the recomputed capability
   flips, `exactRetry` is false, and the retry is refused as a collision
   (`src/cli/run.mjs:1074`) even though the startup request is unchanged. An
   explicitly flagged manual start is now stable against this; a default-manual
   start is not.

   Severity: contract mismatch with a real (if narrow) recovery failure. Note
   this is invisible to the current tests — `start()` in the new test file calls
   `startReview` directly with `transportMode: 'manual'`, and `cliCall` in
   `test/helpers/claude-launch-cli-regression.mjs:117` passes
   `transportCapability: 'manual'` in `io`, which short-circuits the new branch
   entirely. No test exercises `src/cli/run.mjs:5148`.

2. **The child environment strips provider identity but forwards the parent
   Claude session's live control channel** (`src/cli/run.mjs:5092-5102`,
   `src/provider/preflight.mjs:45-67`). Required behavior 3 says the child
   environment "removes inherited provider identity, preserves ordinary
   authentication environment". The implementation uses
   `withoutProviderIdentity(io.env)`, a deny-list of ten `*_SESSION_ID` /
   `*_MODEL_*` keys plus the two hook tokens. Everything else in the parent
   environment is forwarded verbatim.

   Concrete exposure: a Claude Code session's tool environment also carries
   `CLAUDE_CODE_MESSAGING_SOCKET`, `CLAUDE_CODE_MESSAGING_TOKEN`, `CLAUDE_PID`,
   `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_CODE_SESSION_ATTENDED`,
   `CLAUDE_CODE_ENTRYPOINT`, `CLAUDECODE`, and `CLAUDE_EFFORT` (I verified these
   are present in a live Claude Code tool environment on this platform). None
   appears in `PROVIDER_IDENTITY_ENVIRONMENT_KEYS`. So when `launch-reviewer` is
   run from inside a Claude Code session — it is a generic CLI verb, nothing
   restricts it to a Codex author — the launched reviewer child inherits the
   parent session's messaging socket and its bearer token while its
   `CLAUDE_CODE_SESSION_ID` is stripped. That is partial isolation: identity is
   removed, but a live control channel back to the author's session survives,
   which cuts against required behavior 5's independent author and reviewer
   sessions. The package already has the right posture for this elsewhere —
   `CLAUDE_ENVIRONMENT_ALLOWLIST` (`src/provider/preflight.mjs:8-43`) is a strict
   allowlist used for the deterministic-preflight lane — so the manual lane is
   the outlier. The same deny-list is used by the broker lane at
   `src/providers/claude.mjs:164-171`, so this is a shared gap rather than a
   regression introduced here, but this design is where the property is claimed.

3. **Required behavior 2 asserts the tool-use binding happens "before join", but
   nothing orders the write against the read.** The recorder's `atomicWrite`
   runs on the *parent* while it drains the child's stdout
   (`src/providers/claude-stream.mjs:46-56`, `:155`); the child executes the
   `Bash` join concurrently, immediately after the CLI emits the `assistant`
   event. The child's `join` then reads that file through
   `readClaudeStreamObservation`, which treats a missing or unreadable file as a
   hard refusal with no bounded wait or retry
   (`src/providers/claude-stream.mjs:208-238`).

   Concrete failure: if the parent's event loop is delayed past the child's tool
   execution (a slow or contended filesystem — note `atomicWrite` does a
   `fsync` plus a directory sync — or any competing synchronous work in the
   launcher process), the child's `join` fails with "Claude stream observation
   cannot be read safely", the reviewer cannot claim its turn, and the launcher
   classifies the run as `join-failed`/`outcome-unknown`. The manual review then
   needs operator reconciliation for a pure timing reason. The new test
   acknowledges this ordering implicitly: it inserts `await new
   Promise((resolve) => setImmediate(resolve))` before reading the observation
   (`test/integration/manual-xpr-startup.test.mjs:153-159`), which makes the
   fixture deterministic but is not a guarantee the production path has.

## Required changes

1. Resolve finding 1 by making the `start` transport-capability decision read the
   *effective* mode, not the flag — i.e. derive it from the same
   `input.transportMode ?? config.review.transport_mode ?? 'manual'` resolution
   that `configuredTransport` uses, so a default-manual or config-manual review
   behaves exactly like `--transport-mode manual`. State in required behavior 4
   that the rule is keyed to the effective/sealed mode on both the `start` and
   `join` sides. Add coverage that drives the real `start` CLI path with
   `io.transportCapability` unset and a configured host resume command, and
   asserts the sealed `author_transport_capability` is `manual` and that no
   `handoffs/author-resume.json` is written.

2. Resolve finding 2 by stating in required behavior 3 which parent-session
   variables the child environment must drop, beyond identity: at minimum the
   Claude Code control-channel and process keys
   (`CLAUDE_CODE_MESSAGING_SOCKET`, `CLAUDE_CODE_MESSAGING_TOKEN`, `CLAUDE_PID`,
   `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_CODE_SESSION_ATTENDED`). Either extend
   the removal set used by both the CLI and broker lanes, or say explicitly that
   the manual lane adopts the `CLAUDE_ENVIRONMENT_ALLOWLIST` posture. Cover it
   with an assertion in the launch test alongside the existing
   `options.env.CODEX_SESSION_ID === undefined` check
   (`test/integration/manual-xpr-startup.test.mjs:133`).

3. Resolve finding 3 by stating the ordering mechanism the "before join"
   guarantee rests on, and make the implementation match it. The cheapest honest
   option is a bounded, short retry/wait on the child's observation read for the
   active-join operation, with the existing hard refusal preserved once the bound
   expires; the alternative is an explicit statement in the contract that the
   join is permitted to fail closed on a late observation and that this is an
   operator-reconcilable outcome rather than a defect.

## Optional suggestions

1. `src/startup/runtime.mjs:379` — the native-ownership lane still dispatches
   `request.adapter.launch` whenever the adapter exposes `launch`, with no
   `transport_mode === 'manual'` guard, unlike the repaired broker branch at
   `:348-355`. This is unreachable with production capabilities, because
   `src/providers/registry.mjs:297-308` only ever declares a native capability
   with `transport_mode: 'automatic-required'`. Still, making the two branches
   symmetric would remove a latent way to reintroduce exactly the defect this
   change repairs, and would make required behavior 1 true of both ownership
   lanes rather than only the broker one.

2. `src/cli/run.mjs:5119` (pre-existing, unchanged here) — `launch-reviewer`
   exits `0` for every status except `'failed'`, including `'outcome-unknown'`
   and `'permission-blocked'`. Since required behavior 2 is explicitly about a
   successful process exit not implying submission, the launcher's own exit code
   is the one place where a wrapper script can still make that mistake. Consider
   a distinct non-zero exit for non-submitted outcomes, or note in the contract
   that callers must read `status` rather than the exit code.

3. The verification section names files but not the behaviors the new tests
   actually pin. Naming them — manual broker registration without launch, sealed
   manual join under an inherited resume command, and stream-evidence capture in
   both well-formed and malformed variants — would make the two coverage gaps in
   findings 1 and 2 visible at review time instead of only on inspection.

4. `src/providers/claude.mjs:164-171` injects `CLAUDE_MODEL_ID` /
   `CLAUDE_MODEL_DISPLAY` unconditionally, while the new CLI path correctly
   withholds them when a declared identity is configured
   (`src/cli/run.mjs:5091`). The broker lane's unconditional injection would
   clobber a declared configured identity into a `runtime`-sourced one, because
   `resolveRuntime` prefers the environment model over `declaredModel`
   (`src/identity/claude.mjs:5-44`). That pairing appears unreachable today
   (declared identities are confined to manual transport at
   `src/cli/run.mjs:1341-1343`), so this is a consistency note, not a defect —
   but the two lanes computing the same environment differently invites drift.

## Decision

revisions-requested
