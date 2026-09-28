<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-f81fd40702ce2b18f9a79f7f8ab5cbed"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/20260927-111-spec.md"
artifact_commit: "417c30951e67e37afd6c4d76ef635deac788e7f4"
artifact_blob: "ff15cf3889e5c0e41468aaaea760b92123f0ef8e"
artifact_digest: "sha256:048276df160ae486ed7ecf4462e350f41d04ab59f3f2b222409c1edd93a79fdf"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5"
  model_display: "claude-opus-5"
  session_fingerprint: "sha256:4470c577451013bd160c8d21404026ebbf5ac26e5d84d2839c15ba814d83cb4b"
  identity_source: "runtime"
started_at: "2026-09-28T04:24:23.179Z"
submitted_at: "2026-09-28T04:28:25.522Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

This is a strong, unusually disciplined design. Its central safety properties are
stated correctly and repeatedly: identity is carried by protocol evidence rather
than by path shape; `review.json` is a rebuildable projection that can never
manufacture acceptance; historical approval stays bound to its original revision;
preflight is read-only and stops on unresolved exceptions; and the legacy phased
executions are handled as an explicit compatibility exception with a single
canonical evidence owner rather than by duplicating acceptance. The transformation
taxonomy (path-only / formatting-only / frontmatter conversion / substantive) and
the insistence that link relocation is a relocation transformation rather than a
formatting exception are the right distinctions and are argued precisely.

I verified the specification's claims about the current code rather than accepting
them. They hold:

- `src/collateral/paths.mjs:143` does default `reviewsRoot` to `docs/peer-reviews`,
  and its default template `<kind>/<date>-<name>-<record-id>` plus the
  `${date}-${name}-${review-id}-` filename prefix (`paths.mjs:223-229`) does expose
  dates, artifact names, and execution IDs exactly as described.
- `src/provider/claude-launch.mjs` does infer turn numbers from filenames — at
  `claude-launch.mjs:397-398` (next-response projection), `:468-470` (neighbor
  derivation), and `:831-845` (resume checks) — and does enforce the same-directory
  invitation heuristic at `claude-launch.mjs:446`. Replacing these with resolved
  identity while preserving exact-file restriction is the correct framing.
- `src/collateral/responses.mjs:167-238` does search for the first `---` line
  anywhere in the document (so it currently tolerates leading HTML comments),
  does require a JSON-parseable restricted scalar encoding, and does reject
  duplicate keys. It additionally requires the metadata key set to match
  `METADATA_KEYS` in exact order (`responses.mjs:226-236`), which the design's
  "update parsing and validation explicitly" instruction covers.

The findings below are gaps and internal inconsistencies, not disagreements with
the design's direction. R1-F001 is the most consequential: it is a concrete,
already-existing evidence collision that preflight would hit on the first run.

## Findings

### R1-F001 — The new destination root re-occupies the recorded source root of the prior #65 relocation, and receipts are not inventoried

`docs/superpowers/peer-reviews/relocation-receipt.json` is tracked evidence from a
prior repository-level relocation. It records:

- `"schema": "ai-peer-review.relocation-receipt/v1"`,
- `"source_root": "docs/peer-reviews"`,
- `"destination_root": "docs/superpowers/peer-reviews"`,
- `"relocation_count": 56`, `"byte_identical_count": 55`,
  `"changed_generated_count": 1`,
- and 56 `relocations[]` entries each carrying `source_path`, `destination_path`,
  `sha256`, and `destination_sha256`.

This specification migrates collateral in the opposite direction, back to
`docs/peer-reviews` (lines 18-20, and the canonical tree at lines 64-98). Three
distinct problems follow, none of which the document addresses:

1. **Path-identity collision in the transformation chain.** After migration, the
   string `docs/peer-reviews/...` denotes *new-layout* files, while the retained
   #65 receipt uses that same root to denote *pre-#65 originals*. A reader
   resolving the "verified transformation chain to the current representation"
   (lines 311-313) across both receipts can land on a path that is textually
   identical but content-distinct. The design's own rule that identical relative
   link text can resolve to different content (lines 298-300) is precisely this
   hazard, but it is scoped only to links inside moved documents, not to the
   migration's own root selection. Chain resolution must therefore be keyed on
   `(commit, path, digest)` triples with the #65 receipt's relocation commit
   (`9e6059c4e6b67ad8084e948ae1c5da52d189fcb3`) as an explicit chain link, and the
   new receipt must declare the root reuse so consumers cannot silently conflate
   the two generations.

2. **Receipts are absent from the inventory scope.** Lines 267-269 enumerate
   "startup files, invitations, manifests, historical review summaries, and links
   in tracked documentation and issue records." Relocation and consolidation
   receipts are not listed, yet they are exactly the artifacts whose recorded
   `destination_path` values this migration invalidates. `review-record.mjs`
   generates and then re-verifies such receipts against destination paths and
   digests (`review-record.mjs:658-697`, `assertRegularDigest`), so a stale
   receipt is not inert documentation — it is input to an executable check that
   will fail after migration. Every prior receipt needs either a recorded
   superseding mapping or an explicit statement that it remains valid only against
   its retained commit.

3. **One prior file is not byte-identical, so transformation class 1 cannot
   cover the chain.** The receipt's `"changed_generated_count": 1` means the #65
   link is already not a pure path-only relocation. The four transformation
   classes at lines 283-295 are defined per-file for *this* migration and are
   silent on composing across a prior generation where one link was a regenerated
   file. The design must say how a multi-generation chain is classified when an
   upstream link was not digest-preserving — otherwise "path-only relocation
   preserves the exact content digest" is true of this hop and false of the chain,
   and a verifier has no defined answer.

### R1-F002 — `manifest-template.md` is excluded from the freeze guarantee, leaving a hole in "later parent edits cannot affect an existing execution"

The freeze section makes a strong, explicit promise at lines 134-135: `review.json`
references retained startup evidence and "later parent edits cannot affect an
existing execution." But the freeze is defined only over instruction templates.
Lines 130-133 require preserving "exact selected template bytes, their source
revision/path/digest, and the effective resolved instruction bytes/digests"
specifically for `startup.md` and `invitation.md` (lines 129-130: "Parent
`startup.md` and `invitation.md` provide instruction templates"), and the
review-local override rule at lines 130-131 is scoped to "review-local files of
those names."

`manifest-template.md` sits in the same parent directory (lines 68, 90) but gets
only lines 146-148: it "is a template only, never inherited outcome evidence," and
"Every review generates its own `manifest.md`." Neither statement freezes it.
The override example at lines 80-84 reinforces the omission: `review-02/` lists
local `startup.md`, `invitation.md`, and `manifest.md`, but no local
`manifest-template.md`, so there is no defined way to override it either.

This matters because of *when* the manifest is produced. Instructions are consumed
at startup, so freezing them at first-review start closes the window. The manifest
is rendered at or near execution completion — potentially days and many turns after
the freeze. An edit to the parent `manifest-template.md` during that window changes
the outcome record of an execution that was supposed to be sealed, which directly
contradicts lines 134-135. State explicitly whether `manifest-template.md` is
inside the frozen baseline set (my recommendation), and if so, extend the retained
startup evidence to carry its bytes/digest and extend the tamper detection at
line 137 to cover it.

### R1-F003 — The issue-less routing mode has no defined scope key for review numbering or freezing

Two rules are stated in terms of an issue that this mode does not have:

- Line 100: "Review numbers are stable, never reused, and scoped to repository,
  issue, and artifact kind."
- Lines 123-124: "The issue's `spec/` and `plan/` directories each hold their own
  instruction baseline."

Line 360 then preserves reviews without an issue: "The package currently supports
reviews without an issue, so preserve that capability through an explicit alternate
routing mode rather than inventing an issue ID." That preservation requirement is
correct — `paths.mjs:169-179` only raises `APR_ISSUE_REQUIRED` when the template
actually contains `<issue>`, and the default template does not, so issue-less
reviews are genuinely supported today and must not regress.

But the specification never says what replaces the issue as the scoping key in that
mode. Concretely undefined: which uniqueness domain `review-NN` allocation serializes
over when there is no issue number; where the frozen per-kind instruction baseline
physically lives when there is no `<issue>/spec/` parent to freeze; and whether two
issue-less reviews of the same kind share one baseline or each carry a complete
local override. Because allocation "must reserve paths exclusively" and "serialize
competing local worktrees through shared repository coordination" (lines 212-214),
an undefined scope key is not cosmetic — it is an undefined lock domain, which is
exactly the collision class lines 214-216 require to be detected rather than
silently merged.

### R1-F004 — Selecting the authoritative execution within a `record_id` lineage is unspecified

The design is careful about selecting the authoritative *response* within a turn:
lines 158-159 require protocol evidence to support the selection, and lines 161-163
forbid resolving authority by highest suffix, newest mtime, or prose claiming
acceptance. It does not apply the same rigor one level up.

Lines 102-106 establish that a reboot "creates the next review folder, preserving
its failed or interrupted predecessor and recording explicit lineage," and that
"`record_id` groups related executions." So `review-01` and `review-02` under one
kind can be lineage siblings sharing a `record_id`. Line 156-157 then says
`review.json` "maps the human review number to `record_id`" — a many-to-one mapping,
since several review numbers share one `record_id`.

The gap: nothing defines how a reader given a `record_id` selects the current or
authoritative execution among its siblings. The obvious heuristic — take the highest
`review-NN` — is the direct structural analogue of the highest-suffix rule the
design already rejects at line 161, and it is wrong in a realistic case: if
`review-03` is started and then abandoned before producing any submission while
`review-02` reached a genuine accepted outcome, highest-number selection reports the
abandoned execution as current. That is precisely the failure mode line 234-236
prohibits ("A projection must not promote an abandoned recommendation into an
accepted outcome"). Define the evidence-backed selection rule for the
record-to-execution direction, including the case where lineage contains a
terminated execution newer than the accepted one.

## Required changes

1. Address R1-F001. Add relocation/consolidation receipts to the inventory scope at
   lines 267-269; require the migration receipt to declare the reuse of
   `docs/peer-reviews` as a root previously recorded as a `source_root`; specify
   chain resolution over `(commit, path, digest)` rather than path alone; and define
   how the transformation classes compose across a prior generation containing a
   non-byte-identical link.
2. Address R1-F002. State whether `manifest-template.md` is inside the frozen
   baseline, and if so extend retained startup evidence, review-local override, and
   tamper detection to cover it. If it is deliberately excluded, say so explicitly
   and narrow the guarantee at lines 134-135 so it is not overstated.
3. Address R1-F003. Define the scope key for `review-NN` allocation and for
   instruction-baseline freezing in the issue-less alternate routing mode, including
   its allocation-lock domain.
4. Address R1-F004. Define the evidence-backed rule for selecting the authoritative
   execution within a `record_id` lineage, explicitly excluding highest-number
   selection and covering abandoned or terminated newer siblings.

## Optional suggestions

### R1-F005 — Extend the first verification criterion to directory names

Line 371 reads: "Canonical output has no dates, titles, or repeated full IDs in
response filenames." The layout's benefit is broader than filenames — the whole
point of lines 19-20 is that dates, titles, session identifiers, and full protocol
IDs leave *path segments*, not just leaf names. As written, an implementation could
satisfy this criterion while reintroducing a dated or titled directory segment above
`review-NN`. Broadening it to "response paths" or "any canonical path segment"
closes that gap at no cost.

### R1-F006 — Name the exact-ordered-key coupling in the frontmatter contract

Lines 250-254 correctly flag that the current parser "accepts a restricted value
encoding and searches below comments for frontmatter." Worth naming explicitly: the
parser also requires the metadata key set to equal `METADATA_KEYS` in exact order
(`responses.mjs:226-236`), and `renderFrontmatter` emits in that same fixed order
(`responses.mjs:152-165`). Any added identity field therefore breaks the legacy
reader by construction, not merely by encoding. Since lines 256-257 already require
reading original legacy bytes for historical verification, calling out that this
implies a pinned v1 key-order reader retained alongside the new schema would make
the requirement unambiguous for the planner.

## Decision

revisions-requested
