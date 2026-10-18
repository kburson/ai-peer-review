---
record_kind: manual-same-agent-sar-review
round: 3
reviewer_commit: 9130dc6fa73f80b89ddc67c4f29f055f52d08600
input_revision: issue-222-plan-r4
input_sha256: fb9c289d19584310306ea4bb2e956143785b24dfb043fc9a7860ac3dc6ec0261
requested_model: gpt-6-astra
requested_effort: high
---

# Round 3 interface review

Decision: changes required for one remaining mechanical interface mismatch. The same-agent review rechecked all specification coverage, generated graph and changed ownership boundaries after round 2.

## R3-F1 — Medium: publication operation signatures omit durable context

Task 14's proposed `reservePublication({state,expectedRevision,publisherSession})` and `releasePublication({state,reservation,outcome})` accept a caller-provided state but promise durable, authenticated transitions under the existing writer. Current `withReviewLock(workspace, operation, options)` and store APIs require the bound workspace; a pure reduced state does not supply that context or fresh authority. The new external contract also exposes report/reconcile actions without named corresponding internal operations.

Define all four workspace-bound operations, shared request/session/reservation/expected-revision fields, fresh journal reload under the writer lock and exact retry behavior. Keep `canOpenReviewerTurn(state)` only a pure predicate: the authoritative turn-open event must be appended under the same lock before provider launch, otherwise a successful predicate followed by an unlocked launch still races publication reservation. Launch failure or uncertainty retains the recorded pending/open state for supported recovery; it cannot reopen the publication window by inference.

Earlier corrections remain present. This finding does not require new source behavior beyond the accepted coordination design; it makes the implementation interfaces and race test precise. The forecast/dependency graph is unchanged.
