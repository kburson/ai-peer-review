<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-a4157c49c11ad9d12836d7bfea0df472"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md"
artifact_commit: "c4ba22817b8d558f4f9ab44c9336f60e059efbdc"
artifact_blob: "ff1a376ef81e26ec5f2402090587cfa2438b347a"
artifact_digest: "sha256:208a8e54a014415cdef0dda2b6d266b7745e7126d0902a34c2b7c1041b420828"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:3d928a5cc0b4ee4fad3965576a9595482eccd4e7e7333c3f889b486bb8ee9896"
  identity_source: "runtime"
started_at: "2026-10-05T13:15:25.069Z"
submitted_at: "2026-10-05T13:32:22.910Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the complete revised amendment (artifact commit `c4ba228`) in the working tree and the complete author response 1. As in round 1, this session cannot run shell commands or use Git, so I did not recompute the artifact digest `208a8e54…0828` or any cited digest; I take the pinned values as stated. I re-checked each replacement clause against the baseline text I read in round 1: Task 4 lines 363 and 384, Task 5 lines 451 and 453–459, Task 8 lines 602 and 622–631, Task 18 lines 1217, 1223–1229 and 1480, and gate rows 8 and 15. I also re-checked the accepted reconciliation (`Contract adoption versus activation proof`, lines 53–71) and the accepted owner addendum's #102 and #130 sections.

Round-1 findings:

- **R1-F001 — resolved.** The supersession list (line 19) now names the Task 4 release/quarantine interfaces and publication gate, Task 5 step 5 and its snippet, and the Task 18 interfaces, ordering, consumer jobs and command. `verifyReleaseActivation`, `quarantineLegacyLeftovers`, `check-release-activation.mjs`, `verifyPortableRelease` and the line-1480 command all consume the approved {contract, addendum} pair. They require parent-contract digest equality and exact C/T/D. The contract "never binds a future tag/tarball". The addendum now has a schema (`ai-peer-review.runtime-activation-addendum/v1`), a path outside shipped files and a producing step (Task 18 ordering step (3), evidence commit E). The fixed scratch input is explicitly non-authoritative and is rechecked against the approved reference. Review focus 2 is now closed end to end.
- **R1-F002 — resolved.** The plan now states that the addendum cannot be embedded in P. It routes runtime authority through a #102-owned protected selected-current registration store, with a #130-owned receipt schema and read-back at every effect and after waits. The signature carries the pair, approved reference, registration and installed identity. Older-tag addenda, installed-digest drift, caller paths, environment values and unauthenticated fetches all refuse. Missing owner schema/interface acceptance is declared a production blocker rather than a fallback. The author's reason for declining the publication-derived option is consistent with reconciliation line 57 ("Task 8 runtime assertion, quarantine and production activation require activationAuthorized") and line 67 (no authority to "a currently mismatched installation"). I accept that disposition.
- **R1-F003 — resolved.** Two verification boundaries are now explicit. Local generation replays the complete original private events and emits a reviewed public `RuntimeReviewLineageProof` at `evidence/portable-runtime/contracts/review-lineage/<review_id>.json`. Git/CI verifies that pinned reviewed receipt, reports private-event replay as unavailable, and refuses a missing, stale or unreviewed receipt. The self-reference problem for the contract review's own lineage is handled by binding it in the later approved-evidence transaction.
- **R1-F004 — resolved.** A checked-in, checker-only `scripts/lib/runtime-review-grammar-v0.4.1.mjs` carries the closed 0.4.1 grammar and receipt semantics. The trusted profile pins the producer package identity and module digests, and is linked to the actual startup-request/runtime snapshot and launch receipt. A version string, adapter version or caller declaration alone cannot select it. The checker never runs selector-chosen, scratch or pinned producer code. The positive/negative fixtures I asked for are listed (line 133). The repository 0.4.0 parser stays unchanged and its incompatibility remains a required negative. Review focus 3 is closed.
- **R1-F005 — resolved.** The replacement snippet asserts #109 and all three report domains under `--mode adoption-only`, and it is restricted to the genuine approved record.

All four round-1 optional suggestions were adopted: the target-interface wording, the Gate 15 source-ownership fixture phrase, the TDD negatives and a definition of "applicable".

The revision introduced no new contradiction with the baseline, the accepted reconciliation or the accepted owner addendum that would block acceptance. All fifteen gates, the #130 Task 7 gate, the A/B bundle atomicity, the four-owner-transaction rule and the default publication refusal are preserved. The items below are minor consistency polish. Each one fails closed as written.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The Task 5 replacement snippet (lines 106–112) calls `checkRuntimeContractAdoption` without `lineageProofs`. The interface (line 63) now lists that argument, and line 144 says missing lineage evidence exits blocked. Copied verbatim, the genuine-record assertion `report.contractAdopted === true` would fail closed. An implementer might instead make `lineageProofs` optional to make it pass. Add `lineageProofs` to the snippet, or state that the checker resolves them from `recordReference`/approved-ref.
2. Implementation sequence bullet 5 (line 202) still says "A matching unmodified producer proves its own event grammar". That is the phrase that was ambiguous in round 1. It could be read as running producer code, which the strict-provenance section now forbids. Reword it to "the checker-owned v0.4.1 grammar with a pinned producer profile verifies unmodified 0.4.1 collateral".
3. The protected registration store holding the contract/addendum pair, and its #102/#130 transport/read-back contract (lines 164–166), are new owner obligations. The accepted owner addendum's #102 and #130 sections do not contain them, so the owner dispositions recorded from that addendum will not carry them either. The amendment correctly calls this a production blocker. Consider also naming it explicitly in Gate 8's dependency text and in the Prerequisites "Continuing gate" column, so it is visibly tracked rather than implied by the word "registration".

## Decision

accepted
