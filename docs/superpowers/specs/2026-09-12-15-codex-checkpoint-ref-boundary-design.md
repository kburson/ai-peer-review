# Issue 15 Codex Checkpoint Ref Boundary Design

## Status

- Date: 2026-09-12
- Issue: #15
- Status: Approved for full-auto delivery

## Problem

The reviewer Git boundary currently hashes every ref returned by
`git for-each-ref`. Codex creates private checkpoint refs below
`refs/codex/turn-diffs/checkpoints/` as part of normal author-session operation.
A checkpoint created after reviewer join therefore changes `refs_digest` even
when the reviewed artifact, checked-out `HEAD`, branch, index, and worktree are
unchanged. A valid reviewer response is then refused with
`APR_REVIEWER_GIT_VIOLATION`.

## Decision

The reviewer boundary will retain all Git refs except the exact built-in
namespace `refs/codex/turn-diffs/checkpoints/**`.

The exclusion is a frozen package policy. It is applied to parsed ref names in
the repository adapter and cannot be supplied or widened by a command flag,
repository configuration, environment variable, or ref content. Every other
ref namespace remains in the boundary digest, including local branches, remote
tracking refs, tags, replacement refs, notes, stash refs, worktree refs, and
provider-private refs outside this one documented namespace.

This narrow exclusion is preferable to a positive allowlist, which could omit
an authority-relevant namespace added by Git or another tool, and to removing
the ref digest, which would weaken reviewer read-only enforcement.

## Boundary Calculation

`reviewerBoundary()` will:

1. invoke `git for-each-ref` with literal arguments and an explicit ref-name
   sort;
2. parse each NUL-separated ref name and object ID record;
3. discard a record only when its ref name begins with the exact segment-safe
   prefix `refs/codex/turn-diffs/checkpoints/`;
4. hash a canonical NUL-delimited byte representation of all retained records;
   and
5. continue returning the existing closed boundary shape with `head`, `branch`,
   `index_digest`, `refs_digest`, and `worktree_digest`.

An attacker-controlled lookalike such as
`refs/codex/turn-diffs/checkpoint/`,
`refs/codex/turn-diffs/checkpoints-evil/`, or a differently cased name remains
included. Malformed Git output fails closed rather than being silently omitted.

## Submission and Error Behavior

Reviewer submission keeps the existing all-or-nothing comparison. Changes to
the artifact, checked-out `HEAD`, branch, index, worktree, or retained-ref digest
continue to raise `APR_REVIEWER_GIT_VIOLATION` before any response or event is
sealed.

When the non-ref fields match but the ref digest does not, the error explains
that a retained ref changed or that the review was sealed using the legacy
all-ref policy. It must not infer which case occurred because an aggregate
legacy digest cannot prove that only excluded Codex refs changed.

## Existing 0.2.1 Reviews

Reviews whose boundary was sealed by 0.2.1 cannot be safely migrated in place:
the event log contains only the aggregate all-ref digest, not the historical ref
inventory. Accepting a replacement digest would therefore be unable to rule out
a simultaneous retained-ref mutation.

The supported recovery is an evidence-preserving restart:

1. leave the old review workspace and unsubmitted response unchanged;
2. upgrade to the fixed package version;
3. start a replacement review from the current clean, committed artifact using
   a distinct review output path when the old collateral path is occupied;
4. join from the distinct reviewer session and recreate or copy the review text
   into the new protocol-authorized response path; and
5. submit through the newly sealed boundary.

The old response remains draft evidence only. It is never relabeled as an
accepted response, copied into protocol authority automatically, or used to
advance the old review.

## Documentation

The README and packaged peer-review skill will state:

- the exact retained and excluded ref policy;
- that the reviewer remains Git-read-only;
- why legacy aggregate boundaries cannot be migrated safely; and
- the evidence-preserving restart procedure for 0.2.1 reviews.

## Verification

Tests will prove:

- repository-boundary calculation is unchanged after adding or advancing an
  exact Codex checkpoint ref;
- lookalike names and every non-excluded ref still change the digest;
- an end-to-end reviewer join followed by Codex checkpoint creation and valid
  submission reaches `acceptance-pending` without mutating unrelated state;
- a retained-ref mutation still raises `APR_REVIEWER_GIT_VIOLATION` and leaves
  the event log and response untouched;
- legacy ref-only mismatches return the explicit fail-closed restart guidance;
  and
- formatting, lint, unit, golden, integration, MCP, packaging, smoke, extraction,
  and dry-pack verification pass before release.

## Release

The defect is released as patch version 0.2.2. The implementation is merged to
`trunk`, tagged with the repository's configured signed-tag identity, and
published by the existing tag-triggered GitHub Actions release workflow. Public
npm metadata, the GitHub release artifact and checksum, tag signature, release
workflow, and post-merge CI must be verified before completion is reported.
