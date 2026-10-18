# Issue #222 specification XPR rerun

Native XPR `review-d81db636f6f2a77ca13e33cef6489934` completed with **accepted-uncommitted**, basis **reviewer-consensus**. `gpt-6-astra` / `high` authored revisions 10 and 11; `claude-opus-5-5` / `high` reviewed three rounds and accepted revision 11 with no remaining findings. The final acceptance digest is `ffbb5026d7796075bfa8112376fc2af07acec87f68768633fd6e674884323869`. Owner adoption remains pending; no implementation or fresh plan was authorized.

- [Native acceptance manifest](../spec/222-rerun-r9/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-d81db636f6f2a77ca13e33cef6489934/review-d81db636f6f2a77ca13e33cef6489934-review-manifest.md).
- [Final reviewer acceptance](../spec/222-rerun-r9/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-d81db636f6f2a77ca13e33cef6489934/review-d81db636f6f2a77ca13e33cef6489934-reviewer-response-3.md).
- [External verification receipt](review-verification.json): native terminal status, accepted bytes, all response/snapshot hashes, distinct participant fingerprints, and forward/reverse patch checks.
- [Round-1 archival record](turn-1-archive.json) and [r9-to-r10 diff](spec-r9-to-r10.diff).
- [Round-2 archival record](turn-2-archive.json) and [r10-to-r11 diff](spec-r10-to-r11.diff).
- [Pre-review r6-to-r9 boundary diff](spec-r6-to-r9.diff). Intermediate conversational drafts 7 and 8 were not committed review turns; no retrospective records or acceptances are claimed.

The working specification has subsequently advanced to revision 12 with owner-requested stable review roots and lifecycle-specific drift checks. The acceptance above applies only to revision 11. Revision 12 requires renewed technical review; no native response or manifest has been rewritten to extend the earlier acceptance.

## Reconstruction

The FUR accepted by this review is revision 11. If starting from a later working revision, first obtain these exact accepted bytes using that later revision's retained diff chain or this review's existing commit. Verify the accepted digest above before following the steps below. In a separate temporary directory, copy it as `FUR.md`, then apply `git apply --unidiff-zero --reverse <absolute-path-to-spec-r10-to-r11.diff>` and then the r9-to-r10 diff with the same flags. Each step must match the predecessor digest in the receipt. These checks passed without accessing original revision commits or independent archived FUR copies. The pre-review boundary diff uses the repository-relative specification path and also reverses revision 9 to the historical revision-6 bytes. Preserve the original FUR during reconstruction.

## Provenance and publication limits

This review used the existing native no-commit v1 contract. It did not implement the prospective response-v2, manifest or publication-window contracts. Native responses and manifest are retained byte-for-byte. The native format has no `reviewer_commit` metadata or final author-response-3; reviewer responses disclose independent checkout-HEAD observation as unavailable. Do not backfill these fields or manufacture a closing participant response. Both participant model/session evidence records are declared; authority assurance is unavailable.

The parent verified the accepted FUR and archived the actual r9-to-r10 and r10-to-r11 changes in dedicated external revision commits after the native review completed. The turn archival records are clearly labelled external derivatives, not invented native per-cycle manifests. Git publication does not change the native `accepted-uncommitted` label. No per-revision commit SHA index or separate baseline is required to reconstruct the FUR.

The native acceptance time is retained in the receipt. The current v1 record does not independently capture acceptance-transition HEAD; its startup/artifact commit and the parent's later observed pre-publication HEAD are retained with their actual meanings. Missing provenance remains missing. Prior SAR and revision-6 XPR evidence remain historical.
