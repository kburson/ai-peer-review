<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-f81fd40702ce2b18f9a79f7f8ab5cbed"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/20260927-111-spec.md"
artifact_commit: "417c30951e67e37afd6c4d76ef635deac788e7f4"
artifact_blob: "ff15cf3889e5c0e41468aaaea760b92123f0ef8e"
artifact_digest: "sha256:048276df160ae486ed7ecf4462e350f41d04ab59f3f2b222409c1edd93a79fdf"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "GPT-6 Astra"
  session_fingerprint: "sha256:02f18e851df868c88e6dbf81b64eb2db551c072126db9560b0afa5fe33b40ed6"
  identity_source: "runtime"
started_at: "2026-09-28T04:23:16.097Z"
submitted_at: "2026-09-28T05:06:09.850Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Revised the specification to address all four required findings and both optional
suggestions. The revision defines migration-chain provenance across the prior #65
relocation, freezes manifest templates with instructions, preserves an explicit
issue-less compatibility route, and separates record-level active execution from
accepted outcome evidence. It also broadens the canonical-path check and names the
legacy parser's exact-key-order contract. These are design clarifications only;
no runtime implementation, historical migration, or issue-state change occurred.

## Finding dispositions

### R1-F001 — Addressed

Verified the tracked repository relocation receipt, including its original source
and relocation commits, 56 mappings, 55 byte-identical entries, and one changed
generated history entry. Read the two recorded history blobs directly from Git and
independently computed their SHA-256 digests; both match the receipt and differ
from each other. This confirms that treating the complete chain as path-only would
be incorrect even if the next hop preserved current bytes.

The Migration scope and evidence model section now inventories relocation and
consolidation receipts, explicitly records the prior root reuse and #65 commit
link, identifies chain nodes by repository/commit/path/digest, and preserves each
old receipt at its retained revision with additive successor mappings. Its
transformation rules now classify and verify every hop separately. A later
byte-identical hop cannot upgrade an earlier unproven transformation. Generated
history may remain historical derived material without carrying approval; if
review eligibility depends on its changed representation, unproven equivalence
requires fresh review. Unresolved required evidence still blocks application.
The acceptance criteria include these multi-generation cases.

### R1-F002 — Addressed

The frozen baseline explicitly includes startup.md, invitation.md, and
manifest-template.md. Complete review-local overrides apply to each, and the
example tree shows the manifest-template override. Startup evidence retains the
selected manifest template bytes and digest; final manifest rendering uses those
retained inputs. Parent tamper detection covers all three templates. This closes
the delayed-rendering window without treating a manifest template as outcome
evidence. Added an acceptance check for rendering after a parent template edit.

### R1-F003 — Addressed with the minimal compatibility route

The issue-less mode now explicitly retains the existing configured path-template
and full record/execution-ID routing contract. It does not adopt issue-bound
review-NN allocation or an invented issue-parent baseline. Its coordination domain
is repository identity, artifact kind, and stable record_id, with the record bound
to retained artifact identity. Replacement executions retain that scope and obtain
distinct review_id values. Actual output paths remain exclusively reserved across
routing scopes, so custom paths cannot collide merely because records differ.

Each issue-less execution retains complete startup, invitation, and manifest
inputs locally and freezes them at its own startup. No shared baseline or issue
number is synthesized. This preserves the current capability confirmed in
src/collateral/paths.mjs, where an issue is required only when the selected
template contains the issue placeholder. It avoids introducing a second numbered
layout outside the user-approved issue-bound layout. Added compatibility fixtures
to the verification contract.

### R1-F004 — Addressed

Added explicit record-to-execution resolution rules that separate active work from
accepted evidence. Active selection requires validated lifecycle and supersession
lineage, with unique eligibility or a reported conflict. Accepted evidence requires
a unique accepted terminal authority bound to its precise artifact revision and
review class; conflicting accepted executions require reconciliation, matching the
existing consolidation check in src/collateral/review-record.mjs.

A newer abandoned or terminated sibling does not supersede earlier acceptance
solely because it has a higher number. That earlier acceptance also cannot become
acceptance of a different revision or the newer execution. Review number,
timestamps, and projection order are explicitly excluded as selection rules.
Added verification cases for those distinctions and conflicts.

### R1-F005 — Addressed

Broadened the criterion from leaf filenames to every canonical issue-bound
response-path segment. The criterion explicitly separates the retained issue-less
compatibility route so it does not contradict the required preservation of legacy
custom routing.

### R1-F006 — Addressed

Verified that src/collateral/responses.mjs compares both the complete metadata key
set and each key's ordinal against METADATA_KEYS. The frontmatter contract now
names that ordered closed-key constraint, requires the pinned v1 reader for original
legacy bytes alongside the new versioned reader, and prohibits interpreting a v1
record as a new schema merely because fields were added.

## Changes made

Updated only docs/superpowers/specs/20260927-111-spec.md and this exact generated
author response. Updated the specification's stale XPR-deferred status and prose
to reflect the subsequently authorized current review, while preserving separate
implementation, migration, and plan-acceptance boundaries. The prior reviewer
response, protected response metadata, original relocation receipt, source code,
and historical Git evidence are unchanged.

The package setup skill update, existing executable-mode changes, native build
outputs, and ignored local runtime installation predate this revision and are not
part of its protocol-owned commit paths.

## Declined changes and rationale

None. The issue-less finding is resolved through explicit legacy routing and
execution-local freezing rather than applying issue-bound counters to records that
have no issue; this is the compatibility mode already required by the design.

## Verification

- Read the complete sealed reviewer response and checked its cited receipt,
  response-parser, routing, and consolidation behavior against current source.
- Verified both recorded historical generated-history files exist in their exact
  source and relocation commits. Computed SHA-256 for each Git blob and matched
  both values to the unchanged receipt; confirmed the blobs are not identical.
- Ran the repository Prettier on the revised specification; it was unchanged by
  formatting. A subsequent scoped Prettier check passed.
- Ran git diff --check successfully after the specification revision.
- Preserved this generated response's protected frontmatter verbatim and confined
  author prose to its generated body sections. Protocol submission will populate
  computed metadata and seal the final bytes through the supported command.
- No runtime tests were required: this turn changes specification and review prose
  only. The specification now requires targeted future verification for all added
  design contracts; it does not claim those behaviors are implemented or tested.
