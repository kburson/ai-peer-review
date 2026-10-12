<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-071af055aa2f80405afeda08da8cafed"
role: "reviewer"
turn: 6
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-12-209-portable-reconciliation.md"
artifact_commit: "ecca467107458a7d443d81750a6766bbb0efce29"
artifact_blob: "b5aa896a5783923bd38ea0ad0436746c95efe402"
artifact_digest: "sha256:c9f6a44fbb45a477503a6b54675f5253afd567e96206f8075210a09eb72a75a8"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:bb08761a852bbd80b75a86caf1b80d91ada22393fa0b77ab36d3c9e1b3c243a7"
  identity_source: "runtime"
started_at: "2026-10-12T19:21:54.010Z"
submitted_at: "2026-10-12T20:22:10.071Z"
finding_ids: ["R6-F001","R6-F002"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-checked the revised plan at `ecca467` against the accepted spec and the tree. All round-5 findings are resolved.

| Finding | Status | What the revised plan does |
| --- | --- | --- |
| R5-F001 | Resolved | Task 2 now requires current genuine C1 protection of the review workspace, from the settlement producer, before a settled manual resource stops blocking. It adds a RED case: an ordinary `0755` workspace with every other field matching stays a blocker. |
| R5-F002 | Resolved | The wired production `observePortableReconciliation` stays non-clear through Task 2, and only the explicitly unverified pure classifier may return clear. The Task 2 commit is renamed `[#209] Prepare guarded reconciliation without enabling production clearance`, and it must verify a real production-path refusal at that commit. Task 3 enables the first production clear together with all the bindings in one atomic change (see below). |
| R5-F003 | Resolved | Task 3 adds the files `bin/peer-review-broker.mjs`, `src/broker/client-core.mjs` and `src/cli/run-core.mjs`, a closed allowlisted child-failure projection and decoder, and three no-live-broker CLI controls (see below). |
| R5-F004 | Resolved | Task 1 adds ordinary `0755`-tree controls and pins the exact limits and reason codes. |
| R5-F005 | Resolved | Task 3 names both publication assertions, and a mutation between them must be refused by the second one. |

The R5-F002 atomic change in Task 3 covers:

- the assertions at quarantine/create, before `publishEndpoint` and before `lifecycle.publish`;
- the exact initial registry set;
- restoration mode and receipts;
- the inert legacy key.

The R5-F003 decoder carries only allowlisted reasons and obligation names, never stderr text, paths or private values. It keeps the actual child exit and the original deadline, and it separates refusal from recovery. The three CLI controls are:

- a clean stop after an `outcome-unknown` launch reaches the existing-only producer;
- an active-review crash reports the exact provider and coordinator names;
- an unavailable probe reports `existing-effect-reconciliation-unproved`.

The file and target references hold in the tree. `src/broker/client-core.mjs` is the readiness orchestration, which currently collapses a child exit into `broker-process-exited-before-readiness` → `broker-startup-incomplete` (`src/broker/client-core.mjs:63-82`). `bin/peer-review-broker.mjs:61-67` is the child's generic stderr line. The plan's sequence of tasks and commits now keeps every intermediate commit at least as safe as the spec. Its Completion Contract also states the narrowed capability and the #210 dependency accurately.

I found no remaining defect that requires a plan change.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R6-F001 — Name the transport from child to client for the failure projection

The plan says what the projection carries, but not how it travels. If it goes over stderr, specify a single closed line grammar, and say the decoder ignores anything that does not match. If it is a file, it must sit within the accepted closed `broker` vocabulary as an exact repository-produced diagnostic name, beside `bootstrap-<uuid>.json`. It must confer no effect authority. It must also be either cleaned up by its producer or counted in the inventory, so it cannot become a new `reconciliation-namespace-unproved` blocker on the next startup.

### R6-F002 — Keep the generic readiness reasons as the fallback

When the child's projection is absent, malformed or not allowlisted, the decoder should keep today's `broker-process-exited-before-readiness`/`broker-startup-incomplete` reasons (`src/broker/client-core.mjs:77-81`) and never infer a more specific blocker. Add one control in which a child exits with an unparseable projection.

## Decision

accepted
