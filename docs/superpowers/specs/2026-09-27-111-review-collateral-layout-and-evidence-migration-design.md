---
issue: 111
issue_url: https://github.com/kburson/ai-peer-review/issues/111
status: draft-for-written-review
---

# Review collateral layout and evidence migration

## Purpose and approval boundary

Issue #111 combines workspace and CI lint/format coverage with a canonical review
collateral layout, conventional frontmatter, and verified migration of existing
evidence. The user approved the response layout, role-specific retry filenames,
verified migration approach, all tracked historical collateral in scope, and
preflight-first application. This specification consolidates those decisions for
written review. It does not assert completed implementation or migration.

Specs and plans remain in `docs/superpowers/specs` and `docs/superpowers/plans`.
Review collateral moves to `docs/peer-reviews`. Dates, titles, session identifiers,
and full protocol IDs belong in metadata rather than repeated path segments.

## Existing boundaries to preserve

The current code distinguishes a stable human review `record_id` from an immutable
protocol execution `review_id`. A protocol execution can span several turns.
Replacement executions retain lineage without merging or rewriting event logs.
These identifiers are not provider session IDs and must not be redefined as retry
counters.

`src/collateral/paths.mjs` already defaults to `docs/peer-reviews`, but its path
template and filename prefixes expose dates, artifact names, and execution IDs.
The historical tree and lint exclusions still reference the Superpowers location.
`src/collateral/review-record.mjs` validates submitted responses against exact
paths and content digests. Its consolidation operation preserves source bytes
and produces additive relocation evidence; it does not authorize reformatting.

`src/provider/claude-launch.mjs` currently extracts turn numbers from filenames
for permission and resume checks. Replace that inference with explicit resolved
identity data while preserving exact-file write restrictions and rejection of
neighboring responses. A shorter path must not broaden agent permissions.

The design extends the recovery principles in
`2026-09-13-21-review-record-recovery-design.md`; it does not erase earlier accepted
states, participant identities, or immutable submission records.

## Canonical response layout

```text
docs/peer-reviews/107/spec/
  review-01/
    review.json
    turn-01/
      response-reviewer.md
      response-author.md
    turn-02/
      response-reviewer.md
      response-reviewer.02.md
      response-author.md
```

The same structure applies to `plan`. Review numbers are stable, never reused,
and scoped to repository, issue, and artifact kind. They have a minimum width of
two digits, can grow beyond 99, and do not reset when the date changes. Multiple
artifacts of the same kind remain distinguishable by full artifact identity in
metadata. Titles and dates never determine identity.

A turn denotes a logical review/revision round within the human review record.
The unsuffixed response is retry ordinal 1. Further attempts use `.02`, `.03`,
and so on, allocated independently for reviewer and author within that turn.
There is no attempt directory. Missing author responses are valid for interrupted
or unfinished turns; migration must not synthesize them.

Resuming the same valid unfinished execution retains its response path. Starting
a replacement response attempt allocates a new path and preserves the previous
file. Successful submissions are immutable. An author retry can reference an
already submitted reviewer response without forcing that reviewer to repeat work.

Startup, invitation, manifest, and human-decision collateral must also be retained.
Their exact placement is a written-review decision described below; changing the
response layout must not silently discard these execution-wide records.

## Identity, concurrency, and agent access

`review.json` is a versioned, rebuildable projection. It maps the human review
number to `record_id`, repository and issue identity, artifact references, protocol
executions, logical turns, role retry ordinals, relative paths, digests, and source
evidence references. It identifies the authoritative submitted response for each
role and turn only when protocol evidence supports that selection.

The highest suffix, newest modification time, or prose claiming acceptance is
never sufficient. An edited index cannot create approval. Readers verify its
references against evidence and reject contradictory selections.

Map each logical turn and response retry explicitly to the original protocol
`review_id`, protocol turn, role, and submission event. Preserve those original
identities on historical records. Existing execution-local turn numbers must not
be silently interpreted as the new logical turn counter. Ambiguous historical
continuity is a migration exception, not grounds to guess.

Allocation must reserve paths exclusively, retain an operation identity for
idempotent retries, and serialize competing local worktrees through shared
repository coordination. Independent clones cannot rely on that local lock:
integration must detect conflicting number-to-ID mappings and refuse silent
merging. Resolve conflicts through an explicit mapping repair before acceptance.

Agents receive the exact current response path from protocol status and launch
contracts. They do not scan for the highest suffix. The reviewer can write only
its assigned draft response; it cannot modify the artifact, author response,
another retry, or the record index. Tests cover Codex and Claude access boundaries.

For learning and data mining, preserve distinctions between drafts, submitted
responses, superseded executions, ordinary acceptance, and human overrides.
Queries join by full identities and source evidence, not mutable titles or path
numbers. A projection must not promote an abandoned recommendation into an
accepted outcome or count a copied representation as a new review.

## Frontmatter and formatting contract

Every new response begins with YAML frontmatter at byte zero. Move template
version, template digest, and protected-metadata information from leading HTML
comments into versioned frontmatter fields. Preserve their values and protection
semantics; a marker alone is not enforcement.

Include issue and record identity, protocol execution identity, logical and
protocol turn numbers, role and retry ordinal, artifact path and revision/digest,
participant provenance, timestamps, and evidence references. An author response
identifies the exact reviewer submission it answers. A moved response remains
self-identifying, but identity metadata alone never grants submission authority.

Version the response schema and support reading original legacy bytes for
historical verification. The current parser accepts a restricted value encoding
and searches below comments for frontmatter; update parsing and validation
explicitly rather than assuming arbitrary formatter output remains compatible.
Reject duplicate keys, conflicting identities, and unsupported schema versions.

Generate and finalize compliant response bytes before submission and hashing.
Submission must validate the final bytes. An automatic formatting step may not
alter already sealed output. Template metadata and generated fixtures must be
covered by appropriate lint, format, parser, and idempotence checks.

## Migration scope and evidence model

Inventory all tracked legacy review collateral and affected specs/plans, including
artifacts associated with closed issues. Also inventory startup files, invitations,
manifests, historical review summaries, and links in tracked documentation and
issue records. Classify each artifact by actual provenance; informal reviews must
not be elevated into protocol-backed acceptance.

Preserve original reviewed bytes at a retained, retrievable Git commit with their
original evidence. Record repository, commit, path, and digest. If a required
source or authority exists only in unavailable scratch state, report missing
evidence and stop application until resolved. Git content proves original bytes,
not the existence of a submission or approval.

Use distinct transformation classes:

1. Path-only relocation preserves the exact content digest and adds a relocation
   mapping.
2. Formatting-only transformation compares parsed Markdown structure and content,
   links, code, and metadata values. Ignore only explicitly permitted presentation
   differences, such as prose wrapping without a hard line break. Preserve code,
   meaningful whitespace, HTML evidence, and ordered content. Unsupported syntax
   or an uncertain comparison fails equivalence.
3. Frontmatter conversion follows a versioned field mapping and verifies values,
   parser interpretation, and retained protection semantics.
4. Substantive or unproven changes require fresh review; never refresh a historical
   approval merely by calculating a new digest.

For each transformed file, an additive migration manifest records old and new
paths and digests, immutable source location, transformation and schema versions,
verification results, evidence references, and operation identity. A formatted
historical response is a derived representation linked to its original submission,
not a newly authenticated statement by the historical reviewer.

Historical approval stays attached to its original revision. New readers can
resolve a verified transformation chain to the current representation without
rewriting old signatures, seals, timestamps, or events. Active workflows must
explicitly recognize verified transformations or demand fresh evidence; they must
not accept stale receipts accidentally.

## Preflight and application

Preflight is read-only: inventory identities and links, build the complete mapping,
compute candidate bytes and checks, and report collisions, ambiguous ownership,
missing evidence, unsupported syntax, and substantive differences. Candidate files,
if needed, belong to a separate explicit preparation operation that cannot replace
originals. No application begins while required exceptions remain unresolved.

Apply revalidates the source revision, digests, allocation reservations, and planned
evidence. Active reviews in scope must be quiescent; concurrent source changes
invalidate the plan. Publish destinations exclusively, reread and verify them,
write and verify additive mappings, then remove the mapped legacy working-tree
files. Never remove the retained historical Git source or unrelated files.

Use an operation journal so interruption is recoverable and retry is idempotent.
A retry accepts only the same mapping and identical planned bytes. Git publication
and GitHub updates are separate steps, not a fictitious atomic transaction.

Inventory open and closed issue references. Update through the owning workflow's
supported operations, with fresh-base checks and read-back. Retain historical
approval and add migration provenance. Closed issues remain closed. Missing
capability or permission is a reported reconciliation item, never a reason for raw
protected-marker rewriting. Do not declare migration complete until required local
and external references have been reconciled.

## Workspace, CI, and compatibility

Use the same lint and formatting policy locally and in CI. Remove legacy blanket
collateral exclusions only after generators, readers, migrated output, and relevant
fixtures satisfy the policy. Do not replace them with a permanent exclusion for the
new tree. Historical Git objects are not reformatted.

Retain legacy readers and explicit old-path mappings for evidence verification;
new issue-bound reviews use the canonical layout. Do not silently move live
workspaces or invalidate sealed startup contracts. The package currently supports
reviews without an issue, so preserve that capability through an explicit alternate
routing mode rather than inventing an issue ID. The numbered default is the contract
for this repository's issue-bound work.

Existing custom routing consumers require compatibility tests and an explicit
migration path. This repository-wide migration is not permission to rewrite review
artifacts in other repositories.

## Verification and acceptance

- Canonical output has no dates, titles, or repeated full IDs in response filenames.
- Review, turn, and per-role retry allocation is collision-safe and idempotent;
  independent-clone conflicts are detected instead of silently merged.
- Recovery preserves submitted reviewer findings when only the author retries.
- Agents resolve exact authorized paths; neighboring and foreign response writes
  remain denied after filename changes.
- Frontmatter starts at byte zero, survives supported formatting unchanged in
  meaning, and is understood by both conventional YAML tooling and protocol readers.
- Rebuilding `review.json` produces the same evidence-backed selections; tampering,
  missing evidence, and a newer unsubmitted retry cannot create acceptance.
- Dry-run performs no mutation. Failure before publication preserves originals;
  interrupted application recovers without duplicate files or lost evidence.
- Equivalence checks reject changed code, links, significant whitespace, unsupported
  syntax, substantive prose, and metadata changes outside the explicit verified
  frontmatter field mapping.
- Every migrated item has a verified source-to-destination evidence mapping and
  all required references resolve, including those associated with closed issues.
- Workspace and CI lint/format checks cover the migrated tree. Legacy evidence
  remains verifiable and no historical approval has been forged or rewritten.

Targeted unit, golden, integration, and packaging checks must exercise the changed
contracts. Repository-wide lint and format checks validate the final migrated tree;
protocol and provider regression suites validate preserved authority boundaries.

## Written-review decisions and delivery sequencing

The response layout and migration approach above were agreed in conversation.
One additional supporting-file placement is proposed for written review:
`executions/<review-id>/` within the review directory, containing short startup,
invitation, and manifest filenames. This retains execution-wide scope without
expanding the response paths. It is not an already approved chat decision.

Detailed planning must specify exact schema fields, allocation mechanics,
transformation comparisons, and historical turn mapping based on the inventory.
Those mechanisms must meet the stated invariants before implementation.

Implement schema and path readers, identity mappings, safe allocation, and compliant
generation before migrating history or enabling broader CI coverage. Then prepare
and review the full migration report, resolve exceptions, apply the migration,
reconcile references, and verify the complete result. If detailed planning requires
multiple delivery issues, retain #111 as the coordinating scope and propose the
split before implementation. This document is a design, not an execution plan.
