<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d81db636f6f2a77ca13e33cef6489934"
role: "reviewer"
turn: 2
commit_mode: "no-commit"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md"
artifact_commit: "d213adfdc9e1b3f8f35c1dd018ba017bf969503e"
artifact_blob: "861304ab7d774a3e9c9da03abb71b9b596276fd8"
artifact_digest: "sha256:f2edf6b05a941ae6287d32be7a5e822439fccfc7d8ceb83476d1f3f89c84fc44"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:3c9d73966dd330b8a261482b7db6d75855e4dbb92db9ef6564875e74928eaa9b"
  identity_source: "runtime"
started_at: "2026-10-18T14:41:55.106Z"
submitted_at: "2026-10-18T14:50:16.281Z"
finding_ids: ["R2-F001"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

## Summary

Round-2 XPR of revision 10 (`revision_id: issue-222-r10`, `based_on_commit: d213adfdc9e1b3f8f35c1dd018ba017bf969503e`). The protected `artifact_digest` in this response's frontmatter is `sha256:f2edf6b0…4c44`, which matches the result digest the author reported in author-response-1. I read the full revision-10 artifact and the complete author-response-1. I reviewed every changed passage against my round-1 findings: the revision header, the §4.2 response-v1/v2 bullet, the §4.3 response, FUR and plan-generation bullets, all of §4.4, and ACs 11, 13 and 14. The unchanged sections still match revision 9.

Review basis and limits are the same as round 1. This session was instructed not to use Git and could not compute hashes, so I rely on the protected frontmatter digests and on reading the text. I did not observe the reviewer checkout HEAD independently, so it remains unavailable here. The current response-v1 format has no `reviewer_commit` field.

Disposition check on round-1 findings:

- **R1-F001 — resolved.** §4.4 "Revision-chain unit and boundaries" and "Cross-review and historical links" now define retained states as review submissions, cycle results and explicit between-review publications. They require predecessor review, manifest and revision links held in sealed immutable manifest records, plus boundary diffs labelled as external revision activity. Legacy predecessors are identified by digest without backfilling their bytes. "Squash-safe retention and reconstruction" starts from the actual chain head, whether accepted or not, and reports which revisions were accepted separately. AC 14 covers these cases. This fully handles the r6 → r9 → r10 situation of this very artifact.
- **R1-F002 — resolved.** "Diff ownership and exact inputs" makes AIPR the producer, at declared contained paths. Its inputs are limited to sealed predecessor and result bytes checked by digest; HEAD, the index and later working-tree reads are excluded. External boundary inputs must be sealed first. The patch format and version are recorded in the manifest. AC 13 verifies this.
- **R1-F003 — resolved, and my source citation is corrected.** I checked the author's correction. run-core.mjs:2838–2844 is phase advance only. Ordinary normal-mode author submission (run-core.mjs:3842–3912) has the automation commit the reviewer response, the changed artifact and the author response together via `effectCommitExactPaths`, with review trailers. My round-1 statement that the author must precommit before every ordinary handoff was too broad. The underlying point stands: legacy normal mode is an automation-owned Git commit, which conflicts with the no-Git role boundary. Revision 10 now defines the completed revision and acceptance cycle, and picks deferred, ordered, one-commit-per-cycle publication. It requires the staged FUR digest to match the manifest result digest, and it keeps legacy normal and no-commit records unchanged without retrofitting them.
- **R1-F004 — resolved, apart from the new interaction in R2-F001.** §4.2 now separates unchanged response-v1 from the new response-v2. §4.3 assigns capture of the protected `reviewer_commit` to AIPR at submission, after the reviewer acknowledges the context it evaluated. Equality with the shared same-worktree HEAD is valid. A separate reviewer checkout is unsupported until a binding contract is adopted. An explicit, discriminated unavailable record replaces any reuse of `null`. AC 11 covers this.
- **R1-F005 — resolved.** The §4.3 FUR bullet now refuses missing or malformed metadata, changed bytes that keep the same ID, and reuse of an earlier ID for different bytes. Byte-identical reuse is allowed, and retries must match the original review, turn and version. AC 11 covers this.
- **R1-F006 — resolved.** Forward and reverse round-trip checks against sealed endpoint digests are now required, along with exactness cases for encoding, line endings and final newlines. The concrete format is left to the bounded plan, which I agree with.
- **R1-F007 — resolved.** The §4.3 plan-generation bullet now treats losing acceptance objects after a squash as the expected missing-history case, with two options: plan before the squash, or get an explicit owner disposition.

One new interaction remains, created by combining two revision-10 requirements; see R2-F001. Everything else is ready for owner adoption. I request one narrow clarification before accepting.

## Findings

### R2-F001 — Deferred publication during an open reviewer turn collides with the strict HEAD check on reviewer submission

Severity: moderate. This is an internal contradiction between two new normative requirements.

- **§4.3 "Review-response Markdown":** "AIPR compares that acknowledged context, current checkout HEAD and reviewed FUR digest during sealing and refuses stale submission if any changes."
- **§4.4 "External publication and mode compatibility":** "The new contract permits deferred publication while subsequent review cycles proceed." It also says new-format contracts must "allow external publication and resulting HEAD changes between/after sealed turns while preserving stale-turn checks".

In the default same-physical-worktree topology, which §4.3 itself makes the only supported one, consider the most natural sequence:

1. The author submits the response that introduces revision N+1. That completes cycle N.
2. The reviewer starts its turn on revision N+1.
3. The external publisher, as permitted, publishes cycle N. Its dedicated commit contains the cycle-N responses, the manifest record, the diff and the exact cycle-result FUR, which is revision N+1, the revision under review. The shared HEAD advances.
4. The reviewer submits. AIPR finds that the current HEAD differs from the acknowledged context and refuses. The reviewer is told to reevaluate and acknowledge again.

Nothing the reviewer evaluated has changed. The subject code is identical and the FUR digest is identical; the new commit only adds publication collateral and the already-reviewed FUR bytes. Under the current text this refusal recurs every time publication overlaps a reviewer turn. "Between/after sealed turns" can be read as forbidding publication during an open reviewer turn, but "while subsequent review cycles proceed" can be read as permitting it. AC 11 ("HEAD/FUR changes during capture") and AC 13 ("deferred ordered publication after further FUR edits") would then be verified against contradictory expectations.

Either resolution is acceptable. What is required is that the spec choose one, so the implementation does not:

- churn refusals;
- quietly weaken the stale check; or
- record a `reviewer_commit` that is neither the evaluated context nor clearly distinct from it.

## Required changes

1. **R2-F001:** In §4.3 and §4.4, state how external publication interacts with an open reviewer turn in the shared worktree. Choose one:
   - **(a)** External publication may not change the shared HEAD while a new-format reviewer turn is open. Pending cycles wait until the turn is sealed or the review is between turns, and AIPR reports the wait in publication state.
   - **(b)** Publication may proceed during an open reviewer turn. At sealing, AIPR accepts a HEAD advance only if every intervening commit is verified as a publication commit for this review's lineage, touching only declared collateral paths and the FUR at an already-recorded chain digest. `reviewer_commit` records the context the reviewer acknowledged, and the publication-only advance is recorded separately. Any other HEAD change still refuses as stale.

   Extend AC 11 or AC 13 to test the chosen behavior, including a non-publication commit during the turn, which must still refuse.

## Optional suggestions

None.

## Decision

revisions-requested
