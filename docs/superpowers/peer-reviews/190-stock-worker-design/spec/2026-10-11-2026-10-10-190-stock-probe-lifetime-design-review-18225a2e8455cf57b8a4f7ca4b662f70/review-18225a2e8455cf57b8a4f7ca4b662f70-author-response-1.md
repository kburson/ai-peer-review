<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-18225a2e8455cf57b8a4f7ca4b662f70"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-10-190-stock-probe-lifetime-design.md"
artifact_commit: "09912e94a3eaf2376738cf90a8471ec2a7e55464"
artifact_blob: "4b2e5ac9166560badbbd059b120ce9c8c768bd3a"
artifact_digest: "sha256:29b5a7e9d05dd5ca1ea6fb77bff596c99999c93b430f43db740433da8f39a2a4"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6.1-sol"
  model_display: "gpt-6.1-sol"
  session_fingerprint: "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
  identity_source: "runtime"
started_at: "2026-10-11T03:58:39.910Z"
submitted_at: "2026-10-11T13:39:37.374Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

This revision preserves the original Windows observation trust boundary and budgets, specifies routing, failure poisoning, queue/context/cleanup ownership, and adds actual #198 hosted lifetime counts. It narrows the document's intent to conditional protocol feasibility: measured evidence does not admit a worker or prove complete Task5 recovery. #198 is now a standalone prerequisite delivered to trunk, with #190 still under #171.

## Finding dispositions

1. **Quantified effect estimate — addressed with a conservative refusal and narrowed intent.** Genuine hosted run38141012308, collector89f87ac and fixed candidate40a3e27 provide all ordinary/limited Node24/26 counts. The revised table distinguishes retained first starts, removable repeats, outside/ambiguous calls and predicted residual starts. It records the exact elapsed refusal. No independent startup-saving lower bound or complete successful trace exists. Consequently the defensible predicted prefix saving is zero and all four numeric time predictions exceed30000ms. The table's per-repeat threshold describes only the prefix overrun; it cannot claim unseen work will complete. As the required change explicitly permits narrowing intent when the worker does not prove enough saving, this design now defines conditional protocol feasibility. A separate unverified cold/warm/equivalence probe and conservative complete-operation margin must pass before worker implementation. An accepted specification would approve the protocol and gates, not declare them satisfied or authorize production activation.

2. **Routing scope — addressed.** Only observe requests from an eligible genuine retained guard may use the conditional worker. Provision mode, Windows replacement and pre-guard probes remain one-shot. `withElectionLease` owns another guard/worker under its own original context; its close must prove that particular child's exit. Equal root paths do not share a worker.

3. **Failure state — addressed.** Every non-success outcome poisons the exact original context, terminates the directly owned child and requires observed exit. A script exception exits nonzero after its bounded frame. No replacement worker, one-shot fallback or retry occurs within that poisoned context even after proved exit, so stale frames cannot become another request's answer. Uncertain cleanup remains an obligation.

4. **Concurrency — addressed.** A bounded queue of at most64 pending requests serializes a single in-flight request. Queued time consumes the original deadline. Abort/expiry reject all queued requests from that context. Another context cannot displace an in-flight request; old-child exit must be proved before any new context worker.

5. **Eligibility, leaked guards and parent loss — addressed as mechanical rules and a hard feasibility gate.** Resolve the original context from admitted scope or the explicit signal/deadline; require a real AbortSignal, finite future deadline within30000ms and no injected clock. Others stay one-shot. Keep child and original expiry timer referenced; no unref orphaning. Every caller must close in success/error paths; leaked guards are defects whose child terminates at the original deadline. The stock script must exit on stdin EOF, including independent proof of parent death during a query and while idle. The revision does not claim a stock-only mid-query mechanism is already implemented or proven: failure of that test makes the proposal infeasible and forbids production. No native job-object backstop/build is introduced.

6. **Context changes and expired close — addressed.** Compare exact current signal identity and absolute deadline before every frame. Old-worker exit must be proved before a different original context can obtain a worker. Termination and independent exit observation must run even if admitted lookup throws or budget checks fail after expiry/abort. Cleanup confers no renewed query/effect authority; directory/file withdrawal and retained obligations remain.

## Changes made

The artifact adds explicit routing, fail-closed poisoning, bounded serialization, mechanical eligibility, referenced lifetime policy, parent-loss feasibility testing and cleanup independent of admission checks. It adds an exact real hosted four-row measurement table, separately pinned collector and candidate, residual-start calculation, zero-saving time prediction and explicit refusal-prefix censoring. The intent and implementation admission gate are narrowed so an unproved performance fix cannot proceed under an accepted protocol specification.

Optional framing suggestions are included: explicit flush, at most one BOM, current1MiB bound, complete records/path-order checks, disposal of fresh identity objects and removal of the abort listener on exit. Cold first-query and warm-request timings are required from the separate future equivalence probe. Existing generation-race fixes remain separately inventoried production changes and historical source classes are not revived by this documentation.

## Declined changes and rationale

No genuine Windows job object/native descendant backstop is added: native builds and unproved operational guarantees are forbidden. Parent-loss proof is instead a hard production feasibility gate. No positive saved-time estimate or completed unseen work is invented from the count data. The local metadata/ancestor race fix remains in the current reviewed source history with its independent RED/GREEN evidence; splitting it retroactively would disturb preserved source/class/protocol provenance, so any final candidate still inventories those bytes and recaptures its actual contract.

## Verification

#198's real Windows workflow38141012308 has four successful actual collection jobs. Authenticated downloaded artifacts pin producer89f87ac5e5c7134881560c97b584b450bc34e52b, candidate40a3e279d551719416eb750974fe30d011d6a37a, exact Node versions, release, token category, run/attempt/job and closed fields. Full hosted CI38141015753 passed all required jobs; its actual fast/slow logs and receipts were downloaded and independently verified against the exact source/merge tree. Affected64 tests plus the focused packaging coverage test passed, lint/format/extraction checks passed, and #198 passed native Test/Review/approved delivery/close. Fresh whole-branch review found three Important defects in #198; each was repaired with regression coverage before its final hosted success. PR199 merged as849ab91d585170b9f634f05a28ce41b8663ba910 and #198 is Closed/Done. No worker, current e4 source class, manual journey or #190 completion is claimed. A redundant legacy DoD stamp briefly launched host suites despite existing Test receipts; it was stopped, preserved and excluded from delivery evidence. No further host full suites are permitted.
