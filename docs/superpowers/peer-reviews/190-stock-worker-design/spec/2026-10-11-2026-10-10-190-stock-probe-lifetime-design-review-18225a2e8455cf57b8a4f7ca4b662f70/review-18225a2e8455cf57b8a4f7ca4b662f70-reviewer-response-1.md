<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-18225a2e8455cf57b8a4f7ca4b662f70"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-10-190-stock-probe-lifetime-design.md"
artifact_commit: "09912e94a3eaf2376738cf90a8471ec2a7e55464"
artifact_blob: "4b2e5ac9166560badbbd059b120ce9c8c768bd3a"
artifact_digest: "sha256:29b5a7e9d05dd5ca1ea6fb77bff596c99999c93b430f43db740433da8f39a2a4"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:e06758fc422edd565e535b2e083d57a5c2fd3df3c44cd3195b89ee1ecbb34cac"
  identity_source: "runtime"
started_at: "2026-10-11T03:59:30.838Z"
submitted_at: "2026-10-11T04:02:10.818Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I independently reviewed `docs/superpowers/specs/2026-10-10-190-stock-probe-lifetime-design.md`. It proposes a guard-owned, resident stock PowerShell worker. The worker would replace the repeated one-shot `powershell.exe -EncodedCommand` ACL probes that make Windows primary registration exceed its budget. I checked the design against the current source in the working tree:

- `src/broker/storage-protection.mjs`:
  - the fixed observation script `windowsScript` (L203–298);
  - `operationBudget` (L299–326);
  - `stockWindowsExecutable` (L328–341);
  - `windowsReplaceFile` (L358–402), and its use inside the guard's retained replace (L1594–1611);
  - `windowsProbe` (L403–460);
  - `inspectAncestors`, `inspect` and `inspectWindowsReadPair` (L646–854);
  - `openProtectedRoot`, including `admitted()`, `verify()`, `withElectionLease`, `retainCredential` and `guard.close()` (L961–2062);
- the guard-opening call sites in `src/` (`portable-system.mjs` L381–401, `authority-fence.mjs` L158–176, and the `openProtectedRoot(` / `provisionProtectedRoot(` callers in `config/` and `broker/`);
- the diagnostic tap `test/helpers/windows-stock-timing.mjs`.

What the design gets right:

- **Freshness is not weakened by reuse.** Today every spawn inherits a copy of the Node parent's primary token, and Node never changes or impersonates its token. So a long-lived child observes the same token that a fresh child would. `WindowsIdentity::GetCurrent()`, group membership, `IsInRole`, `GetAccessControl` and `GetAttributes` are all queried per call. If the script runs them per request, as the design requires, reusing the process loses no freshness compared with one-shot spawns. The ban on principal and permission caches is correct, and it is enforceable because the script holds no observation state between requests.
- **The trust boundary is unchanged.** The executable is fixed, the script is fixed and package-owned, and caller paths are only JSON data. Responses stay unverified observations, and only the existing C1 receipt/guard path validates them. That matches the existing posture at L461 ("Only the fixed stock-probe path mints receipts").
- **The lifetime is bound to the right authority.** The worker is tied to the exact original signal and deadline, with no renewal, no idle extension, and expiry at the original deadline. Clock-injected guards are excluded. Close must be proved by an observed exit. Together these fit the existing `admitted()` / `lease-budget-mismatch` discipline (L962–968, L1908–1915).
- **The acceptance boundaries are preserved.** The production 30000, stock 15000, portable 5000 and test 800000 ms limits are unchanged. Linux manual review stays excluded. New signed controls need their own registration and class reviews.

The core idea is sound. But the design does not yet show that it will clear the failing operation. It also leaves several lifecycle and routing decisions open, and they must be fixed before planning. Finding 1 is the main gap. Findings 2–5 are decisions the implementation would otherwise have to invent.

Verification limits: this session could run only the two prescribed peer-review commands. I did not run the timing tap or any tests, and I did not inspect hosted run 38108838644 or its logs. I read the source from the working tree, not at artifact commit `09912e9`.

## Findings

1. **Nothing shows that the worker removes enough PowerShell starts to fit the budget.** The design blames roughly 30 s of Windows primary registration on repeated fresh starts of about 330–360 ms each. But a worker only removes a start when two or more probes run inside the same guard and the same original context. The source contains many probe paths that a guard-owned worker would not cover:
   - `observeStorageProtection` and `provisionProtectedRoot` run before any guard exists (`inspect`, L708; provision mode, L228–255). They are called from `primary-admission`, `primary-maintenance`, `runtime-selection-core`, `manual-recovery-resource`, `provider-resource-ports` and `portable-root`.
   - `windowsReplaceFile` (L358) spawns its own separate one-shot script inside the guard's replace path (L1607).
   - Registration opens many separate guards: portable system, selection snapshot, primary authority, primary maintenance, ownership election, provider resource ports and manual recovery. Each new guard would pay a full worker start.
   - `withElectionLease` opens a second, nested guard on the same root (L1916), and that guard would get its own worker.

   The timing tap in `windows-stock-timing.mjs` already records every stock exec. But the design gives no breakdown of how many of the starts happen inside one guard's lifetime, and so how many would go away. Without that count, the change could ship and pass review while registration stays red. That would repeat the outcome the "Alternatives assessed" section attributes to startup optimisations.

2. **The design does not say which probes go through the worker.** The phrase "every request freshly queries…" covers observe mode. It does not say what happens to:
   - (a) provision mode, which runs `Set-Acl`, a mutation;
   - (b) `windowsReplaceFile`, a mutation that calls `ReplaceFileW` from inside a guard;
   - (c) probes before the guard exists;
   - (d) the nested scoped guard from `withElectionLease`. It runs under the election's original context, which may differ from the outer guard's context. The outer guard's worker therefore cannot serve it under the exact-context rule. The design does not say whether the scoped guard gets its own worker or must refuse, or how `scoped.close` proves that worker's exit.

   The design says to "share executable startup and fixed script loading only". If mutations or a second script also move into the resident process, the trust argument changes, so the scope has to be explicit.

3. **The design does not say what happens to the worker after a request fails.** The refusal list says which outcomes are rejected. It does not say what state the worker and guard are left in afterwards. Cases:
   - (a) The 15000 ms per-request limit expires while the original deadline still has time left. Unlike one-shot `execFile`, nothing kills the process automatically.
   - (b) The script reports an exception through its existing error frame (exception / line / stage, L295). Today that frame comes with `exit 1`. In a loop, the script could either keep running or exit.
   - (c) A malformed frame, or a frame with the wrong request identifier, arrives.

   In each case, a late or partial frame from the abandoned request could later be read as the answer to a new request. The design should require that any non-success outcome ends the worker (terminate, then observe exit). It should also decide whether a guard may start a replacement worker within the same original context after a proved exit, or must fail closed for the rest of that context. "No replacement worker starts while an earlier close is unproved" covers only the unproved case. With a proved exit, unbounded replacement would reintroduce per-request starts and become a retry loop, which the no-retry posture forbids (`retrySafe: false`, L1022).

4. **Concurrent requests: queue or refuse is not decided.** "Permit one request in flight" changes today's behaviour. Each `windowsProbe` call now spawns its own process, so concurrent guard operations (`read`, `verify`, `readSnapshot`, credential `snapshot`) each get an independent probe. The design must choose:
   - **Serialise:** queued time counts against the same original deadline, and abort or expiry rejects every queued request.
   - **Refuse:** a second concurrent request fails with a bounded stale error. In that case the plan must list the existing call sites that may overlap.

   The planned "parallel requests" test cannot be written until this choice is made.

5. **The rule for which guards get a worker is not stated precisely, and the effect of an unclosed guard on the host process is not covered.**
   - (a) `operationBudget` defaults to `deadline = Infinity` (L300). `openProtectedRoot({ receipt })` is often called with no signal or deadline (for example `authority-fence.mjs` L162 and `client.mjs` L101). In those calls the context comes from `admitted()` or is absent. "Unscoped utility guards retain the one-shot query" needs a mechanical predicate. The design should say exactly which context is required: an `AbortSignal` plus a finite deadline within the production 30000 ms ceiling, taken from `admitted()` or from the explicit original context, and no injected clock. Every other guard stays one-shot.
   - (b) A resident child with an open stdin pipe, plus an expiry timer, keeps the Node event loop alive until the deadline. Today, a guard that is never closed holds only a directory handle and does not delay process exit. With this change, a guard leaked on an error path would hold the CLI process open for up to about 30 s. If the child or timer is instead `unref`'d, Node can exit and orphan the child. Windows does not kill child processes when the parent dies.
   - (c) If the parent crashes, the script must treat end of stdin (`ReadLine()` returning `$null`) as a definitive exit, including when it is mid-loop. The acceptance gate "startup/crash/original-PID absence" depends on this, and no test asserts it.

6. **The design does not say where a change of context is detected, or how close behaves after expiry.** The `budget` re-reads `admitted()` on every check, so the current context can change underneath a retained guard. The design states the rule (close the old worker and prove its exit before building one for a new context) but not where it runs. It should run on every request, before writing a frame. The worker's bound `{signal, deadline}` should be compared by identity with `admitted() || {signal, deadline}`. Close must also work after the deadline has passed and after abort, so it must not depend on `budget.check()`. Today `guard.close()` calls `admitted()` first (L2030), and that call can throw `lease-budget-mismatch` before any cleanup runs. The worker's termination and exit check must not be skippable by that throw.

## Required changes

1. **Add a quantified effect estimate (Finding 1).** Use the existing stock-exec timing tap on the failing ordinary and limited token registration. Classify every PowerShell start as one of:
   - (i) a repeat inside one guard and one original context, which the worker removes;
   - (ii) the first probe of a guard or context, which still pays a worker start;
   - (iii) outside any guard: observe, provision or `windowsReplaceFile`.

   State the predicted number of starts and the predicted time after the change, and set a falsifiable acceptance threshold against the original budget. If the prediction shows the worker alone is not enough, name what else is in scope, or narrow the stated intent.
2. **State the routing scope explicitly (Finding 2).** Say that observe mode only goes through the worker. Say that provision and `windowsReplaceFile` stay one-shot (or justify moving them). Say that probes before the guard exists stay one-shot. Define how `withElectionLease` scoped guards get, refuse or close a worker.
3. **Specify what happens after a failure (Finding 3).** Any per-request timeout, error frame, malformed frame, identifier mismatch, stderr output or early end of output must terminate the worker and wait for an observed exit. Decide and state whether a replacement worker is allowed within the same original context after a proved exit. Recommended: no replacement; the guard falls back to fail closed, or to one-shot queries, for the rest of that context.
4. **Choose serialise or refuse for concurrent requests, and give its deadline and abort semantics (Finding 4).**
5. **Define which guards get a worker as a mechanical predicate, and cover unclosed guards and parent loss (Finding 5).** State the event-loop and `unref` policy for unclosed guards. Require the script to exit when stdin ends. Add a test that kills the parent and observes that the child exits. If the event-loop policy needs a backstop, add one, for example a Windows job object with kill-on-close, or a statement that leaked guards are a defect that callers must prevent.
6. **Specify where context changes are detected and how close behaves after expiry or abort (Finding 6).** Worker termination and exit observation must run even when `admitted()` throws or the budget has expired.

## Optional suggestions

1. **Separate this design's scope from Task 5 as a whole.** The intent says "Finish Task 5", but the design addresses only the Windows registration failure. Two other failures stay open with no design:
   - Linux and macOS startup over budget. macOS still spawns per-probe `macAclBatch` processes.
   - The expiry of the local submission guard before its policy-generation refusal (the "millions of fresh filesystem checks" profile).

   Saying plainly that this document closes only the Windows startup cost would stop a reader from taking it as the Task 5 completion design. The Verification section already avoids inferring Linux/macOS completion.
2. **Consider moving the generation race fix into its own change.** The metadata and ancestor race fix after decoding is a real, separately reproduced defect with its own RED/GREEN tests. Because it is unrelated to process lifetime, a separate change keeps the worker's producer closure and class recapture independent of it.
3. **Add framing details to the closed-schema section.**
   - Flush explicitly after each frame. Do not rely on `Console.Out` auto-flush.
   - Strip or refuse a leading BOM on each frame. Today's parser strips `﻿`.
   - Keep the per-response byte bound no larger than the current `maxBuffer` of 1 MiB.
   - Keep the per-request check `records.length === targets.length` and the path-order check (L452–458).
   - Remove the abort listener when the worker exits.
4. **Report two numbers from the hosted equivalence test.** Record the warm per-request latency and the cold first-request latency, so that a later regression in the script's fixed loading cost can be seen.

## Decision

revisions-requested
