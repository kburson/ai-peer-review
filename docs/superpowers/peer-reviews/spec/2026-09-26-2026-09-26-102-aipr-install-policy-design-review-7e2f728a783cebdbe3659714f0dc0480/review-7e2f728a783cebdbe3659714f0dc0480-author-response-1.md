<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-7e2f728a783cebdbe3659714f0dc0480"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-26-102-aipr-install-policy-design.md"
artifact_commit: "71133938e8de94958facab026d43a1c3f87a80a3"
artifact_blob: "abd53d7534a43de640184a981cfc56645b0fb8a8"
artifact_digest: "sha256:8d658008c0b646aa3fb7c29fe330ed1a85a6bd74517991a0741d5e800d648ad4"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "GPT-6 Astra"
  session_fingerprint: "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427"
  identity_source: "runtime"
started_at: "2026-09-26T23:14:57.435Z"
submitted_at: "2026-09-27T03:19:10.270Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Revised the design in response to all five required findings and all four optional suggestions. The revised contract keeps source validation and policy authority separate, preserves opt-in legacy doctor behavior, gives all project settings one physical root, documents the explicit uninstall recovery path, and specifies per-worktree administrative paths and failure behavior.

The review remains a design XPR. No implementation or implementation verification is claimed. The reviewer response has no sealed machine finding IDs (`finding_ids: []`); F1-F5 and O1-O4 below refer to its numbered prose findings and optional suggestions.

## Finding dispositions

- **F1 — Resolved with a narrower implementation contract.** Confirmed that the current private `readConfig` validates each source before `loadConfig` merges and validates again. The genuine gap is source-specific rejection of user `tool`, not a need to replace per-file validation. Require rejection of every user own `tool` key before merging with `APR_CONFIG_INVALID`, nonzero mutation exit, and no effects. Partial project objects remain invalid independently. The evaluator reads raw project bytes. Keep public `validateConfig(value)` source-neutral; put source enforcement in private loading orchestration. Thus no validator signature change is needed, and production writers cannot take caller-supplied scope as authority. Expanded AC5.
- **F2 — Resolved.** Adopted warning-only unconfigured policy in default doctor and explicit `doctor --require-tool-policy` for CI adoption enforcement. Configured mismatches and invalid/untracked/unavailable policy remain unconditional failures. Specified singleton Boolean parsing, doctor-only use, aggregate health, independent checks, and safe legacy diagnostic behavior. Updated rollout, AC7, and resolved decisions.
- **F3 — Resolved.** All project configuration sections now resolve from the validated physical worktree root through `configPaths`/`loadConfig`, including authority, hosts, review, and ownership. Nested project configs are ignored. User-source precedence otherwise remains unchanged. Outside Git, user setup loads user config only; diagnostics report absent project context and project mutation refuses. Documented the exported loader/path behavior change and strengthened AC5.
- **F4 — Resolved through documented recovery, retaining the gate.** Mismatched project removal still fails before writes. Its recovery first offers a verified matching runner; if unavailable, it explains deliberate owner removal of only the pin after settling owned activity, followed by warned legacy removal of owned integrations. This is an explicit loss of version protection, never an automatic edit, force flag, schema migration, or ownership waiver. AC8 now covers mismatch refusal and the recovery path.
- **F5 — Resolved.** Administrative-directory resolution belongs in `src/git/repository.mjs`, with its validation and read-only Git options. Defined fixed lock and receipt locations relative to the resolved administrative directory, ordinary/linked examples, and custom-layout behavior. Corrected the relationship to the common directory. Unreadable, unsafe, or unwritable locations fail closed with bounded `APR_TOOL_POLICY_BUSY` diagnostics; failed retention preserves the original lock or verified retained bytes and cannot authorize admission. Extended AC9.
- **O1 — Resolved.** Build suffix support is explicitly for local/development metadata; published releases must use distinct core or prerelease versions. No assertion about a particular registry normalization algorithm is required.
- **O2 — Resolved.** Distinguished package resolvability from project-policy compatibility and required independent diagnostic rows.
- **O3 — Resolved.** Added ordinary setup dry-run exit-status changes to migration notes.
- **O4 — Resolved.** The no-op shortcut retains full source, root, metadata, expectation, and tracking validation. An untracked matching pin refuses with `APR_TOOL_POLICY_UNTRACKED`, including dry run; no-op only skips writes, lock acquisition, and idle checks.

## Changes made

Edited the reviewed specification only. Tightened configuration authority, root selection, operation admission, ordinary/policy-only setup, lock recovery, diagnostics, migration, AC5/AC7/AC8/AC9, and resolved decisions. Also removed the operations-table ambiguity that could have interpreted legacy unconfigured mutation as always forbidden.

## Declined changes and rationale

Declined changing the public structural validator signature because the existing private per-file loader can enforce source restrictions without adding a caller-selectable source parameter to the public validator. This resolves the substantive requirement with less public API churn. The root-resolution behavior changes are explicitly documented for the exported loader/path APIs.

Selected documented owner-controlled uninstall recovery instead of expanding mismatch-time mutation privileges. The design already intentionally permits an owner to remove policy, and the revised text makes the consequences and prerequisites explicit.

## Verification

- Read the complete submitted reviewer response and inspected `src/config/load.mjs`, `src/doctor.mjs`, and `src/git/repository.mjs` to verify the reported code interactions.
- Checked the revised contract for consistency between legacy admission, default versus strict doctor behavior, raw-source enforcement, complete root resolution, no-op tracking, removal recovery, and lock-failure handling.
- Ran targeted Markdown lint and formatting validation on the specification, plus `git diff --check`; all passed with exit 0.
- No runtime tests are claimed for this document-only revision. The implementation acceptance criteria remain prospective requirements.
