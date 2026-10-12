<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-071af055aa2f80405afeda08da8cafed"
role: "reviewer"
turn: 5
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-12-209-portable-reconciliation.md"
artifact_commit: "c69296b239ba1307fe714342817078cf8fe989a2"
artifact_blob: "16e3c008802774e793e8e1183e05132355170f73"
artifact_digest: "sha256:577f4554b0220626bcba3edee42b5787e8cb3c86e646155513687f3238c518a2"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:bb08761a852bbd80b75a86caf1b80d91ada22393fa0b77ab36d3c9e1b3c243a7"
  identity_source: "runtime"
started_at: "2026-10-12T19:21:54.010Z"
submitted_at: "2026-10-12T20:17:34.886Z"
finding_ids: ["R5-F001","R5-F002","R5-F003","R5-F004","R5-F005"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

This turn reviews the implementation plan `docs/superpowers/plans/2026-10-12-209-portable-reconciliation.md` at `c69296b`, against the accepted specification (phase 1, final `f013b48`) and the tree. The plan follows the spec's structure:

- **Task 1** covers inventory under each store's actual mechanism.
- **Task 2** covers the classifier, the observer, and the pre-creation recovery built from the extracted `portable-participant-binding.mjs` and `portable-existing-effect-reconciliation.mjs`. It writes under a per-review `withOperationAuthority({operation:'broker.reconcile',cwd,reviewWorkspace,signal,deadline})`, which picks up R4-F001, and it uses the clean/idle-stop `outcome-unknown` GREEN scenario from R4-F002.
- **Task 3** binds owner effects, the restoration receipts, publication-deferred coordinators, and the crash-refusal control.

The Completion Contract repeats the narrowed capability and the #210 dependency accurately.

Three gaps need fixing before execution:

1. The plan drops one manual-settlement condition from the accepted spec.
2. The Task 2 commit would make portable startup able to return `clear` before Task 3 adds the owner-effect, restoration and deferral protections. That commit sequence is weaker than the spec.
3. The plan has no task or control for the spec's `broker reconcile` outcomes. In the current tree, the broker child process cannot report those bounded reasons to the CLI at all.

## Findings

### R5-F001 — Task 2 leaves out the accepted protected-workspace condition for manual settlement

Location: Task 2, the classification step ("Settled manual resources require the exact durable fence hash and withdrawn election, without deleting the durable record").

The accepted spec ("State classification and restoration", paragraph 4, added for R3-F004) makes a settled manual resource nonblocking only when "the original settlement producer's genuine C1 protection on the review workspace is still verified". Ordinary `0755` review workspaces "cannot prove that settlement and remain blockers". The producer reads `manual-fence.json` through `observeProtection`/`openProtectedRoot` on the workspace (`src/broker/manual-recovery-resource.mjs:170-176`).

The plan's policy step and its table-driven RED list omit this condition. An implementation could therefore accept an ordinary-workspace fence hash as proof of settlement, which the spec forbids.

### R5-F002 — The Task 2 commit makes production startup able to return `clear` before Task 3 binds owner effects and restoration

Location: Task 2, steps 3 and 7 ("Implement the fixed observer…", "Replace the old permanent-unavailability assertion…", commit), and Task 3.

At the end of Task 2, `observePortableReconciliation` can return a genuine `clear`. The production core accepts any `status === 'clear'` with zero obligations and goes straight on to quarantine and create (`src/broker/portable-ownership-core.mjs:166-204`). It is wired directly through `preparePortableOwner` (`src/broker/portable-ownership.mjs:546-547`).

But that commit does not yet contain the protections Task 3 adds:

- the assertions before quarantine/create, `publishEndpoint` and `lifecycle.publish`;
- `readPreparedPortableRegistrations`. Without it, the service still restores workers from an independent `reconcileRegistrations` enumeration (`src/broker/portable-service.mjs:105-106`);
- restoration mode, without which `worker.start` still launches coordinators and wakes before publication (`src/broker/worker.mjs:160-169`);
- removal of the empty callback (`src/broker/portable-service.mjs:88`).

The `[#209] Reconcile real portable registry and effect obligations` commit is therefore a buildable, bisectable state in which portable startup succeeds without the spec's restoration and publication guarantees. Run with an installed source class, it would show exactly the pre-publication wake and unbound-registration behavior that R2-F001/R1-F002 rejected.

### R5-F003 — No task or control covers the spec's `broker reconcile` outcomes, and the broker child cannot report its bounded reasons to the CLI

Location: the accepted spec's "Bounded pre-creation recovery", paragraph 4, against the plan's Tasks 2–3 (files and controls).

The spec requires three outcomes for `peer-review broker reconcile <workspace>` when no broker is live:

- it reaches the bounded pre-creation route through `ensureBroker`;
- it reports retained provider/coordinator generations as exact operator obligations;
- if the probe is unavailable, it returns `existing-effect-reconciliation-unproved` with an exact retained obligation, and repeating startup is not reported as recovery.

In the tree, `ensureBroker` starts the separate `bin/peer-review-broker.mjs` process. On any startup failure, that process writes only `${error.code}: Portable broker startup or cleanup failed.` to stderr and exits with status 1 (`bin/peer-review-broker.mjs:61-67`). Neither `details.reason` nor the bounded obligations reach the CLI. On the CLI side, `brokerCommand` simply rethrows whatever `prepareRecordedClient` produces (`src/cli/run-core.mjs:4788-4806, 4819-4824`).

The plan touches neither file and has no control for this route. As planned, the user-visible part of the R2-F002 and R3-F001 resolutions would be missing. An operator running `broker reconcile` after an `outcome-unknown` clean stop, or after an active-review crash, would see only a generic `APR_BROKER_START_FAILED`. They could not tell a #210 provider blocker from a coordinator blocker or a missing probe. If a later route also retries, repeated startup might be reported as recovery.

## Required changes

1. (R5-F001) In Task 2's classification step and its RED table, add the condition that the settlement producer's genuine C1 protection on the review workspace is currently verified. Add a RED control in which a settled manual resource whose review workspace is ordinary `0755` remains a blocker even when the fence hash, review/request identity and withdrawn election all match.
2. (R5-F002) Make every commit at least as safe as the spec. Either:
   - keep the production composition non-clear through Task 2, with the observer able to produce `clear` only through the pure, unverified classifier, and enable production `clear` in the same Task 3 commit that binds the owner-effect assertions, `readPreparedPortableRegistrations`, restoration mode and callback removal; or
   - reorder so that Task 3's bindings land before, or together with, the production observer's first `clear`.

   Add a check at the Task 2 commit that the production path still refuses portable startup.
3. (R5-F003) Add the broker entrypoint and the CLI broker-command path to the Task 3 files (`bin/peer-review-broker.mjs`, plus the `ensureBroker`/`brokerCommand` client path in `src/cli/run-core.mjs` or wherever readiness failure is surfaced). Specify a bounded, non-private channel, for example a closed reason code plus obligation names, with no paths beyond the existing contained review workspace and no nonce or credential data. It must carry `existing-effect-reconciliation-unproved`, `provider-resource-retained`, `coordinator-generation-retained`/`review-lock-retained`, `review-initialization-unproved` and the reconciliation overflow/deadline/abort reasons from the child to the `broker reconcile`/`broker status` result.

   Add production-used controls through the real CLI route with no live broker:
   - (a) an `outcome-unknown` launch after a clean stop reaches pre-creation reconciliation and reports its exact outcome;
   - (b) an active-review crash reports the exact provider and coordinator obligations, not recovery;
   - (c) an unavailable probe reports `existing-effect-reconciliation-unproved` with no retry reported as recovery.

## Optional suggestions

### R5-F004 — Give ordinary-namespace enumeration its own RED tests in Task 1

Task 1's RED example exercises only `guard.listOrdinaryEntries()` on a C1 root. Add matching RED tests for the separate retained ordinary-directory enumeration over a public `0755` review tree:

- replace, add or remove a member across an await;
- a symlinked ancestor or child;
- a hardlinked authority file;
- an unknown child name that yields `reconciliation-namespace-unproved`.

Also state the spec's exact limits (4096 entries, depth 16, 1048576 bytes per file) and the reason codes `reconciliation-inventory-overflow`, `reconciliation-deadline` and `reconciliation-aborted` in the tests, so they are verified, not merely implied.

### R5-F005 — Name both publication assertion points in Task 3

Task 3, step 2 says "bind the private observation at the production quarantine/create/publish closures". The spec requires an assertion immediately before `publishEndpoint` and again immediately before `lifecycle.publish`. Name both points and add a control that mutates a store between the two, so the second assertion is proved to exist.

## Decision

revisions-requested
