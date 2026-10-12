<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-071af055aa2f80405afeda08da8cafed"
role: "reviewer"
turn: 4
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md"
artifact_commit: "f013b488547d0408a7c301d4f9dbb3c18e450d86"
artifact_blob: "1e6dd764cbbbb02d19fc8f08418ebc5c9fe05a20"
artifact_digest: "sha256:053f48c867ca40506be15a29db513ac28dd81b982b99552a499e8e97c06b91c2"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:bb08761a852bbd80b75a86caf1b80d91ada22393fa0b77ab36d3c9e1b3c243a7"
  identity_source: "runtime"
started_at: "2026-10-12T19:21:54.010Z"
submitted_at: "2026-10-12T20:10:07.372Z"
finding_ids: ["R4-F001","R4-F002","R4-F003"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-checked the revision at `f013b48` against the tree. Every round-3 finding is resolved:

- **R3-F001:** resolved with option (a).
  - The Intent section now limits the delivered capability to three cases: empty stores, clean or idle-stopped stores, and crashes with no registered non-terminal review.
  - It says explicitly that recovery after a crash during an active automatic review is not delivered. #210 is named as a dependency of that recovery.
  - `broker reconcile` reports retained provider and coordinator generations instead of claiming recovery.
  - #190's positive crash/reclaim journey is constrained to match. An active automatic-wait crash must produce an exact refusal.
- **R3-F002:** resolved. `portable-existing-effect-reconciliation.mjs` and an extracted `portable-participant-binding.mjs` build the sealed adapter and binding without a worker. The provider-resource lease that worker construction would otherwise acquire (`src/broker/worker-factory-core.mjs:346-374`) is not acquired. `owner.verify` is replaced by the exact won election `lease.assert` plus `revalidateInstalledProcessSourceAssurance` under the original context. Unchanged provider-store membership and a missing or copied lease are controlled.
  - The existing `reconcileReviewerLaunch` producer runs writes through `performCurrentOperationEffect` (`src/broker/launch-core.mjs:13-27, 232-235`), so it fits the stated fresh #102 effect checks.
  - `bridge.reconcile` needs only the sealed participant binding and adapter selection (`src/broker/provider-bridge.mjs:170-180, 217-231`), which is exactly what the extracted module supplies.
- **R3-F003:** resolved. The coordinator lease's `instanceId`/`nonce` binding to the broker (`src/broker/provider-bridge.mjs:185-187`) is now stated accurately, and conservative retention is kept.
- **R3-F004:** resolved. Manual settlement now also requires the settlement producer's genuine C1 protection on the review workspace, matching `src/broker/manual-recovery-resource.mjs:170-176`. An ordinary `0755` workspace stays blocked.

Across rounds 1–3, the design keeps its conservative stance. It never discharges an effect based on process death, age, PID or heartbeat, and it never accepts callbacks or copied results. Restoration is receipted against actual producer transitions, coordinators and wakes are deferred until publication, and the namespace vocabulary is closed. Where an orphan provider, coordinator or manual blocker has no recovery route, the spec now names the exact blocker and the issue that owns it.

I found no remaining correctness or safety defect that requires a change. The suggestions below are clarifications for implementation.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R4-F001 — Name the per-review #102 authority scope for pre-creation writes

The ordinary worker wraps its mutations in `withOperationAuthority({ operation, cwd, reviewWorkspace })` (`src/broker/worker-factory.mjs:36-41, 51-63`). That scope is what makes the nested fence run `assertReviewAuthority`, which checks containment in the worktree, symlink traversal and the review's own startup context (`src/startup/authority-fence.mjs:184-220, 296-310`).

The spec should say that each per-review pre-creation outcome write uses the same child authority scope bound to that review workspace, not the startup operation's unscoped fence. Otherwise "fresh current #102 effect checks" could be met by a fence that never validates the review workspace.

### R4-F002 — Use a reachable production scenario for the pre-creation GREEN control

Crash-interrupted launches and wakes are now blocked by retained provider or coordinator generations, so the GREEN control for the pre-creation route needs a state that can actually reach it.

One such state comes from a clean or idle stop after a reviewer launch settled to `outcome-unknown`. In that case the worker suspended to `recovery-only` and persisted its `broker/recovery` record, then closed and released its provider leases. Naming this scenario keeps the route from being exercised only by fixtures.

### R4-F003 — Editorial consistency

- The provider row of the authority table still says "now backed by genuine portable protection/guards". The paragraph about the provider chain says the directories "already use genuine C1 guards". Align the two.
- In "State classification and restoration", paragraph 4, the sentence "the record remains intact." starts with a lowercase letter after the inserted manual-settlement text.

## Decision

accepted
