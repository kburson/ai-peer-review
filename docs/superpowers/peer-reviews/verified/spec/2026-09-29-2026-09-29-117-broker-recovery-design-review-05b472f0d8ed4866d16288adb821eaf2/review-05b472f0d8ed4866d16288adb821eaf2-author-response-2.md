<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-05b472f0d8ed4866d16288adb821eaf2"
role: "author"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md"
artifact_commit: "90c52cf4283247df813e25af81a847d6ed4c03a9"
artifact_blob: "7ce62fbdcf33252525da6011dd65a8a3354b37b9"
artifact_digest: "sha256:e1913f494b40f3ab219b7f701c25bd3f7f4c840d9c1db2da9d8345015566eee4"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "GPT-6 Astra"
  session_fingerprint: "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62"
  identity_source: "runtime"
started_at: "2026-09-29T07:40:30.944Z"
submitted_at: "2026-09-29T07:53:17.300Z"
finding_ids: []
answered_finding_ids: ["R2-F001","R2-F002"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Defined execution-time alias integrity and clarified attempt-level refusal proof. The current live proof demonstrates protocol participation; it does not certify the newly stated alias hardening requirement as implemented.

## Finding dispositions

- **R2-F001 — accepted.** The installed builder checks the launcher's PATH and a symlink target, which does not establish the reviewer's eventual shell resolution or immutable package content. The revised scope requires validation in the actual reviewer Bash environment, first-executable symlink and canonical target equality, sealed runtime content verification, and immutable identity through execution. A changed install invalidates the alias even when its path is unchanged. Unknown or changed execution facts reject the bare permission and require the integrity-checked absolute pinned command. Added explicit verification cases for shadowed PATH, regular/foreign first executable, differing reviewer environment, same-path reinstall, validation/execution race, accepted exact alias, and absolute fallback.
- **R2-F002 — accepted.** A pre-dispatch receipt certifies its own attempt only. Every earlier attempt of that operation needs independently validated undelivered proof. A later local refusal or a reconcile-returned not-submitted label cannot overwrite an interrupted delivery. Added that same-operation case to the blocked verification list.

## Changes made

Expanded the scope's alias condition into a precise integrity gate and added verification item 6. Clarified refusal receipt scope and the per-operation attempt-history test. No implementation behavior is claimed changed.

## Declined changes and rationale

None.

## Verification

Read reviewer response 2 in full and checked the installed builder during round 1: exactPackageAlias walks launcher PATH and compares realpaths. This supports the finding; the generated contract checks alone are insufficient for execution-time assurance. Both reviewer turns were submitted by the same distinct Claude session through protocol authority. The prior uncertain review remains untouched.

Document checks passed with exit 0: `./node_modules/.bin/prettier --check docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md`, `./node_modules/.bin/markdownlint-cli2 docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md`, and `git diff --check`. No implementation test suite was run for these prose changes, and acceptance of the specification must not be read as implementation of its new gates.
