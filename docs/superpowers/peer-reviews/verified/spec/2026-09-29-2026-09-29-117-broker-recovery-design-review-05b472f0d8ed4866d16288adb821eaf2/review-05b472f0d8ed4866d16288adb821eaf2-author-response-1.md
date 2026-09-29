<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-05b472f0d8ed4866d16288adb821eaf2"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md"
artifact_commit: "15d12a98929b7f9e9323fff64e092d5adbfe789e"
artifact_blob: "e7d759eff5c9b52684e0c5a21ff34c9e3ee76830"
artifact_digest: "sha256:d0f97497c5c943cc91ba98ecf5567d94302a16dbd34eb42929c712b88560da01"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "GPT-6 Astra"
  session_fingerprint: "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62"
  identity_source: "runtime"
started_at: "2026-09-29T07:40:30.944Z"
submitted_at: "2026-09-29T07:49:57.085Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006","R1-F007","R1-F008","R1-F009"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Revised the specification to define the evidence and ownership rules that were previously implicit. The retirement guarantee is now explicitly limited to package-managed dispatch, with known external observations still blocking retirement and late external protocol activity rejected by terminal authority. The design removes the unsupported capability-ranking preference and defines the complete broker/workspace lock order.

This is a specification revision, not implementation acceptance. Author identity uses the genuine Codex session with explicitly declared GPT-6 Astra model metadata; its assurance is declared. The independently launched Claude reviewer has a different protocol session fingerprint and a submitted reviewer decision. The earlier uncertain review remains preserved and unresolved.

## Finding dispositions

- **R1-F001 — accepted.** A bare refused or not-submitted label does not prove non-delivery. Added typed package-local pre-dispatch receipt provenance, exact operation/request/runtime bindings, a closed reason set, and explicit rejection of legacy labels, unproven adapter refusals, and spawned-provider selection/version refusals. The existing coordinator permits adapter-produced refused outcomes, and existing retirement code accepts that label; implementation must close that gap.
- **R1-F002 — accepted with factual correction.** Defined proof scope as package-managed launch/resume/wake delivery. Unobserved out-of-band invitation use cannot be ruled out; terminal join/submit authority prevents continuation of the retired protocol without claiming cancellation of external work. Known external observations remain contradictory evidence. This specific review was launched by the package's headless launch-reviewer command, not by a human pasting the invitation; that detail does not alter the general scope concern.
- **R1-F003 — accepted.** Removed the capability-preference branch. Ranking uses authenticated review creation time and deterministic tie breakers only. The incident report is historical context; current readiness requires the authenticated live handshake and exact registration reconciliation. No new marker or retrospective pinned-image metadata is introduced.
- **R1-F004 — accepted.** Defined broker ownership before dispatch exclusion before review mutation. Offline acquisition is nonblocking and fails closed, holds ownership through append and owned cleanup, and cannot run a dispatch-capable reconciliation callback. Live settlement occurs before workspace locks; fallback starts over after releasing them. Added the broker-start/abandon race to verification.
- **R1-F005 — accepted through the explicit limitation option.** If the sealed author session is permanently lost before cleanup, the reservation stays retained and the output scope is reported as consumed. No new actor authority is invented; fresh output scope remains the available route. Replacement-author cleanup requires a separate authority contract.
- **R1-F006 — accepted.** If actual capture offers no supported structured fields or previously reviewed narrow pattern, defer the version-specific diagnostic with acceptance evidence and preserve generic classification. New message patterns need separate review; raw stderr scanning remains forbidden.
- **R1-F007 — accepted.** Status reads without filesystem-writing locks and reports inconsistent observations as unverifiable. Zero-write verification compares bytes, names, inode identity, and modification metadata in scratch/broker trees, excluding read-caused access-time changes.
- **R1-F008 — accepted.** Ranking guidance explicitly says recency describes review creation, not code age or compatibility.
- **R1-F009 — accepted.** Guidance names HEAD/author identity inputs and equivalent raw output-root spellings, requiring inspection of generated IDs/canonical output paths and retaining collision enforcement.

## Changes made

Updated scope, recovery ranking, non-submission evidence, out-of-band scope, lock ordering, cleanup recovery limits, diagnostic deferral, CLI guidance, and verification requirements in the tracked specification. Also aligned the command-path scope sentence with the installed 0.3.2 behavior: a bare peer-review alias is allowed only when it resolves to the exact installed package entrypoint; otherwise absolute package commands remain required.

## Declined changes and rationale

No finding is declined. For R1-F003 and R1-F005, selected the reviewer's simpler explicit alternatives: remove capability preference and retain consumed output scope when original actor authority is permanently lost. These avoid inventing new evidence or cleanup authority during specification review.

## Verification

Read the full durable reviewer response and checked the relevant implementation: src/coordinator/service.mjs forwards adapter refused outcomes; src/cli/run.mjs accepts refused wake labels in current abandonment checks; src/broker/ownership.mjs owns the broker lock while reconciling; src/provider/manual-launch-ledger.mjs only proves package-managed history. These observations support the specification clarifications and are not claims of repaired implementation.

The installed 0.3.2 doctor passed manual preflight with a healthy broker helper. Before launch, the installed buildClaudeReviewerLaunch builder produced exact bare peer-review join/submit commands resolving to its own global entrypoint, with all four permission readiness checks true. The headless launch returned submitted, protocol revision 3, and status showed author-revision. Author and reviewer fingerprints differ. No ambiguous launch was replayed and no earlier review evidence was changed.

Document verification passed: `./node_modules/.bin/prettier --check docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md`; `./node_modules/.bin/markdownlint-cli2 docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md`; and `git diff --check`, all exit 0. Pre-submit status contains only the revised specification and generated review collateral, including the preserved earlier attempt. No implementation tests ran because this turn revises specification prose; the implementation gates remain requirements, not claimed results.
