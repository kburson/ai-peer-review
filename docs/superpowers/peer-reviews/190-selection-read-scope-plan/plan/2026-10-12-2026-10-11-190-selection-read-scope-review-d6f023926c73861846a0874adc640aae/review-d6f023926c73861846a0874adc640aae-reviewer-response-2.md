<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d6f023926c73861846a0874adc640aae"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-11-190-selection-read-scope.md"
artifact_commit: "90b720ce641c3566d8a870eb8940929ee3a2fbfa"
artifact_blob: "ff3e37c9bdf4c2149cbe169e5eabb354e05ae044"
artifact_digest: "sha256:ab5ea6e6bacca77763b49042c14f2e5ef8b966e08ab2f4a4aa7eb8f281802ce1"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:85adb2d848d9ea60a54d199ebc5c0b1ed30c31c66c4e9498eda226806afe2d20"
  identity_source: "runtime"
started_at: "2026-10-12T03:18:02.243Z"
submitted_at: "2026-10-12T03:33:28.900Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised `docs/superpowers/plans/2026-10-11-190-selection-read-scope.md` at artifact commit `90b720c`. I read it against my turn-1 findings, the author's turn-1 response, the accepted spec, and the same source boundaries as in turn 1:

- `runtime-selection-core.mjs`: `withStore`, `retryCleanup`, `assertSelected`;
- `primary-maintenance.mjs`: `withRegistrationStore` and `writeRecord`, including provisioning at L122–132;
- `primary-admission.mjs`: context re-freezing;
- `portable-system.mjs`: `openProtectedRoot`'s post-open failure path at L388–397;
- `scripts/generate-process-source-contract.mjs` and the current `process-source-contract-files.json`.

All six turn-1 required changes are resolved:

1. **Real-operation adoption gate (turn-1 Finding 1): resolved.** Task 3 Step 4 is now a mandatory gate before the integration is kept. It runs the actual `register`/`activate` methods with genuine `assertSelectedRuntime` and the genuine primary admission fence ports, scoped and unscoped, on one frozen candidate, on Node 24 and 26, with the original budget. It requires 16 matching admissions, 16 → 1 genuine acquisitions, 32 fresh snapshots, identical observation coverage, attribution of every unmatched call, and actual closure. Its stop rule is explicit: discard adoption, retain the failed results, and do not tune the loop or the threshold. Task 1 Step 5 now says the synthetic loop tests manager mechanics only and is not the adoption gate. Using only the existing internal `selectionScope` core port as the difference between modes fits the spec's explicit-port design and adds no CLI flag or source rewrite.
2. **Port contracts (turn-1 Finding 2): resolved.** The `identity` and `cleanupAcquisition` ports are gone. The caller is now the only identity source: `use(context, tuple, acquire, operation)`, where the first borrower binds a copy and `acquire` is called once, for that first borrower. `noteWitness` and `finalize(context, copiedTuple, witness)` have defined arguments and timing: `finalize` is synchronous and runs only after proved quiescence and close. It never upgrades a poisoned or uncertain entry.
3. **Borrowed `withStore` semantics and cleanup ownership (turn-1 Finding 3): resolved.** Task 2 Step 2 keeps the existing callback → `verify` → context-check order on success. A borrowed call never closes the shared guard. A failure poisons the key and causes no further query. The exported `store.retryCleanup` discharges both the existing one-shot obligations and the manager's obligations, and a control checks that both are reachable through it.
4. **Infrastructure classification (turn-1 Finding 4): resolved.** The effect sink is limited to primary receipt and activation writes. Registration and admission root provisioning is separate observed infrastructure, with a bounded "infrastructure may exist" category. A real control covers provisioning followed by a failure before the receipt write.
5. **Closure update (turn-1 Finding 5): resolved.** The update is now unconditional. The generator and its `--check` mode are named as required Task 2 verifiers. I confirmed that `runtime-selection-core.mjs` is already in the declared closure, so the new import must change the closure.
6. **Executable details (turn-1 Finding 6): resolved.** The RED snippet binds one `const original = context()`. A dedicated ledger path is defined. The acquisition fixture now models both real `openProtectedRoot` outcomes:
   - post-open check fails and close fails, so a `retryCleanup` handle is attached;
   - post-open check fails and close succeeds, so no obligation exists.

The optional turn-1 items (sink idempotence, the post-closure listener refusal control) were also adopted.

Verification limits: as in turn 1, I ran only the prescribed peer-review command. I did not run tests or hosted workflows.

## Findings

None blocking. Minor residual items are listed under optional suggestions.

## Required changes

None.

## Optional suggestions

1. **Align the "Attributed baseline and decision" section with the new gate.** Its third paragraph still says the isolated prototype compares behaviour "on the same immutable diagnostic candidate" and that its failure will "stop adoption". That reads as if the synthetic loop is the adoption gate, which contradicts Task 1 Step 5 and Task 3 Step 4. Say that the prototype is a unit-mechanics check, and that adoption is decided only by Task 3 Step 4.
2. **Clarify the commit order between Task 3 Steps 4 and 5.** Step 4 needs an immutable candidate that already contains the Task 3 integration and the comparison workflow, which implies a commit. Step 5 then commits "after the adoption gate". State that Step 4 freezes a diagnostic commit containing Steps 1–3, and that Step 5 either keeps that exact commit or adds only verification follow-ups. This avoids gating one commit and keeping a different one.
3. **Separate an inconclusive harness from a negative result.** Step 4 treats an unavailable class or metadata the same way as a count mismatch: both discard adoption. That is conservative and allowed. But recording an unavailable diagnostic class or harness as "inconclusive, retained" rather than "failed prediction" would keep the ledger accurate about why adoption stopped.
4. **Typography.** Several numbers still run into adjacent words: "those16admissions", "projects16→1,93.75%", "and2(16−1)=30fewer", "failing40a3", "of16iterations", "Node24 and26 require16", "unscoped16 vs scoped1", "original30s", "parent171", "continue191→171→141→107".

## Decision

accepted
