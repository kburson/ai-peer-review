<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-b9a20b7ba40e0363b2cecb59a3293f6e"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-26-106-manual-xpr-startup-design.md"
artifact_commit: "21c4bdb90e77b653bbf9c5d8892eae901cc4b612"
artifact_blob: "21ddfe7f73cbaccf80d6b7dc4ca35ac94ca066e1"
artifact_digest: "sha256:ece3b291ac908fd44d25a82248e50ea8ff94323930aa9aeb087fe70bbc8557ff"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "claude-opus-5"
  session_fingerprint: "sha256:90eea9d89a947209c001ee7a09bda0560fdf35194b34d988ab207010d59d72c8"
  identity_source: "runtime"
started_at: "2026-09-26T23:53:38.861Z"
submitted_at: "2026-09-27T00:18:46.660Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

All three required changes from reviewer turn 1 are addressed, each by a
mechanism I verified in the current bytes and by tests I ran myself. The two
optional items the author declined are declined on accurate grounds, and the
declines are now documented in the contract rather than left implicit.

Verification I ran in this turn, from the worktree root:

- `node --test test/integration/manual-xpr-startup.test.mjs
  test/unit/claude-observation-wait.test.mjs` — 9 tests, 9 pass, 0 fail (4.6s).
  This matches the author's "9/9 targeted tests passed" claim.
- `node --test test/unit/provider-preflight.test.mjs
  test/unit/claude-launch-identity.test.mjs
  test/unit/claude-observation-path.test.mjs
  test/unit/claude-reviewer-resume-submit.test.mjs
  test/unit/provider-capabilities.test.mjs test/unit/provider-evidence.test.mjs`
  — 38 tests, 38 pass, 0 fail (8.2s).
- `node --test test/integration/claude-launch-bootstrap.test.mjs
  test/integration/claude-identity.test.mjs
  test/integration/claude-launch-permissions.test.mjs
  test/integration/claude-reviewer-turn-rotation.test.mjs
  test/integration/broker-startup.test.mjs test/integration/start-join.test.mjs`
  — 68 tests, 68 pass, 0 fail (31.7s).

I ran the suites most exposed to the environment-filter and transport-resolution
changes, not the full suites; the author's statement that full suites will be
repeated at the final committed shape is the right disposition for the rest.

Disposition of my turn-1 required changes:

1. **Effective/sealed manual transport on the `start` side — resolved.**
   `src/cli/run.mjs:5124-5125` now resolves `effectiveTransportMode =
   parsed.options.transportMode ?? loaded.config.review?.transport_mode ??
   'manual'`, and `:5150` keys the capability off that value. The resolved mode
   is passed into startup as `transportMode: effectiveTransportMode` at `:5161`,
   placed *after* the `...parsed.options` spread, so the spread cannot reintroduce
   an unresolved `undefined` — that ordering matters and it is correct. Required
   behavior 4 is reworded to "effective/sealed" and states the flag →
   configuration → manual-default precedence, the no-stored-handle rule, and
   retry stability. Two real-CLI regressions
   (`test/integration/manual-xpr-startup.test.mjs:234-272`, both `configured`
   variants) drive the production `start` path with `io.transportCapability`
   unset — I confirmed `fixtureStartupDeps` (`test/helpers/internal-api.mjs:106-138`)
   contains no `transportCapability`, so the new branch is genuinely exercised
   rather than short-circuited as in `cliCall`. They assert sealed
   `author_transport_capability === 'manual'`, absence of
   `handoffs/author-resume.json`, and a successful exact retry after the resume
   configuration is removed — which is precisely the collision I described at
   `src/cli/run.mjs:1070`. A side benefit: `effectiveTransportMode` also now gates
   the author transport observation at `:5129`, so a config-declared
   `automatic-required` start observes transport instead of reaching
   `validateAutomaticParticipant` with no observation.
2. **Child environment control-channel removal — resolved.**
   `src/provider/preflight.mjs:58-75` now also deletes
   `CLAUDE_CODE_MESSAGING_SOCKET`, `CLAUDE_CODE_MESSAGING_TOKEN`, `CLAUDE_PID`,
   `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_CODE_SESSION_ATTENDED`,
   `CLAUDE_CODE_ENTRYPOINT`, `CLAUDECODE`, and `CLAUDE_EFFORT` — every key I
   named, in the shared filter, so both the CLI lane
   (`src/cli/run.mjs:5095`) and the broker lane (`src/providers/claude.mjs:168`,
   `:435`) inherit the fix rather than only the one I reported. The authentication
   allowlist is untouched, so `ANTHROPIC_*` and `CLAUDE_CONFIG_DIR` still reach
   the child. `test/integration/manual-xpr-startup.test.mjs:108-116,143-152`
   seeds all eight keys in the parent and asserts each is `undefined` in the
   spawned child environment. Required behavior 3 names the removal class.
3. **Bounded wait for the active-join observation — resolved.**
   `src/providers/claude-stream.mjs:247-265` adds
   `waitForClaudeStreamObservation`, and the scoping is tight in the way that
   matters: it retries only when the operation is an active join
   (`operationId.startsWith('join:')`) *and* the wrapped cause is a filesystem
   `ENOENT`, with a `performance.now()` deadline capped at 2000 ms by the
   function's own input check. Unsafe-mode files, malformed JSON, and
   wrong-session observations all still carry no `ENOENT` cause and refuse on the
   first attempt. `invalid()` now attaches the cause
   (`src/providers/claude-stream.mjs:80-86`), which is what makes that
   discrimination possible, and `atomicWrite`'s rename means a reader sees either
   no file or complete bytes — never a partial observation. The production join
   path is wired to it at `src/providers/claude.mjs:256`, reached through
   `adapter.observeCurrentSession` from `src/cli/run.mjs:1399`.
   `test/unit/claude-observation-wait.test.mjs` covers delayed genuine
   publication, bounded refusal on persistent absence, and — the important one —
   that a contradictory-session observation is never retried, asserted precisely
   via `error.cause === undefined`. Required behavior 2 states the bound, the
   monotonic clock, and which classes refuse immediately.

Declines reviewed and accepted. Native-lane symmetry
(`src/startup/runtime.mjs:379`) and broker declared-identity environment parity
are deferred on the stated ground that production capability selection never
produces those pairings; I re-verified that ground —
`src/providers/registry.mjs:297-308` declares a native capability only with
`transport_mode: 'automatic-required'`, and declared identities are confined to
manual transport at `src/cli/run.mjs:1341-1343`, which the broker launch lane
never reaches. Both were optional in my turn-1 response and the artifact's
closing paragraph now records the scope boundary, which is the outcome I wanted.
The launcher exit-code contract is preserved with an explicit statement that
callers must read structured status — acceptable, since the ambiguity I raised is
now documented rather than silent.

Scope caveat for the record, not a finding: per the author's note I reviewed the
current working-tree bytes of `src/cli/run.mjs`, `src/provider/preflight.mjs`,
`src/providers/claude-stream.mjs`, `src/providers/claude.mjs`, and the two test
files. Those bytes are not covered by this response's `artifact_commit` /
`artifact_digest`, which bind the revised contract only. My acceptance of the
implementation therefore attaches to the bytes I read and the tests I ran in this
turn, and the author's commitment to repeat the full suites at the final
committed shape is what closes that gap.

As in turn 1: I reviewed the contract and implementation only. I did not
authenticate the provider and I assert nothing about verified human authority.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The observation refusal is now reachable for two operationally different
   reasons that share one message and one recovery string: a genuinely unreadable
   or unsafe file, and a join observation that simply never arrived inside the
   two-second bound (`src/providers/claude-stream.mjs:233`, reached from
   `:247-265`). An operator reading "Claude stream observation cannot be read
   safely / re-observe its provider stream" cannot tell "retry, the parent was
   starved" from "stop, this file is not what the package wrote". A distinct
   message or detail for the deadline-expiry case would make the bounded-wait
   behavior self-describing in the field. Low priority — the structured code is
   the same either way, and nothing is incorrect today.

2. `test/helpers/claude-launch-cli-regression.mjs:59` wires the fixture adapter's
   surface to `readClaudeStreamObservation`, the non-waiting read, so the
   integration tests exercise the sync path while
   `test/unit/claude-observation-wait.test.mjs` exercises the wait function in
   isolation. The *wiring* at `src/providers/claude.mjs:256` is therefore the one
   link with no test behind it: reverting that single line to the sync read would
   keep all 9 targeted tests green. The contract is honest about this — it claims
   unit coverage of the wait, not integration coverage of the wiring — so this is
   a durability suggestion, not a correction. Pointing the fixture surface at
   `waitForClaudeStreamObservation` would close it at no cost.

3. Requirement 3's removal set is a deny-list, so it stays accurate only as long
   as the provider's session variables do not grow. `CLAUDE_CODE_EXECPATH` is
   still inherited today (harmless — it is a path, not a credential), but it is a
   reminder that the next `CLAUDE_CODE_*` channel variable will pass through by
   default. The package already has the safer posture for the deterministic lane
   in `CLAUDE_ENVIRONMENT_ALLOWLIST` (`src/provider/preflight.mjs:8-43`).
   Migrating the manual lane onto that allowlist later — or adding a
   `CLAUDE_CODE_*`-prefix rule with explicit carve-outs for the authentication
   keys — would make the property hold by construction instead of by enumeration.

4. `src/providers/claude.mjs:274` and `:308` still read the same
   `join:<review_id>` observation synchronously in the bound-session and
   active-transport fallbacks. Those run after binding, when the observation
   should already exist, so the race I reported does not apply — but if a future
   change moves either earlier in a turn, they are where the same symptom would
   reappear. Worth a comment noting why they are deliberately not waited on.

## Decision

accepted
