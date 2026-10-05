<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-a4157c49c11ad9d12836d7bfea0df472"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md"
artifact_commit: "8587ecb1f0177e8e76f962fd0116ea98f1957923"
artifact_blob: "d017234cf0c0bc395a78879a66280116386bcc84"
artifact_digest: "sha256:f909981af6a2b3255834040cd6ca680c43584e3a789c07ce143a3b30aa75dfeb"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:3d928a5cc0b4ee4fad3965576a9595482eccd4e7e7333c3f889b486bb8ee9896"
  identity_source: "runtime"
started_at: "2026-10-05T13:15:25.069Z"
submitted_at: "2026-10-05T13:18:23.332Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the full amendment `docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md` in the working tree. This session could not run shell commands (Bash was denied) and may not use Git, so I did not recompute the artifact digest `f909981a…dfeb` or any cited digest; I take the pinned revisions/blobs/SHA-256 values as stated.

I checked the amendment against these sources:

- the canonical baseline `docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md`: Global Constraints and Prerequisites (lines 20–68), Shared Contract Types (76–86), Task 4 (347–427), Task 5 (429–472), Task 7 (528–584), Task 8 (586–641), Task 18 (1201–1485), gate traceability (1487–1509) and handoff (1511–1517);
- the accepted reconciliation `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md` (complete), especially `Contract adoption versus activation proof` (53–71);
- the accepted bounded owner Plan `docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md` (complete) and its tracked review manifest `review-057079566301a0106537dde070ea518a-review-manifest.md`;
- `package.json` of this source tree (version `0.4.0`) and of the installed runtime package that produced these reviews under `.scratch/peer-review/runtimes/ccdb710c…/package/package.json` (version `0.4.1`).

What works:

- Review focus 1 is addressed for the Task 5 checker itself: `--mode adoption-only` always emits `activationAuthorized:false`/`publicationAllowed:false`, unknown modes refuse, and the default mode keeps the publication requirement.
- Review focus 2 is addressed at the type level: `RuntimeActivationAddendum` is an append-only sibling that references the exact contract digest and "cannot revise the contract", matching spec lines 65–67.
- Review focus 4 is addressed: Task 7 and Gate 15 keep #130's detailed schemas as an independent production-integration gate.
- Review focus 5 is addressed: the Gate 8/15 rewrites keep owner adoption separate from pending exclusion/drain/migration and schema conformance, and "Resolving the first does not clear the rest."
- The A/B bundle atomicity, the contextual response-schema rule with both byte references, the four-owner-transaction rule and the native issue mapping sequencing are faithful to the reconciliation and owner addendum.

What does not yet work:

- The supersession list omits Task 4 and leaves Task 5/Task 18 text that binds release identity into the immutable contract record and consumes only that record (R1-F001). Followed literally, publication can only succeed by mutating or re-issuing the contract record per release, which is the failure review focus 2 targets.
- Task 8's runtime check requires a release-specific activation addendum that, by construction, cannot be inside the package it authorizes and is excluded from every shipped path (R1-F002).
- The default/publication mode's dependence on non-retained local workspace proof is unreconciled with release verification on GitHub runners (R1-F003).
- Review focus 3 is stated as a prohibition, but the plan never says where the 0.4.0-source checker obtains a trusted definition of the 0.4.1 producer grammar that all real accepted reviews use (R1-F004).
- The retained Task 5 assertion snippet does not check #109 or the three report domains (R1-F005).

## Findings

### R1-F001 — Task 4, Task 5 step 5 and Task 18 still bind release identity into the immutable contract record and consume only that record

Location: amendment `Baseline and limited supersession` (line 19) and `Global constraints` bullet 3 (line 25). Unsuperseded baseline text:

- Task 4 Interfaces (baseline line 363): `quarantineLegacyLeftovers({receipt,election,activationBinding})` and `verifyReleaseActivation({packageDigest,adoptionRecord,checker})` "refuses publication without adopted verified ActivationBinding and exact referenced conformance". No activation addendum input exists.
- Task 4 release gate step (line 384): run `check-release-activation.mjs` "against … authoritative runtime-contract-adoption record … Verify that record binds the tag/source/package digest and accepted owner reviews".
- Task 5 step 5 (line 451): "The authoritative adoption record … binds exact source/tag/tarball and accepted owner reviews".
- Task 18 Interfaces (line 1217) `verifyPortableRelease({manifest,expectedMatrix,anchors,contractAdoption,gates})`; release ordering step (3) (line 1224) "accepted Task5 authority bound to C/T/D"; release.yml step (line 1229) "Run check-release-activation against that same E/D and accepted Task5 authority"; verification command (line 1480) passes only `--contract-adoption`.

The amendment itself says the contract record is immutable, precedes any tag/tarball, and that release source/tag/tarball identity lives only in a `RuntimeActivationAddendum`. It also says "Task 4 publication requires both contract and activation proof", yet declares only Prerequisites, Task 5, Task 7, Task 8, Task 18 migration prerequisites and gates 8/15 affected. Task 4 is not in that list, and the Task 5 step and Task 18 release interfaces/ordering are not among the listed replacements (the Task 18 section only adds one consumption sentence).

Failure scenario: an implementer following the unchanged Task 4 wrapper verifies that the contract record binds tag T/source C/digest D. An adopted contract record cannot contain D (it is accepted before C is tagged and P is packed). Publication then either refuses forever, or the implementer re-issues/rewrites the contract record per release to carry C/T/D — mutating the accepted contract decision, which review focus 2 and spec line 67 forbid. Independently, Task 4 quarantine would accept an `ActivationBinding` alone, even though the amendment defines it as "contract intent, not deployed assurance" and says contract-only success cannot satisfy quarantine.

The amendment also never names the addendum's storage path, schema identifier or producing task/step. Task 18 "consumes" it, but no task creates it.

### R1-F002 — Task 8's runtime activation check depends on an addendum the installed runtime cannot obtain, and its signature cannot carry it

Location: amendment `Task 5 files and interfaces` last bullet ("Task 8 alone owns runtime `assertContractAdoption(record):void`; it requires the complete applicable activation binding/addendum") and `Task 8 and Task 18` ("Task 8 checks full applicable activation authority before reservation").

The addendum is keyed by the exact package digest D. It therefore cannot be inside package P (baseline line 1224: "No source or evidence digest includes its own signature/digest field"). All authoritative evidence lives under `evidence/portable-runtime/`, which baseline line 1223 requires never to be shipped. An installed runtime runs in a user project with no access to AIPR's approved evidence revision E. The single-argument signature `assertContractAdoption(record)` also has no slot for the addendum or for the running package's own digest. Spec line 67 requires that an older-tag addendum grants no authority to "a currently mismatched installation", but the amendment does not require Task 8 to bind the addendum to the running package.

Failure scenario: either every published installation's `startRun` refuses (the addendum is never available), or an implementer satisfies the check from a caller-supplied path, environment value or network fetch — the caller-assertion authority the plan forbids — or accepts an addendum for a different release because nothing binds it to the running bytes.

### R1-F003 — Default/publication mode re-requires non-retained local workspace proof that release workflows cannot supply

Location: `Contextual response compatibility and owner proof`, last paragraph ("The record/approved-ref identifies which verified facts require non-retained local proof … Missing that actual workspace/source proof refuses"), and `Task 5 verification boundary` ("Omitting mode retains the stronger publication requirement").

Tracked review collateral carries only digests of the private journals; for example, the owner-addendum manifest records `lineage_receipt.attempts[0].event_log_digest` while `events.jsonl` stays under `.scratch/peer-review/`. "Persisted attempt/event/source identity" verification therefore needs the original local workspace. Release consumers are GitHub Actions jobs (baseline Task 4 line 384, Task 18 lines 1225–1229) that check out only C and the public evidence subtree at E, and never have that workspace.

Failure scenario: if the default mode requires the local proof, every release run refuses. If it skips it, the amendment does not say so, and an implementer may treat absent local proof as non-fatal in default mode, which is the missing-proof success the Global constraints forbid. Neither outcome is specified.

### R1-F004 — Review focus 3 has no named trusted source for the producer grammar the checker must verify

Location: `Review focus` 3, `Contextual response compatibility and owner proof` last paragraph, and `Reconciliation implementation sequence` bullet 5.

Every authentic accepted review this contract record will cite (the reconciliation XPR, the owner-addendum XPR, this review) is produced by the installed runtime `0.4.1`, while this source tree and its new checker are `0.4.0`. The amendment says:

- "A matching unmodified producer proves its own event grammar; unknown or mismatched grammar refuses";
- "Do not change source 0.4.0 public runtime or normalize/strip event fields";
- "An approved-ref never executes untrusted pinned JavaScript."

It never says how the checker learns the 0.4.1 grammar. "A matching unmodified producer proves" can be read as executing the producer package's own code, which the selector rule forbids unless that code is trusted by some named root. Otherwise the checker has no 0.4.1 grammar and refuses every real review. The amendment also does not say how the producer version/package identity is established from collateral-bound evidence rather than from a caller claim; the tracked manifest exposes `runtime.adapter_version` and schema identifiers, not a package version or digest.

Failure scenario: the Task 5 implementer either (a) cannot make VC1 pass on any genuine record, (b) loads and runs the pinned 0.4.1 package from `.scratch`, or (c) quietly accepts the 0.4.1 grammar by relaxing the closed grammar. Option (c) is the review-focus-3 failure, and (b) breaks the no-untrusted-JavaScript rule.

### R1-F005 — The retained Task 5 assertion snippet omits #109 and the three report domains

Location: baseline Task 5 step 5 snippet (lines 453–459), which the amendment does not replace.

The amended `RuntimeContractAdoption` requires owners #102/#30/#34/#109 and the checker reports `contractAdopted`, `activationAuthorized` and `publicationAllowed` separately. The retained snippet asserts only #102, #30 and #34 plus `unresolvedConflicts.length === 0`. A red/green cycle written to that snippet can pass with the #109 disposition missing, and it never asserts that adoption-only success leaves activation and publication false.

## Required changes

1. (R1-F001) Add Task 4, Task 5 step 5 and the Task 18 release interfaces/ordering/verification command to the supersession list, with exact replacement text:
   - Release identity (C/T/D, registration, conformance) is bound only in a `RuntimeActivationAddendum`. The contract record binds owner/spec/plan/schema bytes and reviews, never a tag or tarball.
   - `verifyReleaseActivation`, `check-release-activation.mjs`, `verifyPortableRelease`/`verify-portable-release.mjs` and `quarantineLegacyLeftovers` consume the pair {contract record, activation addendum} resolved from the approved-ref, and require the addendum's contract digest to equal the pinned record and its C/T/D to equal the release under verification.
   - Name the addendum path under `evidence/portable-runtime/` (outside packaged files), its schema identifier, and the producing task/step (for example, Task 18 release ordering step (3), evidence commit E).
2. (R1-F002) Specify the runtime activation authority model for Task 8 so it is obtainable without caller assertion, and change the signature accordingly. One consistent option: the package embeds the exact accepted contract-record digest and `ActivationBinding` identifiers before packing; the release gate is the sole consumer of the addendum; at runtime Task 8 verifies the embedded contract digest plus #102 current-runtime selection/registration revalidation of its own installed bytes, and states that activation authority for an installed package derives from having passed the gated publication of exactly those bytes. If a different source is chosen, name it and state how it binds to the running package digest.
3. (R1-F003) State which facts each mode/consumer verifies. For example: local actual-workspace proof is checked once when the immutable contract record is reviewed; that review binds a reviewed proof-receipt digest; default/publication mode in CI verifies Git-reproducible facts plus that pinned reviewed receipt, and refuses if the receipt is absent or mismatched, without re-requiring the non-retained workspace.
4. (R1-F004) Name the trusted grammar source. For example: the checker carries a checker-owned, closed grammar verifier for each supported producer version, reviewed as part of Task 5 and keyed by an exact producer identity bound in collateral (state which field or receipt binds it, or add that binding as an obligation). Add positive and negative fixtures: an unmodified 0.4.1 accepted manifest verifies; the same manifest with author runtime fields stripped refuses; an unknown producer identity refuses; no pinned package code is executed.
5. (R1-F005) Replace the Task 5 snippet so it asserts the #109 owner and the three separate report domains, including `activationAuthorized === false` and `publicationAllowed === false` under `--mode adoption-only`.

## Optional suggestions

1. In the Prerequisites disposition table, change "Adopt exact #30/#34/#109 bounded plan/schema contracts" to "bounded plan contracts and target interface identifiers; no field-level schema bytes", matching the amendment's own later statement and the owner addendum.
2. Gate 15's fixture-class column still says "exact config precedence". Under bundle A, restate it as the adopted primary/user source-ownership classification so nobody builds layered-precedence fixtures for a disposed requirement.
3. Add to the TDD sequence explicit negatives: an adoption-only report presented to the default/publication path refuses; an addendum whose contract digest differs from the pinned record refuses; an older-tag addendum presented for a different D refuses.
4. Define "applicable" in "complete applicable activation binding/addendum" (Task 8), so it cannot be read as optional for some code paths.

## Decision

revisions-requested
