<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-61539a36b3d65ec9cbd8e189da6883e0"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave10.md"
artifact_commit: "3e582711f89f5eef61379015c2c57bc827d70e93"
artifact_blob: "07e6ea981e916c022a0804a58ed46659fe73a054"
artifact_digest: "sha256:ef7c5cd5367a20c297df350f057208c62a70850a2d898282db630b08c1d1a2ab"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:da24e4c4a9702ec967153e193471ac663036a8341cbae71e5ecdaeee08a5d232"
  identity_source: "runtime"
started_at: "2026-10-16T00:10:11.079Z"
submitted_at: "2026-10-16T00:12:15.816Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-10 registration review artifact against the five working-tree registration records, `registration-index.json`, the wave-8/wave-9 registration and class-review collateral, and the two repaired source modules it describes. I used only Read/Glob/Grep. I ran no shell, Git, hashing or test commands.

What I checked and found consistent:

- **Table versus records.** All five rows match their records exactly: capture ID, platform, build (`6.17.0-1022-azure` for Linux, `25.6.0` for darwin), architecture (x64 for Linux, arm64 for darwin), `nodeMajor` and `kinds`. They are 35e9 (linux/26/absence), 6451 (linux/26/creation), 74d6 (linux/24/absence), 837d (darwin/24/absence) and c8bf (linux/24/creation).
- **Index coverage.** `registration-index.json` lists exactly these five capture IDs and paths. The JSON reference block names the same five paths plus the index, all at revision `3fcb15a…`. This matches the recent-commit subject "Record exact Linux and macOS repair capture registrations".
- **Package tuple.** All five records bind `sourceCommit` edc0585afd21be8e645b4903323b116225987711, tarball `sha256:8d42ec62…9ebe3`, inventory `sha256:671b62eb…5ac6` and contract `sha256:e9793b09…c66e`. These match the artifact's prose. The shared Linux/darwin tarball value with a separate Windows value follows the wave-8 precedent, where linux and darwin both recorded `0351b927…`. The artifact correctly disclaims archive-member equivalence.
- **Host and key separation.** There are 3 distinct `hostId` values. `c360c479…` is the Node 26 Linux pair, `e72672bf…` is the Node 24 Linux pair and `d36860e7…` is darwin. There are 5 distinct `publicKey`/`keyId` values. Each Linux absence/creation pair shares only its host hash, as claimed.
- **Probes.** Linux records use `/proc` with `full-pid-namespace`, `exact-pid-directory-v1` and `procfs-v1`. The darwin record uses `/bin/ps` with `same-user-full-selection` and `exact-ps-selection-v1`, and its probe version hash `sha256:62c342e1…940f` is identical to the accepted wave-9 darwin probe.
- **Transitions.** Only the two Linux creation records (6451, c8bf) carry `transitions: ["clock-forward","clock-backward","timezone","dst"]`. All absence records, including darwin, have empty transitions. This matches the clock/zone/DST procedure the artifact authorizes and its "Windows/macOS permit absence only" limit.
- **Excluded workers.** Windows Node 24, Windows Node 26 and macOS Node 26 have no records in this index, and the artifact excludes them explicitly.
- **Prior-class count.** "All 38 prior classes" reconciles: the wave-8 class review cites 32 previously accepted classes, `190-post209-wave8-proposals.json` adds 4 and `190-post209-wave9-proposals.json` adds 2. The prior contract `55825683…` matches the contract in the wave-9 proposals. Wave-9 registration files (`source-3c4630b6…`, `source-b61f6703…`) remain present, so the "preserved" claim holds.
- **Described repairs.** The working-tree source matches both descriptions:
  - `src/broker/ownership-election.mjs:721-724` keeps the authenticated `pathBinding: binding` separately from the transaction's freshly opened guards. `inspectOwnerElectionLease` (`:554-555`) compares against that retained origin, and unknown `paths` still refuse with `owner-lease-paths-mismatch`.
  - `src/startup/authority-fence.mjs:318-346` re-observes the primary and asserts its generation for a nested operation in a different lexical directory. It refuses if the active worktree root, activation digest or integration digest changed. Only then does it inherit the parent seal: the original context signal/deadline plus the private lineage, bound through `createAdmissionLineageCore` (`:73-96`). A child's caller-supplied `signal`/`deadline` is not used on that path, so it cannot extend the budget. This supports "no field supplied by a caller grants authority."
- **Scope language.** The artifact consistently claims no aggregate success, signed capture, class admission or installed authority. It keeps class approval as a separate gate that must check signatures, exact CI run/job/attempt, host restoration and the producer tree through `captureProducerCommit`. The 30/15/5/800-second budgets, four-job cap, 16-hour estimate, #209 Closed/Done, #210 orphan scope and the Linux-manual-review exclusion are unchanged and consistent with wave 9.

**Verification limits.** I could not independently verify any of the following in this session:

1. The raw Git blob SHA-1 and SHA-256 values in the JSON block, and the canonical-record digests in `registration-index.json`. No hashing was possible.
2. That revision `3fcb15a…` contains exactly these working-tree bytes. Git was not permitted.
3. The hosted run 38826982156, its attempt, event or job scope.
4. The 117-file closure and contract-digest derivation, and the producer-freeze check.
5. The RED/GREEN regression results and the "36 + 124 affected controls" and lint/format claims.
6. Ed25519 key provenance and whether the keys are protected.

Accepting this registration review does not attest to any of those items. They stay with the separate class review, which must verify them mechanically.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The authorization paragraph says "the two exact Linux creation registrations below" but does not name them. Naming `source-64518a2f7ff9659570d7f1d773e5d6be` and `source-c8bf7c1b096e70312cce9d7600b6bf4a` inline would remove any reliance on cross-reading the table.
2. Wave 9 explicitly stated that prior index blobs remain independently verifiable. Wave 10 names only "prior raw registrations, reviews and receipts" as preserved. Adding "and index blobs at their own revisions" would make clear that replacing the index contents does not orphan the wave-8/wave-9 index references.

## Decision

accepted
