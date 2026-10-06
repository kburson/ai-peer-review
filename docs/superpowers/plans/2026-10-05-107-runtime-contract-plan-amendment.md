# Runtime contract plan amendment — #107 / #144

> **For agentic workers:** Use `superpowers:executing-plans` for this document-only amendment. The original task implementation method and governed child ownership remain in force.

**Status:** Draft amendment for repeat plan review. None of its verification changes is effective before normal acceptance and native issue mapping.

**Goal:** Separate Task 5 contract adoption from later release activation proof while retaining publication denial and the original operational obligations.

**Architecture:** This additive amendment identifies exact clauses superseded in the preserved #107 implementation plan. Upon acceptance, apply only the listed changes to the canonical source plan and repeat review of that exact final plan. Owner adoption, contract-record acceptance and release activation remain separate evidence transactions.

**Tech Stack:** Immutable Git objects, SHA-256, normal peer-review protocol, document-only checker and native AITM issue-body mutations.

**Spec:** Accepted reconciliation `docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md`, revision `4d8815b2fabf861d24d25fa9735b953865e99f55`, blob `dcb99da9191789472bbd1840beb72448bf755fba`, SHA-256 `4e8d38f06fb53b963089cfe5835e2722cc31a3053ac3ba7076467d93e6973405`; normal accepted XPR `review-58b490491800f0c13d64191cb58071b5`, finalization `59f9628f30ea3945d92972196d7acda4350592a5`. Authority assurance is unavailable, not human approval.

## Baseline and limited supersession

Canonical baseline: `docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md` at `60efdbbeb60c83c1c56884491ae018eaea70d282`, blob `2edd15f5e3280d0b6eb77eb4a4683dd023b49b5b`, SHA-256 `c4e8564396d86e5f9413393e30975fc7c2639135dfbdff5d8ddcca769862d016`. Preserve that object and the immutable accepted #107 specification with digest `395bf5ce47617f827f362552d1839333a4e3964072cb4e6362e8bba3703a4c2e`.

Only Prerequisites and Ownership, Task 4 release/quarantine interfaces and publication gate, Task 5 (including its authoritative-record step/assertion snippet), the Task 7 source/schema dependency, Task 8 adoption assertion/registration consumption, Task 18 release interfaces/ordering/consumer commands and migration prerequisites, and gate 8/15 dependency descriptions are affected. All remaining tasks, requirements, numeric limits and all fifteen release gates remain required.

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
| Shared evidence/analytics              | Adopt exact #30/#34/#109 bounded plan contracts and target interface identifiers, not absent field-level schema bytes, with their normal review references.       | Missing owner dispositions block contract adoption; implementation gates remain. |

The table is effective only when the owner acceptance records select the exact same whole bundle. This amendment cannot label open owner plans accepted.

### Task 5 files and interfaces

Add `docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md` as bounded owner-plan review input, and this separately reviewed amendment as source-plan lineage. Keep all existing checker, fixture and authoritative record paths.

Replace the adoption interface contract with:

- `RuntimeContractAdoption` is an immutable reviewed document record containing owner issues #102/#30/#34/#109, exact specification/amendment/bounded plan/schema references, the complete coupled bundle, accepted normal owner review references and unresolved contract conflicts.
- `ActivationBinding` in that record freezes the exact reviewed #102 launcher/current-runtime interfaces, registration contract, exclusion/drain guarantees, prospective conformance requirements and unresolved operational obligations. It is contract intent, not deployed assurance.
- `RuntimeActivationAddendum` is an append-only sibling of the accepted contract record. It references the exact contract digest, release source/tag/tarball, registration and genuine installed exclusion/drain conformance. It has separate accepted normal reviews from #102/#107/#30 and cannot revise the contract.
- `checkRuntimeContractAdoption({record,artifacts,recordReference,approvalReview,lineageProofs,activationAddendum,mode}):Report` is document-only and reports `contractAdopted`, `activationAuthorized`, `publicationAllowed` separately. Absent activation evidence leaves the latter two false.
- An approved-ref pins the contract record and accepted review plus, for publication, one exact activation addendum and accepted review. Git revisions, blobs, bytes, complete normal manifests, accepted members, persisted attempt/event/source identity and terminal author transaction are validated. No caller assertion, fixture or latest filename grants authority.
- Task 8 alone owns runtime `assertContractAdoption({contractRecord,activationAddendum,approvedReference,registration,installedIdentity}):void`. It verifies the independently approved pair and exact current installation through #102-owned registration/read-back, as specified below; contract-only success never supplies runtime activation authority.

### Contextual response compatibility and owner proof

The accepted bounded owner Plan is `docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md` at `bdd842694a0494da963c538de686d1c85d689d4d`, blob `95a44172d2683c9c5b213c6e9b7be4cd7b690149`, SHA-256 `3f04358b465b4722bc0d5880c2896e19df44445a1ee3839887749f24cbb935d8`. Its normal Plan XPR `review-057079566301a0106537dde070ea518a` finalized at `674a5c967ed32122eb0c879f4e9991fa3792535b`, with authority assurance unavailable. That acceptance approves the bounded proposals, not four actual native owner dispositions, their broader plans, or implementation.

Bind both response schema artifacts from `66b1a7a5fe061336bcf484d26fab3973a3b19c77`:

- API artifact `schemas/api-response-v1.json`, SHA-256 `7eb93ca43014ff4f57c3e3b93e8d2d1e996bb68b6585ff356a07cf31445e9292`, schema artifact ID `ai-peer-review.api-response/v1`.
- Historical artifact `schemas/response-v1.json`, SHA-256 `744390c3aa12d92e08051054a75812a0b348787d59069d09d4f9e762ea4c76d9`, schema artifact ID `ai-peer-review.response/v1`.

Both payloads retain `ai-peer-review.response/v1`. The supported API boundary selects its API artifact through the operation registry; historical participant evidence selects its historical artifact. Never dispatch solely on the shared payload tag, reinterpret the historical reader, or weaken either closed grammar. Contract adoption requires this exact contextual rule and both byte references in the actual #30 historical-evidence and #102 runtime native dispositions and in the accepted applied #107 plan. Tests alone do not adopt it.

Actual owner proof binds each genuine native owner transaction/source, exact disposition bytes, owner issue, bounded subsection, selected complete bundle, accepted Plan reference and remaining obligations. Additive pointers preserve every ordinary Implementation-plan, Governing-spec, Plan-review and approval marker. One common accepted Plan review repeated four times is not four owner transactions. The unverified broad #102 independent Plan review remains recorded provenance; this bounded adoption requires its own accepted bounded Plan reference and genuine native disposition, not invented acceptance of the broader six-slice plan.

Normative target interfaces and reserved identifiers from #107 do not freeze absent field-level schema bytes. Detailed #30/#130 schema implementation and broader #34/#109/#152/#153 work retain their own gates. #109's native disposition is bounded to Codex consumption/repair; #152/#153 retain broader shared telemetry integration.

Version-bound actual-workspace lineage proof is generated from complete original private events before the immutable contract record is reviewed. A retained, ordinarily reviewed public proof receipt binds the exact facts and verifier/source identity; original journals and provider handles remain private. Local verification and Git-reproducible consumer verification are distinct as specified below. The receipt supplements and never replaces the pinned contract, review bytes and terminal author transaction. No fixture, lossy projection, copied private journal or caller claim supplies it. Raw event byte hashes and the exact producer's canonical receipt algorithm remain distinct. An approved-ref never executes untrusted pinned JavaScript.

### Task 4 release and quarantine replacements

Replace Task 4's release/quarantine interface clauses (baseline line 363) with:

- `verifyReleaseActivation({sourceCommit,tag,packageDigest,contractRecord,activationAddendum,approvedReference,checker}):ReleaseActivationReceipt` resolves and validates the approved immutable pair. It requires `activationAddendum.contractDigest` to equal the pinned contract-record digest and the addendum's source/tag/package digest to equal the exact release C/T/D. It requires all independent registration/conformance/owner approvals and a publication-mode report with all three domains true.
- `quarantineLegacyLeftovers({receipt,election,contractRecord,activationAddendum,approvedReference,registration,installedIdentity}):Promise<QuarantineReceipt>` requires independently verified activationAuthorized for the exact current installation plus the original positive ownership/death/election proof. Contract intent or publication history alone is insufficient; preserve bytes when proof is absent.

Replace Task 4's publication-gate step (baseline line 384) only as to adoption authority: `check-release-activation.mjs` obtains both the immutable contract record and one exact release-specific addendum from the authenticated approved-ref/evidence revision. The contract binds owner/spec/plan/schema bytes and accepted references, never C/T/D. The separate addendum binds the contract digest and C/T/D/registration/conformance. Before npm publication, matching-artifact verification or GitHub release, validate both exact approved objects and all operational obligations against the downloaded P/D. Missing pair, stale addendum, mismatched digest/source/tag, incomplete owner reviews or conformance refuses. Retain every original signed-tag, source, artifact-match, hotfix, controlled-candidate and publication-order constraint. No fixture supplies authority.

### Task 5 authoritative-record step and assertion replacement

Replace baseline Task 5 step 5 (line 451) with: after actual acceptance, revise affected plan contracts/gates and repeat Plan review. The immutable authoritative contract is ordinarily reviewed at a pinned evidence revision outside package files, binding owner/spec/amendment/bounded Plan/schema references and accepted reviews. It never binds a future tag/tarball. Later release identity belongs only to the separately accepted activation sibling. Test fixtures cannot authorize adoption or publication.

Replace its assertion snippet (lines 453–459) with:

```js
assert.equal(adoption.runtimePolicy.issue, 102);
assert.equal(adoption.evidence.issue, 30);
assert.equal(adoption.analytics.issue, 34);
assert.equal(adoption.telemetry.issue, 109);
assert.equal(adoption.unresolvedConflicts.length, 0);
assert.ok(adoption.reviewedDigests.every((d) => /^[a-f0-9]{64}$/.test(d)));
const report = checkRuntimeContractAdoption({
  record: adoption,
  artifacts,
  recordReference,
  approvalReview,
  mode: "adoption-only",
});
assert.equal(report.contractAdopted, true);
assert.equal(report.activationAuthorized, false);
assert.equal(report.publicationAllowed, false);
```

These assertions run only on the genuine approved record. Synthetic fixtures exercise separate positive/negative cases and cannot supply its acceptance.

### Strict producer provenance and retained lineage proof

Task 5 creates checker-only `scripts/lib/runtime-review-grammar-v0.4.1.mjs` and `schemas/runtime-review-lineage-proof-v1.json`. The grammar is reviewed checked-in checker source, not selected executable code. It carries the complete closed producer-0.4.1 event/startup/runtime grammar and reduction/receipt semantics required by the actual normal protocol, including the exact optional author shape, all persisted event/attempt/identity transitions, terminal coherence and recursively sorted canonical event digest with the producer's terminal-event exclusion rule. It preserves full input bytes and rejects unknown keys/types/version profiles, missing events, fabricated actors, altered author fields and incoherent receipts. Repository 0.4.0 public runtime grammar remains unchanged and its real incompatibility remains a required negative.

The supported profile pins the actual reviewed producer package identity and every relevant producer module digest (startup grammar, event validator/reducer, record-lineage inspector and receipt algorithm), plus the checker importer source digest. The local generated receipt binds those exact observed installation/module bytes and producer package identity to the actual review's startup-request and request-digest-linked runtime snapshot, original event/attempt bytes and manifest. Verify snapshot manifest raw/canonical digests, exact declared inventory, every regular-file byte/size/mode, entrypoint/Node selection and the snapshot module hashes; preserve the linkage to the launch receipt and protocol startup. Independently hashing an unrelated installation is insufficient. Missing startup/snapshot/launch linkage remains a blocking provenance prerequisite. A package version string, adapter version, source hash list or caller declaration alone cannot select a trusted profile. The profile/provenance receipt is independently inspected from actual installed source and ordinary-reviewed evidence; unknown package/module identity refuses. The selector supplies immutable data references only; the checker never imports/runs selector-chosen JavaScript, a scratch runtime package, or an untrusted pinned revision.

Task 5 creates document-only `verifyRuntimeReviewLineage({workspace,reviewReference,producerProfile}):RuntimeReviewLineageProof` as the local full-verification seam. It reads original private event/attempt bytes, verifies the complete profile and closed reducer, exact author/reviewer identity, accepted normal decision, manifests/member/artifact bytes and terminal author Git transaction, then emits only reviewed public facts. Output path: `evidence/portable-runtime/contracts/review-lineage/<review_id>.json`; schema identifier: `ai-peer-review.runtime-review-lineage-proof/v1`. No raw event text, scratch state, private handle, credential or provider prompt is exported. Public facts include exact producer/package/module/importer identity, raw event/attempt byte digests, canonical receipt digest/algorithm identity, artifact/manifest/accepted-member refs, terminal commit/parent/blob/trailer pins, verified identity fingerprints and unchanged assurance, check outcomes, observation time and reproducibility classification.

The two verification boundaries are explicit:

- **Local generation/adoption:** complete actual-workspace/source replay is mandatory before a referenced proof receipt can be reviewed into the contract evidence. Missing workspace, strict source mismatch or any incomplete lineage refuses. Exact public receipt bytes are ordinarily reviewed with the immutable evidence; caller-written proof JSON is not accepted. The contract-record review's own terminal lineage can only be generated after its finalization and is bound separately by the governed approved-evidence transaction, avoiding self-referential record digests.
- **Git/CI adoption or publication:** verify the pinned normally reviewed receipt's immutable bytes, genuine generator/source profile, complete declared checks, exact target review/manifest/member/artifact/terminal references and approved evidence provenance. Do not require unavailable original private journals on the GitHub runner; explicitly report original private-event replay as unavailable here and consumed evidence as retained reviewed local verification. Missing/stale/mismatched/unreviewed receipt refuses. This remains the delivered unavailable/manual assurance, not external attestation or a claim the original events are reproducible from Git.

Tests pin unmodified real 0.4.1 normal collateral, stripped/altered author fields, unknown producer package/module identity, incoherent raw-versus-canonical digest claims, missing persisted events, wrong generator/source, unreviewed receipt and stale target references. Actual authentic positive receipt requires real local complete-event verification; fixtures prove refusal/grammar only.

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

Task 8 checks activation authority for every new public reservation and quarantine boundary. Here applicable means the exact selected-current installation, contract digest, source/tag/package identity, registration and supported platform/owned overlap scope; it never means optional proof. Contract-only checker success and having been published cannot satisfy `assertContractAdoption`, activation or quarantine.

Task 18 migration/release consumes the complete actual owner decision and a release-specific accepted activation addendum. Retain all original manual startup, ownership, unknown outcome, installed platform and all fifteen gate requirements. A supported maintenance recovery is available only for proved compatible current-global execution; otherwise preserved unsupported journals remain unresolved overlap obligations.

### Task 8 external registered authority transport

The activation addendum binds P's exact digest D and therefore cannot be embedded in P. Keep all authoritative records/addenda outside packaged paths. #102-owned setup/registration stores the independently verified public contract/addendum pair and approved immutable provenance in a protected OS-account selected-current registration store, separate from P and user project policy. #130 owns the versioned closed installation/registration-receipt schema; #102/#130 independently review its exact transport/read-back contract and Task 8 consumes it. Missing schema/interface acceptance or registration is a production integration blocker, not a caller fallback.

The setup/registration transaction validates normal contract/addendum acceptance, immutable approved evidence refs, exact pair linkage, complete independent activation/conformance obligations and the actual installed current package inventory/source identity before writing the protected receipt. At every effect and after waits, #102 selected-current read-back verifies registration ownership/integrity, stored pair/provenance, current Node/package selection and running installation bytes against those exact accepted release references. A caller path, environment value, arbitrary network response, stale receipt, ordinary policy field or publication status never grants authority. Remote retrieval, if later supported by the owners, must retain the same authenticated immutable approval and byte verification; this Plan adopts no unauthenticated fetch.

Task 8 consumes the genuine read-back through `assertContractAdoption({contractRecord,activationAddendum,approvedReference,registration,installedIdentity}):void`, before reservation under existing locks and mutable-observation revalidation. It independently requires activationAuthorized for the stored approved pair and exact running package. Replace the baseline invariant's single-argument call with this named argument object; carry the verified registration/pair into `reserveRun`'s sealed contract binding. No local setup receipt certifies deployed conformance by itself. Unknown/missing/tampered/swapped registration, contract/addendum mismatch, current selection change, older-tag addendum or installed digest drift refuses new effects. Preview retains all existing read-only/session-free/no credential refresh/write limits; genuine identical replay still precedes new capability/config checks.

### Task 18 activation sibling production and release consumption

Task 18 creates `schemas/runtime-activation-addendum-v1.json` with identifier `ai-peer-review.runtime-activation-addendum/v1`, coordinated with #30 immutable sibling linkage and independently accepted #102/#107/#30 binding. Store the authoritative release-specific document at `evidence/portable-runtime/contracts/activation/<release_tag>/<package_digest>.json`, outside every shipped path. The schema/record bind the exact immutable parent contract digest, C/T/D, registration/conformance references, accepted owner reviews, unresolved operational obligations and assurance; no in-place contract rewrite or self-reference.

Replace Task 18 interface `verifyPortableRelease` with `verifyPortableRelease({manifest,expectedMatrix,anchors,contractRecord,activationAddendum,approvedReference,gates}):ReleaseReport`. Resolve the exact approved pair, require parent-contract digest equality and exact C/T/D for P under verification, then verify every original matrix/signature/registration/source-class/manual-host gate. Contract-only reports never substitute for activation/publication results.

Amend release ordering step (3) (baseline line 1224): Task 18 assembles the release-specific activation sibling only after C/T/D are fixed and genuine required captures are available. Ordinary evidence review commit E includes finalized public bundles, immutable contract reference and separately accepted #102/#107/#30 activation sibling keyed to that contract and C/T/D; it never rewrites the contract. Step (4)'s approved-ref pins exact contract/addendum/review/proof-receipt references and approved E/R provenance; the consumer checks out C executable code, downloads original P/D and only public excluded evidence. Step (5) retains authenticated exact producer/consumer/run/artifact checks before all publication actions.

Amend lines 1225/1229 so assemble-portable-release-evidence and release.yml both pass the exact pair from approved-ref to `verify-portable-release` and `check-release-activation`; neither consumes an adoption-only report or verifies release identity against the contract alone. Keep all existing signed-tag, independent registration, immutable service artifacts, nine CI jobs, declared manual rows and source-class controls.

Replace only the adoption arguments in the Task 18 consumer command (baseline line 1480) with:

```sh
node scripts/verify-portable-release.mjs --manifest .scratch/peer-review/release-evidence-manifest.json --matrix test/fixtures/release-capability-matrix.json --anchors .scratch/peer-review/anchors.json --contract-adoption evidence/portable-runtime/contracts/runtime-contract-adoption.json --activation-addendum .scratch/peer-review/runtime-activation-addendum.json --approved-ref .scratch/peer-review/evidence-approved-ref.json --gates test/fixtures/release-gates.json --output .scratch/peer-review/release-report.json
```

Task 18's validate-consumer-inputs resolves the exact immutable addendum selected by authenticated approved-ref, verifies its original path/revision/blob/digest, and materializes those same bytes at the fixed scratch input path above. That scratch copy has no independent authority or latest-by-name semantics; every downstream consumer rechecks it against the original approved immutable reference and exact release. Missing/unknown/mismatched selection refuses. Executable workflows invoke Node with argument arrays, never interpolate free text as code. All other consumer commands remain unchanged.

### Gate traceability

Gate 8's historical #102/#107 choice blocker becomes: exact whole-bundle owner adoption, release-specific source/tag/tarball/registration and genuine old-family exclusion/drain/migration conformance. Resolving the first does not clear the rest.

Gate 15's policy-source choice blocker becomes: exact ownership adoption plus separately accepted #130 detailed schemas and Task 7 source/defaults/profile/array conformance. Its fixture-class phrase 'exact config precedence' becomes 'adopted primary/user source-ownership classification' under bundle A; profile-array/source-pointer/default/cap requirements remain. No dependency is removed.

Gates 3/10/11/12 retain their #30/#34/#109 schema/evidence dependencies. All gates remain required for publication.

## Reconciliation implementation sequence

- [ ] Freeze this amendment and the bounded owner addendum as separate tracked review subjects. Perform manual author SAR and actual independent normal plan review with exact bytes.
- [ ] Obtain each owner's bounded native adoption and plan-review references; preserve broader unfinished plans and absence of #130 schemas.
- [ ] Apply only the listed canonical plan changes; repeat review of the exact affected canonical plan. Root updates #144 VC mapping through native governance only after this acceptance.
- [ ] TDD the explicit mode, atomic bundle, immutable record/addendum separation, full closed normal manifest grammar and persisted event/source identity. Negatives include adoption-only report used for publication, addendum parent-contract mismatch, older-tag/different-D addendum, missing #109 owner, missing registered runtime authority and wrong strict producer/profile. Record genuine RED before code and GREEN afterward.
- [ ] Include the actual strict importer mismatch as a version compatibility negative. A matching unmodified producer proves its own event grammar; unknown or mismatched grammar refuses. Do not change source 0.4.0 public runtime or normalize/strip event fields.
- [ ] Prepare and normally review the immutable contract JSON at a pinned evidence revision, then generate a selector through the authorized genuine evidence transaction. Tests cannot stand in for owner reviews.
- [ ] Run affected host tests and destination lint/format; complete exact-head hosted CI and native Test serialization before reporting CODE_COMPLETE.
- [ ] Keep publication/activation denied until the later release-specific addendum and every operational gate are actually complete.

## Acceptance boundary

This amendment changes Task 5's completion evidence boundary and names the remaining integration gates. It neither supplies owner adoption nor weakens production proof. Draft acceptance is not a final canonical source-plan acceptance; the exact applied canonical plan receives repeat normal review before native issue mapping.
