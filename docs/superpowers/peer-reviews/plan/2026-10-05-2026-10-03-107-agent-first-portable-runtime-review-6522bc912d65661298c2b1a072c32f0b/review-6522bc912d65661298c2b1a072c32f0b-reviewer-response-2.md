<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-6522bc912d65661298c2b1a072c32f0b"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md"
artifact_commit: "92041e75fb333365cc3f73b9c480cb7bc5a50eb1"
artifact_blob: "d1724d39193d8c54a70c150f44a009f9d214ef88"
artifact_digest: "sha256:e11cddc84f08b357c7cdf950b6c9ba1d1c92c7c1b6b3604fc468b8280733919a"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:79ccd7118cb7ce874538557331d0245d681ab002cf2c6a295e6d4f8d6013fa7d"
  identity_source: "runtime"
started_at: "2026-10-05T15:17:52.783Z"
submitted_at: "2026-10-05T15:32:28.993Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the complete author response 1 and the revised canonical plan in the working tree (artifact commit `92041e7`, stated SHA-256 `e11cddc8…919a`). This session cannot run arbitrary shell commands and may not use Git, so I did not recompute that digest or diff against `b012070`. Instead, I re-read every section the response says changed:

- Prerequisites, lines 62–82;
- Shared Contract Types, lines 96–110;
- Task 4 Interfaces and publication gate, lines 384–408;
- Task 5 Files, Interfaces and steps, lines 464–483;
- Task 7 Files, Interfaces and completion step, lines 630–654;
- Task 8 Consumes and external transport, lines 692 and 747–753;
- the release-side contract and command, lines 1522–1526;
- the Task 18 Files and activation-sibling section, lines 1324 and 1601–1605;
- Gate rows 8 and 15, lines 1620 and 1627.

I also compared the reconciliation references with `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md`.

Round-1 findings:

- **R1-F001 — resolved.** The author chose option (b), and the plan now applies it consistently:
  - Shared Contract Types (line 106) names the typedef owners: Task 4 owns `ReleaseActivationReceipt` and `QuarantineReceipt`, Task 5 owns `RuntimeContractAdoption`, `ActivationBinding` and the Report, and Task 18 alone owns the `RuntimeActivationAddendum` schema.
  - It states that Tasks 4 and 5 deliver refusal-only addendum fixtures and create no ad-hoc complete shape.
  - Task 4 (lines 387, 408) removes the earlier "synthetic complete pair reaches the subsequent existing checks" expectation from the urgent candidate. It requires refusal of missing, unknown and unschema'd addenda, including synthetic objects with pass flags. Positive-pair, parent-digest, older-tag and different-D cases are deferred integration runs after the Task 18 schema and owner reviews exist.
  - The plan states that refusal-only coverage never suffices for publication.
  - Task 5 (lines 474–475) mirrors this. Task 18 (lines 1324, 1603) owns the deferred fixtures and lists `release-activation-gate.test.mjs` among its files.
  - This keeps line 110's rule ("later-helper commands are integration runs") and the reconciliation's requirement (line 55) that Task 4 is independent of Task 5.
- **R1-F002 — resolved.** Line 108 defines three separate registration contracts: conformance-run R, the #102/#130 registration-receipt contract with conformance on registered hosts, and the per-installation protected runtime receipt. It states that the addendum and the publication predicate bind only the first two. They never reference an installation receipt, and no conformance-host receipt satisfies another installation. Task 4 (lines 387, 408), Task 5 (line 474), Task 18 (lines 1603–1605) and Gate 8 (line 1620) all use the qualified terms. Task 8 (line 751) separates publication-mode from runtime `activationAuthorized`, and the runtime check additionally requires that installation's genuine receipt. This removes the circularity.
- **R1-F003 — resolved.** The prose next to the line-1526 command (line 1522) now requires `check-release-activation.mjs` to resolve the addendum only from the authenticated `evidence-approved-ref.json` at E. It must use the same original-reference resolver and byte rechecks as `validate-consumer-inputs` and verify path, revision, blob, SHA-256, owner reviews and parent linkage. It compares C/T/D with `release-input-binding.json` and the downloaded P/D, and passes that object to `verifyReleaseActivation`. The prose states that `--record` alone cannot authorize, and that the release and consumer jobs must bind identical addendum bytes and refs that also match the consumer report. I offered this resolution approach in round 1, and it is unambiguous.

Round-1 optional suggestions:

1. **Adopted.** Task 5 now consumes the accepted reconciliation rather than re-authoring it (lines 464, 480–482).
2. **Adopted.** Line 82, Task 7 (lines 630, 634, 654) and Gate 15 (line 1627) now consistently require the approved pair, the #130 schemas and the #102/#130 read-back with a genuine per-installation receipt.
3. **Adopted.** Task 8 Consumes (line 692) now lists the pair and the read-back.
4. **Adopted.** Line 71 now names the joint amendment by path.

The revision is confined to the reconciliation and activation boundary. All fifteen gates, numeric limits, A/B atomicity, default publication refusal and the Task 4 independence from Task 5 are preserved. I found no new contradiction that blocks acceptance. Two minor items remain, listed below as optional suggestions; both fail closed.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Task 5 step 3 (line 481) cites the accepted reconciliation's "Legacy overlap, quarantine and recovery section". The reconciliation has no section with that title; the tombstone discussion is under "Legacy endpoint tombstone alternative" (reconciliation lines 27–37), and the related drain timing is under "Timing of legacy drain under recommendation A" (lines 140–179). Correct the section name so the evidence pointer resolves.
2. Task 18's focused Verification Commands (line 1383) do not name `test/unit/release-activation-gate.test.mjs` or `test/unit/runtime-contract-adoption.test.mjs`, although Task 18 now owns their deferred schema-valid pair and mismatch integration cases (lines 1324, 1603). `npm test` probably covers them. Naming them explicitly would make the deferred integration runs visible in Task 18's evidence.

## Decision

accepted
