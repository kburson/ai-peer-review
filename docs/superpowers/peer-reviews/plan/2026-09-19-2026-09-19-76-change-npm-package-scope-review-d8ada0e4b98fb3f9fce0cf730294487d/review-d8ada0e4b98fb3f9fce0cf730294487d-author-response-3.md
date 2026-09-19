<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d8ada0e4b98fb3f9fce0cf730294487d"
role: "author"
turn: 3
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md"
artifact_commit: "03b091b44ea9b9aae1bc1249cacfe447a2c2908b"
artifact_blob: "fa59476e34963fe00ee4d2df19bdb00e23d0c9e7"
artifact_digest: "sha256:1036880f69bb843005a2a72cd0e704a83fcebfbc711abd6998836cde818ba7d1"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "GPT-6 Astra"
  session_fingerprint: "sha256:286257c5b018fc8c99b26c21f4352855bd6b5b39eb660cb2632ef4fdbd00349d"
  identity_source: "runtime"
started_at: "2026-09-19T05:55:49.585Z"
submitted_at: "2026-09-19T06:21:30.409Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Replaced the unbounded `peer-review-mcp` execution instruction with the exact packaging guarantees
needed for this scope migration: all three bin links must exist, while only the two bounded CLI
entrypoints execute with `--help`. Also adopted both turn-3 maintenance clarifications.

## Finding dispositions

1. Accepted. Task 1 Step 3 now asserts all three `node_modules/.bin` entries, executes only
   `ai-peer-review --help` and `peer-review --help`, and explicitly routes MCP end-to-end behavior to
   the existing protocol-aware MCP tests.

Optional suggestions 1-2 are accepted. The assertion example normalizes shell continuation lines
before matching all artifact operations, and Task 2 names only `templates/author-startup.md` as an
active template edit.

## Changes made

- Rewrote Task 1 Step 3 to separate bin installation proof from bounded CLI execution.
- Added continuation-line normalization for artifact-operation assertions.
- Narrowed Task 2 Step 2 from plural active templates to `templates/author-startup.md`.

## Declined changes and rationale

None.

## Verification

Confirmed `bin/peer-review-mcp.mjs` unconditionally starts the stdio server, while the existing MCP
suite exercises protocol-aware startup. Checked the revised assertion example against both
single-line and backslash-continued shell forms. Ran Prettier and whitespace checks before protocol
submission. No implementation source was changed.
