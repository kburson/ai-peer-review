<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-bd65fa3d0a76ec9f39a096656662a981"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-21-88-provider-authority-broker-reconciliation.md"
artifact_commit: "01bb4775eaf6385028ece41a047f04f48f79759c"
artifact_blob: "810718b7cb22c7f52b6d97948a6b3e96d9b5f3a7"
artifact_digest: "sha256:f2b9552864c7d5d708022c3434c992a80e92164c80d3b55aa7642702114ad753"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "gpt-6-astra"
  session_fingerprint: "sha256:706896de9db444dc4253481b351e0923eca8a5010ba54289015855215aba2814"
  identity_source: "runtime"
started_at: "2026-09-21T10:40:41.445Z"
submitted_at: "2026-09-21T10:42:42.644Z"
finding_ids: ["R1-F001","R1-F002"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Reviewed the exact sealed #88 implementation plan against its linked amendment and the current startup, broker worker/service, provider adapter, coordinator, and submission interfaces in the invitation's physical worktree. The plan addresses the three original defects and specifies useful evidence, resource ownership, and installed-release gates. Two Important gaps remain in the executable lifecycle: the factory requires a reviewer binding before the operation that creates that reviewer, and the ordinary author submission still invokes manual takeover. These must be resolved before implementation approval.

Verification was read-only source and plan inspection. No Git commands, implementation edits, tests, live provider probes, or task-state operations were performed. The exact installed 0.3.0 CLI passed manual doctor and joined successfully after the earlier 0.2.2 schema mismatch. Identity metadata was verified against this Codex task's official context and supplied to the CLI as an environment declaration; this is review-session identity evidence, not a positive provider-conformance result. Normal commit mode is recorded by the protocol; Human Authority assurance is unavailable in the generated response metadata.

## Findings

### R1-F001 — Important: Define a launch-capable bootstrap state before requiring both participant bindings

**Plan location:** Task 2 line 94; Task 5 lines 161–166; Task 4 lines 125–129. Paths and line numbers refer to `docs/superpowers/plans/2026-09-21-88-provider-authority-broker-reconciliation.md`.

Task 2 creates the reviewer binding only at authenticated join. Task 5 requires the production factory to load both bindings and current role observations before capability promotion, and states that a nonconformant/recovery-only worker cannot execute launch. The same factory is required for first registration and restart. On a new review the reviewer has not been launched or joined yet, so there cannot be a sealed reviewer participant/binding to load. The plan therefore makes reviewer launch depend on the result of reviewer launch. Supplying a pre-created reviewer fixture can hide this dependency.

The current source confirms the order that the implementation must accommodate: `src/startup/runtime.mjs:277–304` registers and awaits the broker before reaching launch; `src/broker/service.mjs` constructs and starts a worker during registration. Its `settleWorkers` closes/removes recovery-only workers. The existing `src/broker/worker.mjs` also classifies launch-pending as recovery-only. Merely adding `launchReviewer` to a fully bound worker leaves the fresh-start path unavailable, and a coordinator observation that requires both participants can fail before join.

**Required correction:** Specify distinct validated bootstrap and fully bound delivery states. Bootstrap may launch exactly the sealed reviewer selection using verified author evidence, pinned runtime, proven reviewer surface, resource ownership, and durable launch intent, without claiming that a reviewer session already exists. State how launch acknowledgment/current-session evidence and authenticated join create the reviewer binding, how the existing worker becomes delivery-capable, and when coordinator delivery starts. Preserve an in-flight bootstrap worker without interpreting expected missing reviewer binding as manual recovery. Fully bound wakes must still require both exact role bindings. Define restart behavior before launch, while the launch is reserved/unknown, and after join; do not invent a binding or retry an ambiguous operation.

**Decisive test:** Through the installed production assembly, start from an author binding and no reviewer participant/binding. Verify exactly one leased launch, authenticated join and submit while launch is deferred, transition to both-role delivery, and the first author wake. Add restarts before join and after join, proving no duplicate launch and no recovery-only eviction caused solely by the expected pre-join state.

### R1-F002 — Important: Ordinary author submission must also avoid manual takeover

**Plan location:** Task 3 lines 101 and 118; Task 4 line 127.

Task 3 explicitly removes `fenceRegisteredDelivery` only from `submitReviewTurn`, which is the reviewer submission function. The separate `submitAuthorTurn` still calls that helper at `src/cli/run.mjs:3177`. For broker-owned non-manual reviews, the helper at lines 2717–2724 calls `fenceManualRecovery`. In `src/broker/client.mjs:212` onward, that path persists manual suspension, asks the broker to suspend the worker, and publishes the recovery fence.

Consequently, after the first automatic reviewer-to-author handoff succeeds, the author's normal revision submission still tears down/fences automatic delivery before handing back to the reviewer. This directly defeats Task 4's required author-response-to-reviewer wake. A test that appends synthetic author events rather than calling ordinary CLI submission would miss it; the proposed single reviewer-to-author live receipt would also pass without demonstrating this return path.

**Required correction:** Cover ordinary authenticated submissions by both roles in Task 3. Explicitly update `submitAuthorTurn`, including its handoff retry/recovery branch, to distinguish normal protocol progress from an explicit manual takeover. Preserve the author's claim, artifact/response integrity, Git transaction, revision, and operation/session ownership requirements. Retain fencing for explicitly requested recovery/takeover, and audit the other lifecycle entrypoints used by the automatic flow for the same distinction. Add the source/test changes to the task's serial green checkpoint.

**Decisive test:** Drive reviewer revisions-requested, ordinary author CLI submit, and reviewer wake through the broker and role bridge. Assert no manual-suspension or recovery fence is created by either normal submit, the worker remains resident, and one exact return wake occurs. Exercise author submit racing explicit takeover and replay of an already submitted author turn, retaining fail-closed fencing and duplicate-delivery protection.

## Required changes

1. Resolve R1-F001 in Tasks 2–5 with an explicit bootstrap-to-bound worker lifecycle and installed fresh-start/restart coverage.
2. Resolve R1-F002 in Task 3 and the Task 4/5 integration coverage so both normal participant submissions preserve automatic delivery.
3. Update the acceptance map to reference these two decisive production-path tests. Keep the existing conformance, provider-budget, unknown-outcome, legacy, and release gates intact.

## Optional suggestions

None.

## Decision

revisions-requested
