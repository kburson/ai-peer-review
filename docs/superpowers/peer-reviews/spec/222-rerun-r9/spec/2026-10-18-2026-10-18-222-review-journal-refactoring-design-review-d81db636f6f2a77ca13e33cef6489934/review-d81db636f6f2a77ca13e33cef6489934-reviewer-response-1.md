<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d81db636f6f2a77ca13e33cef6489934"
role: "reviewer"
turn: 1
commit_mode: "no-commit"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md"
artifact_commit: "d213adfdc9e1b3f8f35c1dd018ba017bf969503e"
artifact_blob: "83f702202f3c269647812690a9e95791a5e24837"
artifact_digest: "sha256:51647cfa5aca488971682b37df073c5d5ecfbb25e5c608fe7253df7ec0b1e259"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:3c9d73966dd330b8a261482b7db6d75855e4dbb92db9ef6564875e74928eaa9b"
  identity_source: "runtime"
started_at: "2026-10-18T14:41:55.106Z"
submitted_at: "2026-10-18T14:45:22.208Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

## Summary

Independent XPR of revision 9 (`revision_id: issue-222-r9`, `based_on_commit: d8f31d41374fb37f9125b65dbbaa76df52f5fec8`) of the #222 journal refactoring specification. Scope: the full document, concentrating on what changed since the XPR-accepted revision 6, as shown in the retained `docs/superpowers/peer-reviews/222-spec-xpr-rerun/spec-r6-to-r9.diff`. The changes are the new §4.3 (repository context and acceptance provenance), the new §4.4 (review collateral, turn commits and reconstruction), ACs 11–14, the narrowed Git-finalization wording in §4.2 and the §9 handoff sentence. The sections carried over from revision 6 still read consistently with the earlier acceptance. I found no regression in §§1–3, §§5–7 or ACs 1–10.

Review basis and limits:

- I read the artifact at `docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md` and the sealed snapshot `.scratch/peer-review/review-d81db636f6f2a77ca13e33cef6489934/artifacts/start.md` in full. Their text is identical on reading. I did not compute a digest independently because shell hashing was unavailable to this session. I rely on the protected `artifact_digest` in this response's frontmatter.
- Reviewer checkout commit: this session was instructed not to use Git and could not run `git rev-parse`. The session-start environment reported this same worktree on branch `codex/aipr-journal-refactoring` with latest commit `d213adf` (abbreviated). That is consistent with the protected `artifact_commit` `d213adfdc9e1b3f8f35c1dd018ba017bf969503e`. I did not observe the full reviewer HEAD myself, so it is recorded here as unavailable rather than assumed. The current response format has no `reviewer_commit` field, as R1-F004 discusses.
- I checked the source claims against code: `src/collateral/responses.mjs` (protected response metadata keys, finding-ID grammar, the submission checks) and `src/cli/run-core.mjs` (no-commit snapshots at lines 1400–1415, 2851–2857 and 3744–3768; the normal-mode clean-artifact requirement and commit binding at lines 2838–2844 and 2863–2871). I also checked the prior XPR index in `docs/superpowers/peer-reviews/222-spec-xpr/README.md` and the startup and invitation documents for this review.

The direction of revision 9 is sound. Keeping the final FUR plus one reversible diff per revision is a simpler and adequate squash-safe design. The separation between FUR reconstruction and repository-context comparison (§4.4, last paragraph) is correct and important. The acceptance-provenance rules in §4.3 are careful about not strengthening claims. The main gaps are in how the new mechanism attaches to reality:

1. The revision chain is defined per in-review cycle, but this very artifact shows edits made between reviews and a predecessor with no `revision_id`.
2. The spec never says who writes the diff or from which bytes.
3. The turn-publication model does not fit either existing `commit_mode` or the live turn flow.
4. `reviewer_commit` is assigned to the reviewer, but the reviewer cannot write protected frontmatter.
5. `revision_id` uniqueness is required but never enforced.

Each of these could lead to an implementation that silently loses or misattributes revision history, which is exactly what §4.4 is meant to prevent. Revisions are requested.

## Findings

### R1-F001 — Revision chain does not cover inter-review edits, legacy predecessors or non-accepted chain heads

Severity: major.

§4.4 defines the chain per review cycle. The "Revision chain" bullet requires one forward diff per changed FUR within a cycle. "Every cycle" ties each diff to a cycle. "Reconstruction" starts "with the exact last accepted FUR" and checks "the expected digest and `revision_id` at every step". The collateral list instead says "one … diff per committed revision". These definitions diverge, and none of them covers the transition this review is itself performing:

- Revision 6 was XPR-accepted (SHA-256 `c6bc93ef…133db`, per the 222-spec-xpr README). Its bytes have no frontmatter and so no `revision_id`. The r6→r9 diff begins `@@ -0,0 +1,5 @@` adding the frontmatter.
- Revisions 7 and 8 were never reviewed. The retained package has one r6→r9 diff and no r6→r7 or r7→r8 diffs. Under "one diff per committed revision" this package would be noncompliant if r7 or r8 were ever committed. Under "per cycle" the r6→r9 diff is outside any cycle, so nothing in §4.4 requires it, assigns it or links it.
- The current tree FUR is r9, not the last accepted FUR (r6). Reconstruction cannot start from "the last accepted FUR" when later unreviewed or unaccepted revisions exist on top of it. To recover r6 you must start from r9 and reverse the boundary diff.
- Per-step `revision_id` checking fails for any predecessor that predates the frontmatter requirement, such as r6. §4.3 forbids backfilling historical bytes.

The sentence "A later review pattern continues or explicitly links the existing revision chain across SAR/SPR/XPR boundaries" says a link must exist, but not what it contains. It also does not say who produces the boundary diff when the author edited between reviews. Each review has its own manifest, so a post-squash reconstructor must be able to find the predecessor review's manifest from the successor's manifest alone.

Failure mode: an implementation that follows §4.4 literally reconstructs only within one review instance. It loses or misattributes every author edit made between reviews, and it fails on any legacy predecessor.

### R1-F002 — The diff producer and its byte source are unassigned

Severity: major.

§4.4 requires "one separately named reversible FUR diff per committed revision", but never says who writes it or from which bytes. Under §3.1, AIPR may write only "its declared coordination state and designated review documentation". The author startup document limits the author to the FUR and its own author response. The reviewer is limited to its response. As written, no participant is authorized to write the diff file.

The byte source matters more than the writer. AIPR already seals the exact reviewed bytes in no-commit mode: `artifacts/start.md` (run-core.mjs:1400–1415), `artifacts/turn-N.md` (3744–3768) and `artifacts/phase-NN-<kind>.md` (2851–2857). These snapshots live in the transient `.scratch` workspace, which is exactly where a correct diff can be computed. A producer that instead runs `git diff` against HEAD, or reads the working tree at publication time, will substitute committed or later bytes. §4.4 explicitly forbids that ("must not substitute different committed bytes or an empty file"), but it gives no rule that prevents it.

The diff is also a new durable document. §4.1 requires every emitted durable document to identify its schema or format version. A patch file cannot carry metadata without changing its bytes, so the format identifier has to live in the manifest entry. §4.4 lists "patch direction" but no patch format or version.

### R1-F003 — Turn publication conflicts with the existing commit modes and the live turn flow

Severity: major.

§4.4 "Turn publication" requires a dedicated commit after each completed cycle. That commit contains the revised FUR, both responses, the manifest turn record and the cycle diff. Existing behavior differs in both modes:

- **`normal` mode:** the author must commit the revised artifact before handoff. `APR_ARTIFACT_DIRTY` is raised at run-core.mjs:2838–2844, and the revision is bound to `commit: observed.head` (2863–2871). That commit necessarily comes before the next reviewer response, so it cannot contain "both responses". It is also exactly the per-revision Git object that squash destroys, which revision 9 says is no longer needed.
- **`no-commit` mode:** no commit happens during the review. The startup document says "Do not create commits or push during a review turn". The next reviewer turn starts immediately on author handoff. There is no publication window between cycles.

The spec does not define:

- (a) the boundary of a "completed cycle". One natural reading is the review-response on revision N plus the author-response introducing revision N+1, but that is not stated.
- (b) whether the next handoff is gated on the previous cycle's publication.
- (c) what happens when publication is still pending and the FUR has already advanced again. The working-tree FUR no longer equals that cycle's result bytes, so a "dedicated review-turn commit" of the revised FUR is impossible without staging bytes reconstructed from a snapshot or diff. Nothing requires verifying those staged bytes against the manifest result digest.

AC 13 then requires per-cycle dedicated commits that the existing flow cannot produce. The spec says to "use the existing … facilities where their documented semantics fit", but it never says how §4.4 maps onto `commit_mode` values. It does not say whether normal mode stays, changes or is replaced.

### R1-F004 — `reviewer_commit` ownership conflicts with protected response metadata and the same-worktree topology

Severity: moderate.

§4.3 assigns the reviewer the duty to "reconcile and record the final context actually evaluated before submission". In the current format, the reviewer cannot write any frontmatter field. `src/collateral/responses.mjs` renders a fixed `METADATA_KEYS` list (lines 24–41). Submission rejects any protected change with `APR_PROTECTED_METADATA_CHANGED` (lines 871–881). This response illustrates the point: I cannot add `reviewer_commit`, and must report its unavailability in prose.

The reviewer invitation also requires the reviewer to "Join from a distinct session in the same physical worktree". In that topology the reviewer's checkout HEAD and the controller's HEAD are the same value by construction. "Do not … substitute the controller's HEAD" therefore cannot be implemented as a distinction there. What matters is when and from which bound checkout the value is captured, not whose process reads it.

There is also a version tension. §4.2 says the participant-response format (`ai-peer-review.response/v1` with `schemas/response-v1.json`) "remains current … it is not retired by this cleanup". §4.3 then requires a new mandatory field and, by its own closing paragraph, an explicit versioned field contract. The spec should state the resulting version decision so the two sections do not read as contradictory. Finally, unavailability needs a value distinct from the existing `null`, which already means "no commit" for `artifact_commit` in no-commit mode (render.mjs:572).

### R1-F005 — `revision_id` uniqueness is required but not enforced

Severity: moderate.

§4.3 and §4.4 require every changed FUR to carry a unique, stable `revision_id`. AIPR may not edit the FUR to supply or repair one. The spec defines no handoff validation, so the following pass silently and corrupt the chain identity that reconstruction depends on:

- an author changes content but leaves `revision_id` unchanged;
- an author reuses an ID that appeared earlier in the lineage;
- an author omits or malforms the frontmatter in a Markdown FUR under the new version.

"An unchanged-artifact cycle … reuses the unchanged revision ID" is only safe if reuse is tied to byte equality. The only available behavior is refusal with a recovery instruction to the external author, and that behavior and its verification are not specified. ACs 11 and 13 do not cover it.

## Required changes

1. **R1-F001:** Define the chain unit in §4.4 as each FUR state that is submitted to, or produced by, a review. Make clear that it is not every Git commit, and reconcile the collateral-list wording ("per committed revision") with that definition.
   - Require each review's start to record a predecessor link: predecessor review ID, manifest path and digest, and predecessor revision identity and digest.
   - When the submitted bytes differ from the last retained revision, also require a boundary diff from that revision to the submitted bytes, so edits made between reviews remain reconstructable.
   - Allow a predecessor that predates the frontmatter requirement to be identified by digest plus a manifest-recorded identifier, without editing its bytes.
   - Make reconstruction start from the retained chain head whose digest matches the latest manifest result, whether accepted or not, and report which revisions in the chain were accepted, under which pattern.
   - Extend AC 14 to cover post-acceptance unreviewed edits and a legacy predecessor without embedded frontmatter.
2. **R1-F002:** Assign the diff producer. The recommendation is AIPR, writing the diff as designated review documentation to a declared path. The alternative is the external publication workflow under the same byte-source rule.
   - Require the diff to be generated only from the exact sealed predecessor and result bytes, verified by digest, never from Git HEAD or a later working tree.
   - Require the manifest entry to record the patch format identifier and version alongside direction, path and digest.
   - Extend AC 13 accordingly.
3. **R1-F003:** Define the "completed cycle" boundary.
   - State how §4.4 applies to each existing `commit_mode`: whether normal mode's pre-handoff commit is retained, changed or replaced, and where no-commit mode's publication occurs.
   - Choose and specify one of three options: gate the next handoff on confirmed publication; allow deferred publication that stages the exact result bytes from sealed snapshot or diff material after a digest check; or allow batched publication of several cycles in one commit, with all diffs.
   - In every case, require publication to verify that the staged FUR digest equals the manifest result digest for that cycle.
   - Align AC 13's "dedicated review-turn commit" wording with the chosen option.
4. **R1-F004:** Specify that AIPR captures `reviewer_commit` as protected metadata at reviewer submission, from the checkout bound to the reviewer session.
   - In the default same-worktree topology the value legitimately equals the shared worktree HEAD, captured at submission rather than at draft creation.
   - Define how a reviewer working in a different checkout gets that checkout bound.
   - Define an explicit unavailable value that cannot be confused with `null`/no-commit.
   - State the response-format version decision that reconciles §4.2's "response-v1 remains current" with §4.3's new mandatory field.
5. **R1-F005:** Specify refusal at handoff for Markdown FURs under the new version in three cases: content changed but `revision_id` unchanged; a `revision_id` already used earlier in the lineage; missing or malformed revision frontmatter.
   - Specify that reusing an ID is valid only for byte-identical bytes.
   - Add these refusals to AC 11 or AC 13.

## Optional suggestions

### R1-F006 — Add a round-trip check when each diff is generated

At generation time, apply the reverse patch to the result bytes in a separate destination. Confirm it yields exactly the predecessor digest before writing the diff or recording the manifest entry. This catches lossy patch formats, CRLF/no-final-newline handling and encoding problems when the diff is created, rather than when someone first tries to reconstruct after squash. It is cheap and directly supports §4.4 "Exact reversible patches". Consider naming a concrete binary-safe patch representation, for example a full-index binary-capable Git patch, as the initial supported format.

### R1-F007 — Make the post-squash plan-generation consequence explicit

§4.3 "Later plan generation" resolves each `acceptance_head` in the repository. Under the squash-merge workflow in §4.4, branch-local acceptance SHAs will usually be unreachable after merge. Every post-squash plan generation would then hit the "missing objects … cannot silently pass" path and need an owner disposition. That behavior is correct, but the spec could say so directly. It could also recommend one of: generating the plan before the squash merge; retaining a non-moving ref for acceptance commits under existing governance; or accepting the owner-disposition path. This avoids a routine planning step looking like an anomaly.

## Decision

revisions-requested
