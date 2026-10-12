<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-5c332d239bdb1535dd319816d3228888"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md"
artifact_commit: "ba59707afeb5da730d8f19879f0a54068119ec67"
artifact_blob: "a708dc334fb457e05d826697c049bb80d00d85c4"
artifact_digest: "sha256:fbc61642c772f372c3881a942596fbe6dbc9a166c69fde937f6482e6a3971c30"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6.1-sol"
  model_display: "gpt-6.1-sol"
  session_fingerprint: "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
  identity_source: "runtime"
started_at: "2026-10-12T01:54:54.202Z"
submitted_at: "2026-10-12T02:17:09.678Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Revised the proposal into an explicitly conditional design. No scoped retention
or resident worker is implemented/admitted. The source remains at ba59707;
only this owned specification and pending response changed.

## Finding dispositions

1. Addressed the post-effect boundary explicitly. Scope completion is an integrity
   adjunct, preserves pre-effect fences, records actual producer effect state
   and privately retains its real receipt/result. Post-effect failure reports
   committed/unknown/no-effect plus uncertain scope completion, with no rollback
   or automatic retry. Added the committed-effect/late-selection race control.
2. Added the per-store signal/deadline WeakMap registry, lexical association,
   five-state table, clean tombstones versus permanent poisoned keys, sibling
   versus nested semantics, ordinary one-shot cases and uncertainty barriers.
   Cleanup discharges resources without making an old poisoned key reusable.
3. Borrowers must freshly compare the complete copied directory/home/uid/principal
   tuple. Principal is obtained through checked system.userId, including actual
   Windows SID rather than uid alone. Added both-platform principal controls.
4. Named withSelectionReadScope through the explicit selectionScope function port.
   Production factory requires it; isolated core fixtures may deliberately omit
   it and stay unscoped, or provide an unverified fixture port. Only guarded
   register/activate are wrapped, before admit(original). Review-history methods
   are excluded. Longer caller deadlines refuse rather than clamp at scope entry.
5. register/update/dry-run refuse while any scope is open/closing/uncertain on
   that store. read participates; location is unchanged. Added the resealing
   rejection control.
6. The existing aggregate complete counters cannot supply attributed N; I have
   not invented it. Added explicit source-derived per-admission query counts,
   a reduction formula, the explicit-path illustrative lower bound, and an
   admission gate requiring actual context/caller attribution before scoped
   implementation. Thresholds: at least 75% fewer selection acquisitions and
   at least 20 fewer full-operation stock root-query starts on both Node24/26.
   Marginal/missing data defers this proposal. Same-source diagnostic prototype
   comparison is required afterward, with the original failing candidate's
   loaded inputs untouched. The actual attributed dataset remains pending;
   conditional design acceptance is not implementation permission without it.

Optional suggestions addressed: borrowers use bounded FIFO serialization;
all acquisition/closure obligations remain reachable from the store/scope,
including the initializing portable-system post-open check path; bounded Windows
rename/delete hold is disclosed; spacing in measured numbers was corrected.

## Changes made

Expanded the owned specification's admission, identity, state, integration,
effect-reporting and required-controls sections. Preserved the earlier accepted
stock-worker artifact and all historical failed/current measurements unchanged.

## Declined changes and rationale

An attributed positive dataset cannot be derived from aggregate V8 counters.
No source helper or candidate was changed during this sealed review. I request
review of the conditional design and its explicit pre-implementation evidence
gate; no numerical savings or full Windows forecast is claimed. If actual
attribution is required before even conditional design acceptance, it remains a
real pending item rather than a fabricated result.

## Verification

Read the full reviewer response and cited current production source. The owned
specification passes Prettier and markdownlint (one actual file). CSpell's project
configuration excludes docs/superpowers, so it did not check this artifact.
No new tests, production edits, Git commits, context changes, budget changes or
candidate transformations occurred while preparing this response. Prior b58e95f
controls remain actual four descriptor checks plus70affected passed tests.
