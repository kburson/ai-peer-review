# Journal refactoring specification and SAR archive

This bundle preserves the revised draft specification and complete headless specification SAR at the owner’s request. It contains the exact reviewed bytes; committing it does not adopt the specification, approve an implementation plan, or change live backlog authority.

- [Revised specification, revision 4](2026-10-18-review-journal-refactoring-design.md).
- [Specification SAR technical acceptance](spec-sar-astra-2026-10-18/review-acceptance.md).
- [Complete SAR rounds, snapshots and checks](spec-sar-astra-2026-10-18/README.md).
- [Unchanged companion plan, context only](2026-10-18-review-journal-refactoring-plan.md). The plan has not received SAR review.
- [Copy receipt and complete file hashes](copy-receipt.json).

No cleanup issue has been registered. These draft filenames do not invent an issue owner. After governed registration and owner adoption, copy the adopted documents into the normal specification/plan locations with the actual owner number and updated companion links; retain this exact review archive.

The original documents, JSON records, snapshot bytes and patches are copied without edits. Historical absolute paths and clean-checkout statements describe the original review location and observation time. The copy receipt maps each original file to its repository-relative counterpart. Snapshot companion links use the original specification directory as their link base, as recorded in the SAR evidence. Git records file contents, not the original read-only snapshot filesystem mode.

The requested review model/effort was `gpt-6-astra` / `high`. This was same-agent technical self-review; independent runtime attestation was unavailable. See the acceptance document for scope and limitations.

## Copy verification

All 19 copied files match their originals byte-for-byte; all 16 entries in the original SHA-256 manifest match their repository copies. All JSON parses and 37 local links resolve using the documented snapshot link base. Markdown lint passes for all 14 Markdown files. Explicit Prettier checks pass for the Markdown files, copy receipt and original SHA-256 manifest. The original `engagement.json` and `verification.json` are valid JSON but do not match current Prettier layout; they remain unchanged evidence under the repository's existing review-archive formatting exclusion. Git whitespace checks pass outside the preserved patch files; their blank context lines contain the space required by unified-diff syntax and are retained exactly.
