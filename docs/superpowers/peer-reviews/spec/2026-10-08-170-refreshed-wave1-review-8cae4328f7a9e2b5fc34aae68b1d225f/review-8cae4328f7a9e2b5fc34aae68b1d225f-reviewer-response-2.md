<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-8cae4328f7a9e2b5fc34aae68b1d225f"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave1.md"
artifact_commit: "6a5c4299bca5c9f9e7555221cb03fbed0089412d"
artifact_blob: "0cefc5749a30d9552eb85ddf937322412eb31061"
artifact_digest: "sha256:a3c5a97ff7588bfc7bb3acfbdb13e5747fd3bda1ab9e6293e701fc25bd257aae"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:b910acba92aa9952fc4e8319abe4d37369ab7a3f3a6c5f72c24bb1ebd0574a18"
  identity_source: "runtime"
started_at: "2026-10-08T07:17:54.154Z"
submitted_at: "2026-10-08T07:25:51.699Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised subject `evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave1.md`. It is now at artifact commit `6a5c429`, blob `0cefc574…`. Running `shasum -a 256` over the working-tree file reproduces the frontmatter digest `a3c5a97f…`.

I also read:

- author response 1;
- the author's recorded freeze evidence, `.scratch/170-delivery/wave1-full-tree-freeze-evidence.json`;
- the six registrations and the index, rehashed.

The JSON block is byte-for-byte unchanged in substance. The index revision is still `26ebc56`. The raw SHA-256 values are still `e3c7d95c…` for the index, and `6fb98df9…`, `58cd6033…`, `6f9c187c…`, `1397cc51…`, `34fc6f2f…` and `9eaba912…` for the six registrations. All of these match the working-tree bytes again. The registrations, the index, the package and source contract, and the scope are unchanged. So everything I verified in round 1 still holds: the records equal the public CI artifacts, the scope is finite and exact, the Darwin host binding uses `IOPlatformUUID` plus `kern.bootsessionuuid`, the narrowing is mechanical, privilege and restoration are implemented as described, and the approval reader cannot be satisfied by self-assertion.

Dispositions:

- **R1-F001 (producer freeze): resolved by option (a).**
  - Subject paragraph 7 now says plainly that the worker's check covers only `PRODUCERS`. It also says the spawned creation process loads the repository-local canonical JSON, inventory, assurance, normal-review verifier and `npm-command` modules from the approval revision.
  - It records a full-tree comparison: `git diff --exit-code Q HEAD -- .`, excluding only `evidence/portable-runtime/process-source` and `docs/superpowers/peer-reviews`, exited 0. That boundary covers the whole repository-local transitive import closure, including `package.json` and `package-lock.json`. The two excluded directories hold data and review documents; nothing loads them as code.
  - It binds three obligations: the approval, finalization and publication commits must be evidence and review documents only; the author repeats the full-tree check after finalization and publication; and the class review must recheck Q against each worker's actual `captureProducerCommit` before admitting either creation receipt. That last value is recorded in the public `host-control.json` (`process-source-ci-capture.mjs:231`).
  - It labels this a constraint specific to this wave, not something the worker enforces itself. The future-run fix was declined because changing the worker would trip the waiting workers' own producer guard. That reasoning is correct.
- **R1-F002 (enumerated mutations): resolved.** Subject paragraph 4 lists the mutations, and each matches `process-source-ci-host.mjs`:
  - NTP disabled for the session;
  - the `America/New_York` baseline;
  - ±90 s steps;
  - an offset-preserving switch from `America/New_York` to `America/Detroit`;
  - a jump to 15 January or 15 July at 12:00 UTC of the baseline year, choosing the opposite DST state (`baseline.dst ? 0 : 6`);
  - a restore to the baseline after each transition;
  - a restore of the original UTC, zone and NTP state at the end.

  It also states that the timezone transition proves only a change of zone identity, and that the offset and DST change comes only from the combined seasonal jump.
- **R1-F003: resolved.** Paragraph 5 separates the two restorations. The signed receipt proves restoration to the baseline. The public `host-control.json` proves the final restore to the original state. The class review must validate both, together with the authentic successful job.
- **R1-F004, R1-F005 and R1-F006: recorded adequately.** Paragraph 8 covers each point:
  - Windows identity is still based on the hardware UUID, and the scope is absence only.
  - The refusal claims are limited to rejecting an asserted environment and override, and are expressly not cryptographic proof of isolation.
  - Approval is bounded by the 40-minute poll inside the 60-minute job, and an expired worker cannot be reused.

Verification limits (unchanged in kind):

- Git is forbidden and I cannot run code, so I could not reproduce the author's full-tree `git diff` or the changed-path list. I also could not confirm the blob OIDs, the canonical index-entry digests, the ancestry `26ebc56` → `6a5c429`, or the Ed25519 key/`keyId` pairs.
- The `wave1-full-tree-freeze-evidence.json` file records `head: ebb8c02`, not the current `6a5c429`. Commits after `ebb8c02` are protocol and subject commits, which fall inside the excluded directories, so the boundary still holds. Strictly, though, the current-revision evidence rests on the author's statement plus the mandatory post-finalization and class-review rechecks.
- I did not access GitHub or rerun the 99 tests.
- The worker-side reader enforces the digest and ancestry checks mechanically and fails closed.

My acceptance therefore binds the exact six-record subject below together with the obligations stated in its paragraph 7. Those obligations are conditions of the approval, not attested facts.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Subject paragraph 7 says "The exact changed paths as of this revision are listed below", but the list is the `Q..ebb8c02` set from the freeze evidence. The `6a5c429` subject revision and the protocol documents under `docs/superpowers/peer-reviews/` are also changed by now, inside the excluded directories. When the post-finalization recheck is recorded, store its exact head commit and full `--name-only` output, including the excluded-directory paths. That artifact then stands alone for the class review.
2. Subject paragraph 10 still says "the worker verifies unchanged producer bytes against Q before capture" without qualification. Paragraph 7 now narrows it correctly. In future subjects, write "verifies unchanged `PRODUCERS` bytes" so the two statements cannot be read inconsistently.
3. For the next wave, apply the whole-tree worker freeze (excluding only evidence and review documents). That way the class-review recheck becomes a worker-enforced invariant rather than an author obligation.

## Decision

accepted
