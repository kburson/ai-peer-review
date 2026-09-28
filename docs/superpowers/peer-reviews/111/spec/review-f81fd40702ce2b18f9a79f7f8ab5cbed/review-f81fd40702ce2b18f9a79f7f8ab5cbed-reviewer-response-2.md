<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-f81fd40702ce2b18f9a79f7f8ab5cbed"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/20260927-111-spec.md"
artifact_commit: "e27eebed4dd2fbcfda41f321bd55390c594add06"
artifact_blob: "c929bb3d4f18de4e43c2bb93197de2157f438cbc"
artifact_digest: "sha256:ffd94625ab35fd73bd44e61f1264c5970c09f7e3dde10f18edf98811511ec018"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "claude-opus-5"
  session_fingerprint: "sha256:4470c577451013bd160c8d21404026ebbf5ac26e5d84d2839c15ba814d83cb4b"
  identity_source: "runtime"
started_at: "2026-09-28T04:24:23.179Z"
submitted_at: "2026-09-28T05:08:55.655Z"
finding_ids: ["R2-F001","R2-F002"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

All four required findings and both optional suggestions from turn 1 are
substantively addressed. I re-verified the underlying facts independently rather
than accepting the author's dispositions, including the claims the author made
about evidence I had cited.

Verification of the revision, finding by finding:

**R1-F001 — resolved.** Lines 289-294 now inventory "relocation and consolidation
receipts" alongside startup files, invitations, manifests, and summaries. Lines
296-308 add the missing chain node explicitly and accurately: I re-read
`docs/superpowers/peer-reviews/relocation-receipt.json` and confirm the recited
source commit `1181d7f82309b96ae24089e890b2dc789e8eb5c4`, relocation commit
`9e6059c4e6b67ad8084e948ae1c5da52d189fcb3`, 55 byte-identical files, and one
changed generated history file are all correct. I also located the single
non-byte-identical entry to confirm the author's characterization rather than
trusting the summary count: it is
`spec/2026-09-12-project-local-review-lifecycle-and-learning-design-review/00-review-history.md`,
7602 bytes at `sha256:49009e33…` becoming 7601 bytes at `sha256:ce6ac51a…`, with
`"byte_identity": false`. The two digests are genuinely distinct, so the design's
new assertion at lines 341-343 — that this hop "cannot be called path-only merely
because this migration preserves its current bytes" — is factually grounded.

The three sub-problems I raised map onto specific new text. Root-reuse collision:
lines 303-308 require the manifest to declare reuse of the former source root,
identify every chain node "by repository, commit, path, and digest, never by
current path text alone," and record each receipt's revision-bound validity "so
old destination checks cannot accidentally resolve against a newly occupied
working-tree path" — which is exactly the hazard. Receipt inventory: lines 291-292.
Multi-generation composition: lines 334-343, where "The chain's claim includes
every hop and is limited by its least-proven hop" is a stronger and cleaner rule
than the one I asked for. Acceptance coverage at lines 470-472.

**R1-F002 — resolved.** Line 131-132 now states the frozen baseline "includes
`startup.md`, `invitation.md`, and `manifest-template.md`." The delayed-rendering
window I identified is closed directly at lines 136-138: startup evidence retains
"the selected manifest template bytes/digest," and the design now requires
rendering "the eventual manifest from that retained template, never from a later
parent copy." Tamper detection is extended to "all three templates" at line 141,
the override example at line 84 adds the review-local `manifest-template.md` that
was previously missing from the `review-02/` tree, and line 450-451 adds the
acceptance check for rendering after a parent template edit. Line 151's statement
that the parent manifest template is "never inherited outcome evidence" remains
consistent with freezing it as an input.

**R1-F003 — resolved, and resolved the right way.** Lines 413-426 define the
issue-less mode's scope key as "repository identity, artifact kind, and stable
`record_id`," freeze its inputs at that execution's own startup, and explicitly
decline to allocate issue-bound `review-NN` numbers or synthesize an issue parent.
I checked this against the code and it is coherent: package templates are read
from within the package at `src/templates/index.mjs:81-86`
(`readFileSync(new URL('../../templates/<name>.md', import.meta.url))`), not from
the repository tree, so an issue-less execution genuinely has a determinate
template source without needing an issue-parent directory. Line 419 requiring
exclusive reservation of "actual output paths across all routing scopes" closes
the lock-domain concern, since two different records or custom templates that
render to the same path are caught at the path layer rather than the scope layer.
The author's choice to decline issue-bound counters here is correct, not evasive.

**R1-F004 — resolved.** Lines 169-180 add the record-to-execution rules that were
missing. The separation of active selection from accepted evidence is the right
decomposition, and the specific failure case I described is answered at lines
175-178: "A newer abandoned or terminated sibling does not replace an earlier
accepted outcome or invalidate it merely by having a higher number," with the
converse guard that historical acceptance is not acceptance "of a different
artifact revision or of the newer execution." Line 178-180 excludes review number,
timestamp, and projection order as selection rules, matching the existing
prohibition on highest-suffix reasoning at lines 165-167. Acceptance coverage at
lines 460-463.

**R1-F005 — resolved.** Line 434-435 broadens the criterion from "response
filenames" to "any path segment," and correctly carves out the issue-less
compatibility route so the criterion does not contradict line 409's preservation
requirement.

**R1-F006 — resolved.** Lines 272-276 now name the ordered closed-key constraint
("requires the closed metadata key set in exact order and renders that same
order"), which matches `responses.mjs:226-236` and `renderFrontmatter` at
`responses.mjs:152-165`, and require retaining "the pinned v1 key-order reader for
original legacy bytes alongside the new versioned reader," with the explicit
prohibition that "adding a new-schema field must not reinterpret a v1 record."

On the status change: the author also updated frontmatter `status` from
`sar-reviewed-xpr-deferred` to `xpr-in-progress` and revised lines 212-214 and
499-500 accordingly. This was disclosed in "Changes made" rather than slipped in,
it corrects prose that had become factually stale the moment this cross-provider
review started, and it is carefully bounded — line 213-214 states the XPR
authority "does not grant implementation, migration, or plan acceptance," and line
499-500 keeps implementation and migration as separate work. It manufactures no
approval and I have no objection.

The two items below are genuinely optional. Neither affects a safety property, and
I am recording them for the planning phase rather than holding the design.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R2-F001 — Say how a parent instruction baseline is first materialized

The R1-F002 fix expanded the frozen baseline to three files and extended tamper
detection to "prohibited baseline edits to all three templates" (line 141). That
sharpens a question the design does not answer: where the parent
`docs/peer-reviews/<issue>/<kind>/startup.md`, `invitation.md`, and
`manifest-template.md` come from the first time an issue is reviewed. Today no such
files exist anywhere in the tree — templates are package-internal
(`src/templates/index.mjs:81-86`) — so on the first review under the new layout the
parent directory is empty. Line 125 says starting the first review "freezes its
parent defaults," and line 485-486 repeats it, but both presuppose that the parent
files already exist.

The correctness hole is smaller than it first appears, and that is why this is
optional rather than required: lines 134-136 require the exact selected template
bytes and digest to be retained in startup evidence, so whatever is selected is
captured per execution, and line 127's "inherit the fixed baseline" then resolves
against retained evidence rather than against a live package version. A package
upgrade therefore cannot retroactively change a frozen baseline even if the seed
came from the package. What remains undefined is narrower but still worth pinning
down in planning: whether the three parent files must be materialized on disk
before the first review (making tamper detection meaningful), or may remain absent
with package templates as the recorded selection (making line 141's edit detection
vacuous for that issue). Stating the intended answer would also clarify how line
128-129's "no fallback after a missing or corrupt recorded input" applies before
anything has been recorded, which currently reads as if it might forbid the seeding
step itself.

### R2-F002 — State the working-tree disposition of prior receipts, not just their validity

Lines 306-308 now require preserving "original receipts unchanged at their retained
revisions" with additive successor mappings and revision-bound validity. That
settles how a receipt is *interpreted* after migration. It does not settle whether
the receipt file itself stays in the working tree.

The concrete case: `docs/superpowers/peer-reviews/relocation-receipt.json` sits at
the root of the very tree being migrated. Once receipts are inventoried as legacy
collateral (line 291), the apply step's instruction to "remove the mapped legacy
working-tree files" (lines 376-377) plausibly captures it, leaving the receipt
reachable only through Git history. Both outcomes are defensible and both remain
safe under the design's existing rules — "Never remove the retained historical Git
source" (lines 378-379) still holds, and revision-bound validity means a
working-tree copy is not required for verification. But line 406's instruction to
"Retain legacy readers and explicit old-path mappings for evidence verification"
reads more naturally if at least the mapping survives in the working tree. A single
sentence saying whether receipts are relocated, left in place, or superseded by the
new migration manifest would remove the ambiguity before a planner has to guess.

Minor and unrelated: the insertions left a few lines past the repository's
100-column `printWidth` (for example lines 460-461 and 472). Prettier's default
`proseWrap: "preserve"` means `format:check` will not flag them, so this is purely
cosmetic consistency with the surrounding ~80-column prose, not a lint failure.

## Decision

accepted
