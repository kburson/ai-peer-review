# Runtime contract plan amendment — #107 / #144

> **For agentic workers:** Use `superpowers:executing-plans` for this document-only amendment. The original task implementation method and governed child ownership remain in force.

**Status:** Draft amendment for repeat plan review. None of its verification changes is effective before normal acceptance and native issue mapping.

**Goal:** Separate Task 5 contract adoption from later release activation proof while retaining publication denial and the original operational obligations.

**Architecture:** This additive amendment identifies exact clauses superseded in the preserved #107 implementation plan. Upon acceptance, apply only the listed changes to the canonical source plan and repeat review of that exact final plan. Owner adoption, contract-record acceptance and release activation remain separate evidence transactions.

**Tech Stack:** Immutable Git objects, SHA-256, normal peer-review protocol, document-only checker and native AITM issue-body mutations.

**Spec:** Accepted reconciliation `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md`, revision `4d8815b2fabf861d24d25fa9735b953865e99f55`, blob `dcb99da9191789472bbd1840beb72448bf755fba`, SHA-256 `4e8d38f06fb53b963089cfe5835e2722cc31a3053ac3ba7076467d93e6973405`; normal accepted XPR `review-58b490491800f0c13d64191cb58071b5`, finalization `59f9628f30ea3945d92972196d7acda4350592a5`. Authority assurance is unavailable, not human approval.

## Baseline and limited supersession

Canonical baseline: `docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md` at `60efdbbeb60c83c1c56884491ae018eaea70d282`, blob `2edd15f5e3280d0b6eb77eb4a4683dd023b49b5b`, SHA-256 `c4e8564396d86e5f9413393e30975fc7c2639135dfbdff5d8ddcca769862d016`. Preserve that object and the immutable accepted #107 specification with digest `395bf5ce47617f827f362552d1839333a4e3964072cb4e6362e8bba3703a4c2e`.

Only Prerequisites and Ownership, Task 5, the Task 7 source/schema dependency, Task 8 adoption assertion, Task 18 migration prerequisites and gate 8/15 dependency descriptions are affected. All remaining tasks, requirements, numeric limits and all fifteen release gates remain required.

## Global constraints

- No runtime code or immutable accepted specification changes.
- A complete adopted A or B bundle is required; this amendment cannot choose or accept owners by itself.
- Candidate packaging in Task 4 is independent of Task 5. Task 4 publication requires both contract and activation proof.
- Default checker behavior requires publication authority. No missing-proof success or release fallback.
- Contract-only mode has an explicit name and returns activation/publication false.
- Later exact source/tag/tarball/live conformance remains required from its owning tasks, including #143/#157; unavailable receipts are not fixtures.
- Plan acceptance does not satisfy its operational gates or authorize installed runtime changes.

## Review focus

1. A Task 5 pass cannot be reused as a publishable activation receipt.
2. A later activation addendum cannot mutate an earlier accepted contract decision.
3. A valid accepted manifest from producer 0.4.1 cannot be passed through source 0.4.0 by dropping its author runtime fields.
4. #130's missing detailed schemas still block Task 7 production integration after owner adoption.
5. Gate labels must distinguish resolved contract choice from pending old-family exclusion and migration conformance.

## Exact affected contract changes

### Prerequisites and Ownership

Retain the historical conflict table and its source pointers. Add an amendment pointer and disposition table:

| Original requirement                   | Joint amendment disposition                                                                                                                                       | Continuing gate                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Retained per-run package/Node dispatch | Complete adopted bundle selects current-global A, or separately accepted complete coexistence B. No independent per-row choice.                                   | Actual owner adoption and current-runtime validation; no older fallback under A. |
| Layered user/project policy            | Under A use the exact accepted #102 ownership table; preserve prospective source diagnostics. No general deep merge.                                              | #130 detailed schema acceptance and Task 7 production integration.               |
| Old active/fenced recovery             | Under A drain while compatible/current; preserve stranded journals. Explicit maintenance recovery needs proved current-global registration/ownership/conformance. | Pending exact installed exclusion/rollback/drain obligations block activation.   |
| Shared evidence/analytics              | Adopt exact #30/#34/#109 bounded plan/schema contracts and their normal review references.                                                                        | Missing owner dispositions block contract adoption; implementation gates remain. |

The table is effective only when the owner acceptance records select the exact same whole bundle. This amendment cannot label open owner plans accepted.

### Task 5 files and interfaces

Add `docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md` as bounded owner-plan review input, and this separately reviewed amendment as source-plan lineage. Keep all existing checker, fixture and authoritative record paths.

Replace the adoption interface contract with:

- `RuntimeContractAdoption` is an immutable reviewed document record containing owner issues #102/#30/#34/#109, exact specification/amendment/bounded plan/schema references, the complete coupled bundle, accepted normal owner review references and unresolved contract conflicts.
- `ActivationBinding` in that record freezes the exact reviewed #102 launcher/current-runtime interfaces, registration contract, exclusion/drain guarantees, prospective conformance requirements and unresolved operational obligations. It is contract intent, not deployed assurance.
- `RuntimeActivationAddendum` is an append-only sibling of the accepted contract record. It references the exact contract digest, release source/tag/tarball, registration and genuine installed exclusion/drain conformance. It has separate accepted normal reviews from #102/#107/#30 and cannot revise the contract.
- `checkRuntimeContractAdoption({record,artifacts,recordReference,approvalReview,activationAddendum}):Report` is document-only and reports `contractAdopted`, `activationAuthorized`, `publicationAllowed` separately. Absent activation evidence leaves the latter two false.
- An approved-ref pins the contract record and accepted review plus, for publication, one exact activation addendum and accepted review. Git revisions, blobs, bytes, complete normal manifests, accepted members, persisted attempt/event/source identity and terminal author transaction are validated. No caller assertion, fixture or latest filename grants authority.
- Task 8 alone owns runtime `assertContractAdoption(record):void`; it requires the complete applicable activation binding/addendum as well as contract adoption.

### Task 5 verification boundary and native mapping

Replace only Task 5 Verification Command 1 with the explicit contract-only command:

```sh
node scripts/check-runtime-contract-adoption.mjs --mode adoption-only --record evidence/portable-runtime/contracts/runtime-contract-adoption.json --approved-ref .scratch/peer-review/evidence-approved-ref.json
git diff --check
```

`--mode adoption-only` exits zero only for authentic complete contract adoption, and emits `activationAuthorized:false` and `publicationAllowed:false` even if other evidence is present. Missing owner/plan/schema/lineage/decision evidence exits blocked. An unknown mode refuses. Omitting mode retains the stronger publication requirement; release consumers may neither pass adoption-only nor infer publication from its exit code.

After repeat acceptance of the final affected canonical plan, root uses native `issue-body` to change only #144 scope/VC1 and its source-plan amendment pointer. Preserve original Source-plan-commit and record the exact accepted amendment/final plan commit separately. Retain the existing AC and its `vc:1 vc:2` evidence mapping and all full-suite/lint/format/commit verifiers. No AC is ticked by a draft amendment.

Task 5 completes only after actual owners adopt, the contract record is independently reviewed and immutable, and the new VC1 proves those exact records. Later activation obligations remain visible pending dependencies. Default publication refusal remains a required negative check.

### Task 7 detailed configuration

Keep the original roster, scalar, named-key/profile/array, source pointer, bounds, defaults, caps and fallback requirements except where the accepted complete bundle explicitly disposes source ownership. Primary-exclusive field classification under A replaces cross-store authority deep merge, not ordinary within-owned-policy profile semantics.

Candidate schema and isolated tests may proceed after the applicable accepted contract; production config completion and runtime integration additionally require #130's own accepted versioned partial-store, assembled closed-object, inheritance and installation-receipt schemas. Task 5's field-ownership adoption never invents those schemas.

### Task 8 and Task 18

Task 8 checks full applicable activation authority before reservation; contract-only checker success cannot satisfy `assertContractAdoption`, activation or quarantine.

Task 18 migration/release consumes the complete actual owner decision and a release-specific accepted activation addendum. Retain all original manual startup, ownership, unknown outcome, installed platform and all fifteen gate requirements. A supported maintenance recovery is available only for proved compatible current-global execution; otherwise preserved unsupported journals remain unresolved overlap obligations.

### Gate traceability

Gate 8's historical #102/#107 choice blocker becomes: exact whole-bundle owner adoption, release-specific source/tag/tarball/registration and genuine old-family exclusion/drain/migration conformance. Resolving the first does not clear the rest.

Gate 15's policy-source choice blocker becomes: exact ownership adoption plus separately accepted #130 detailed schemas and Task 7 source/defaults/profile/array conformance. No dependency is removed.

Gates 3/10/11/12 retain their #30/#34/#109 schema/evidence dependencies. All gates remain required for publication.

## Reconciliation implementation sequence

- [ ] Freeze this amendment and the bounded owner addendum as separate tracked review subjects. Perform manual author SAR and actual independent normal plan review with exact bytes.
- [ ] Obtain each owner's bounded native adoption and plan-review references; preserve broader unfinished plans and absence of #130 schemas.
- [ ] Apply only the listed canonical plan changes; repeat review of the exact affected canonical plan. Root updates #144 VC mapping through native governance only after this acceptance.
- [ ] TDD the explicit mode, atomic bundle, immutable record/addendum separation, full closed normal manifest grammar and persisted event/source identity. Record genuine RED before code and GREEN afterward.
- [ ] Include the actual strict importer mismatch as a version compatibility negative. A matching unmodified producer proves its own event grammar; unknown or mismatched grammar refuses. Do not change source 0.4.0 public runtime or normalize/strip event fields.
- [ ] Prepare and normally review the immutable contract JSON at a pinned evidence revision, then generate a selector through the authorized genuine evidence transaction. Tests cannot stand in for owner reviews.
- [ ] Run affected host tests and destination lint/format; complete exact-head hosted CI and native Test serialization before reporting CODE_COMPLETE.
- [ ] Keep publication/activation denied until the later release-specific addendum and every operational gate are actually complete.

## Acceptance boundary

This amendment changes Task 5's completion evidence boundary and names the remaining integration gates. It neither supplies owner adoption nor weakens production proof. Draft acceptance is not a final canonical source-plan acceptance; the exact applied canonical plan receives repeat normal review before native issue mapping.
