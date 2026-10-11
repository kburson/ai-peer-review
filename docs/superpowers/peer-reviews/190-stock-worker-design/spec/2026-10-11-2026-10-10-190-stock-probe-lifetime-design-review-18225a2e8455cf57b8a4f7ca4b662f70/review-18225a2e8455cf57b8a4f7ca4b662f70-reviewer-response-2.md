<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-18225a2e8455cf57b8a4f7ca4b662f70"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-10-190-stock-probe-lifetime-design.md"
artifact_commit: "326db5436e59df93c3d62b438cfdc3635504b92a"
artifact_blob: "b098b06f598a35f7e69e738eb588efb3812af5bb"
artifact_digest: "sha256:0f004721b61517ef7a18813b52881c2a705b6e3d6ab7e7cb8786b8f3577673e1"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:e06758fc422edd565e535b2e083d57a5c2fd3df3c44cd3195b89ee1ecbb34cac"
  identity_source: "runtime"
started_at: "2026-10-11T03:59:30.838Z"
submitted_at: "2026-10-11T21:43:59.967Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised artifact at commit `326db54` (blob `b098b06f…`) against my turn-1 findings and the author's turn-1 response. I also re-checked the new text against the current `src/broker/storage-protection.mjs` (`operationBudget` L299–326, `openProtectedRoot`/`admitted()` L961–969, `withElectionLease` L1908–1926, `guard.close()` L2029–2049, `windowsReplaceFile` L358/L1607, provision mode L228–255).

The revision changes what the document claims to do. It now defines a conditional Windows observation-worker protocol and an admission gate for it. It no longer claims a Windows budget repair or Task 5 completion (L5–7, L31–34, L158–177). Given the measured counts, this is the honest scope: the evidence does not yet show that a worker removes enough starts. An accepted spec would therefore approve the protocol and its gates, not their satisfaction. Lines 175–177 say so plainly.

How each turn-1 finding was handled:

1. **Quantified effect estimate — resolved by a stricter gate and a narrower intent.** The new table classifies every start in hosted run 38141012308 (collector `89f87ac`, candidate `40a3e27`) across Node 24/26 × ordinary/limited. I checked the arithmetic in every row:
   - Starts = First + Repeat + Outside: 7+23+36=66, 7+24+37=68, 7+24+37=68, 7+18+32=57.
   - Residual starts = First + Outside: 43, 44, 44, 39.
   - The per-repeat column, `ceil((elapsed − 30000) / repeat)`: 266/23→12, 253/24→11, 249/24→11, 278/18→16.

   The design sets the startup-saving lower bound to zero until an independent cold/warm measurement exists. It does not subtract the whole query duration, and it treats the prefix as censored at the refusal. All three choices are correct and conservative. The table also confirms my turn-1 concern: about 55% of starts happen outside any guard or cannot be classified, and the worker cannot remove those. So the gate's conclusion that the current evidence fails is the right one.
2. **Routing scope — resolved (L61–65).** Only observe mode goes through the worker. Provision, replacement and probes before the guard exists stay one-shot. A `withElectionLease` scoped guard owns its own worker under its own exact context, and its close must prove that child's exit. Equal root paths never share a worker. This matches the source: a scoped guard is a second `openProtectedRoot` call with the election's original context.
3. **Failure state — resolved (L94–99).** Every non-success outcome poisons the exact original context. The worker is terminated and its exit must be observed. No replacement worker or one-shot retry is allowed in that context, even after a proved exit. A script exception emits its bounded frame and then exits. This closes the late-frame aliasing and retry-loop risks, and keeps one-shot failure semantics (a failed probe already fails the operation today).
4. **Concurrency — resolved (L72–77).** Requests are serialised with a bound of 64 pending. Queued time counts against the original deadline. Abort or expiry rejects everything queued, and a new context cannot displace an in-flight request.
5. **Eligibility, leaked guards and parent loss — resolved (L55–59, L114–122).** Eligibility is now a mechanical predicate:
   - the clock was not injected;
   - the context is `admitted() || {signal, deadline}`;
   - the signal is a real `AbortSignal`;
   - the deadline is finite, in the future, and at most 30000 ms away.

   It is re-checked by identity before every frame. That matches the existing `admitted()` behaviour. The child and the expiry timer stay referenced, so nothing is orphaned through `unref`. Parent loss is a hard feasibility gate tested in two states, idle and mid-query, with any failure making the design infeasible. The author declined my optional native job-object backstop because native builds are excluded. That is an acceptable reason, and the hard gate replaces it.
6. **Context change and close after expiry — resolved (L57–59, L67–70, L108–112).** Termination and exit observation run even when `admitted()` throws or the budget has expired. Cleanup gives no renewed query or effect authority.

The optional framing suggestions were adopted (L88–92). Declining to split the generation race fix out of this change is reasonable given the provenance argument. The trust boundary, the freshness rules and the limits (30000/15000/5000/800000 ms) are unchanged from turn 1, where I found them sound.

Verification limits: this session may run only the prescribed peer-review commands and may not use Git or the network. No artifacts from run 38141012308 or CI run 38141015753 are present locally. So I could not independently confirm the measured counts, elapsed times, collector/candidate pins, or the PR 199 trunk commit `849ab91`. I checked only that the table is internally consistent and that it is consistent with the turn-1 source reading. That is enough here, because the spec draws only negative conclusions from the data (the gate fails) and authorises no implementation.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **Name the evidence that can show a complete registration time.** The admission threshold (L168–175) requires a predicted *complete* registration, including work not yet observed. But every hosted run refuses at 30000 ms, so the second half of registration has never been traced. The spec does not say how its start counts will ever be obtained. One example: an explicitly unverified, read-only diagnostic collection of the full operation under the existing 800000 ms test limit, using the #198 collector, that grants no authority and is used only to count and classify starts. Naming the source, or stating that the gate is currently unsatisfiable until one is approved, would stop the gate becoming an indefinite block, or being met later by ad-hoc extrapolation.
2. **Make the 15000 ms per-request window explicit with respect to the queue.** L48–49 limits each request to the lesser of 15000 ms and the remaining budget. L73–74 says "no timeout begins anew on dequeue". State whether the 15000 ms cap is measured from enqueue or from dispatch. Also state that overflow beyond 64 pending requests is refused with a bounded stale error, and that poisoning rejects every request already queued in that context.
3. **Fix the wording about leaked guards and CLI lifetime.** L116–117 says a leaked guard means "at most the remaining original deadline until termination, never an extended CLI lifetime". Compared with today, a leaked guard *does* hold the process open until the original deadline. Say "never beyond the original deadline" instead. Then add one verification item that checks every guard-opening path closes on both success and error. For example, the CLI should exit promptly after a refused operation, with no child process still alive.
4. **Bring the Verification section up to date (L197–209).** It still lists only the turn-1 items. Add:
   - the pre-implementation cold/warm/equivalence probe;
   - eligibility-predicate tests;
   - queue bound and deadline tests;
   - context-poisoning tests (no retry after a proved exit);
   - parent-loss kill tests, both idle and mid-query;
   - close tests after expiry and after `admitted()` throws.

   Also label the hosted full-registration items as post-admission only.
5. **Cosmetic.** L7 overruns the wrapped line width that the rest of the document uses.

## Decision

accepted
