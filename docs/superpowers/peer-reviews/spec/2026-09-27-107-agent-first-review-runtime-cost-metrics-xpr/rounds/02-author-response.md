# XPR Author Response - Round 2

- Issue: #107
- Requested author identity: GPT-6 Astra, high effort
- Reviewer: Claude Opus 5, high effort, as recorded in the supplied review
- FUR: `docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md`
- Review: `docs/superpowers/peer-reviews/spec/2026-09-27-107-agent-first-review-runtime-cost-metrics-xpr/rounds/02-review.md`
- Review SHA-256: `a64e93a7225b4441d6c3b494abdfd10f1a66e2ad4ef85781488a671da4a2b5c4`
- Before FUR SHA-256: `88cd3d9c13d37ae7ef23b5c5b95c41b5ee902e0133036216f7f8c7c5605e2048`
- After FUR SHA-256: `0d28f135e5f640c653a15bd0706c2d3ea077043e3cb958e01f932b494d4c6106`

## Assessment

I read the complete round-2 review and independently verified its digest and
the input FUR digest. The reviewer confirms XPR-001 through XPR-028 resolved,
including acceptance of the three round-1 partial-disposition rationales. Those
decisions remain closed; this revision addresses only XPR-029 and XPR-030.
Both findings are valid and addressed without dispute. This is an author
response for reassessment, not a claim of reviewer acceptance.

## Finding Dispositions

### XPR-029 - addressed

Selected option (a), portable sidecar lineage, using the existing shared
`series-index/v1` contract rather than introducing a second index format.

- Storage Layout now explicitly names the trackable series index at
  `docs/superpowers/peer-reviews/S/index.json` as the portable sidecar home.
  The package publishes under its series lock; participants cannot write it.
- Each binding contains lineage mode, series ID, repository-relative artifact
  and record paths, selected terminal run ID and manifest SHA-256. The sealed
  manifest records the artifact/series binding for verification. Absolute
  worktree paths, credentials and private handles do not travel with it.
- Ignored `authority/series-index.json` is only a derived lookup cache. A fresh
  checkout discovers candidates from canonical repository-local series indexes
  and retained run manifests even when that cache and authority tree are absent.
  Cache reconstruction happens after reservation, never in read-only preview.
- Automatic linking requires a unique validated binding, terminal manifest,
  reconstruction anchor and digest chain. A changed current FUR links through
  its verified intervening delta; neither path matching alone nor matching
  content alone confers lineage or runtime authority.
- Discoverable history with a missing/inconsistent binding, conflicting series
  or predecessor tips, and missing referenced evidence yield
  `APR_LINEAGE_UNRESOLVED` with the applicable `reconcile_review_series` action.
  The runtime cannot silently start another chain or choose by timestamp.
- Publication orders sealed terminal evidence before the atomic index update.
  The portability promise covers checkouts carrying the FUR, index and referenced
  evidence through normal commits or verified export/import. It does not copy
  active-run authority or promise access to evidence that was never transferred.
- Resolved Decisions now states that scope explicitly. Gate 3 includes both
  non-Markdown and opted-out Markdown follow-ups in fresh clones and linked
  worktrees without prior authority/cache, plus drift, ambiguity, missing
  bindings, corrupt anchors and escaping-path cases. Sidecar operations still
  leave FUR bytes unchanged.

This resolves portability without broadening filesystem discovery beyond the
physical repository, weakening evidence verification or making local authority
shared across worktrees. No previously resolved participant, cap, broker or
accounting decision changes.

### XPR-030 - addressed

Replaced the stale statement that the round contains the attempt-evidence file.
Evidence now consistently places every no-response artifact at
`attempts/T/attempt-evidence.json` under the run record. An admitted round links
to it through `round.json` attempt IDs; a pre-round attempt has null round and
its manifest stage/run accounting owner. No reviewer/author response filename
is generated for either case. Gate 3 now explicitly checks the location and
both reference cases, not merely collision-free paths.

## Verification and Scope

Focused document checks cover Markdown lint/format, whitespace, JSON examples,
both finding dispositions, before/after/review digest bindings and preservation
of prior review collateral. The cross-checkout and evidence-location fixtures
are specified release gates, not runtime tests implemented or executed here.

Only the FUR and this round-2 author response were edited. The round-2 review,
round-1 collateral, implementation plan, source code and package authority were
not modified. No commits were created. The supervisor retains responsibility
for the patch and inventory. Ready for Claude Opus 5 reassessment.
