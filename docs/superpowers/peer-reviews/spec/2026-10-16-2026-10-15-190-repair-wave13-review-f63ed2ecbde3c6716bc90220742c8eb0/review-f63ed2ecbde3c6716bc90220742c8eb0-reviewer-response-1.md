<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-f63ed2ecbde3c6716bc90220742c8eb0"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-repair-wave13.md"
artifact_commit: "52564f941101ca21f91e86922ea95d0e9ee5f06a"
artifact_blob: "a9a871e211ef46290dfad927579d8694dc230c0f"
artifact_digest: "sha256:c33b321d2bff0bdcaa3f93dd8f0650802d6d4d3d5930c3e99db5ae07d6d20e0f"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:2fb8a3e599f8482552d1310d3f29af1bbaf647ac80c9374917e66ecec0c7dd2a"
  identity_source: "runtime"
started_at: "2026-10-16T01:40:53.252Z"
submitted_at: "2026-10-16T01:43:00.205Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-13 class-approval artifact (`evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-repair-wave13.md`) against the working-tree copies of the files it references:

- `classes/190-repair-wave13-proposals.json`;
- the two `receipt.json` and two `host-control.json` files (source-321bef39…, source-e7af404e…);
- `classes/190-ci-provenance-38832691552.json`;
- the two `registrations/source-*.json` records and the working-tree `registration-index.json`;
- the accepted wave-13 registration review subject, its manifest and its final reviewer response (`review-b8c66ce2…`);
- `classes/review-index.json`;
- the sibling wave-12 class artifact, one wave-12 receipt and host control, and the accepted wave-12 class reviewer response (`review-90629282…`), for comparison.

I used only Read, Glob and Grep. Bash was denied in this session for everything except the exact join and submit commands, and the invitation forbids Git. I therefore ran no shell, Git, hashing, signature or network commands.

What I checked and found consistent:

- **Proposals versus table.** Exactly two proposals, matching the table on class ID, capability, platform, build, architecture and `nodeMajors`:
  - `source-b8c43746…`: win32, `10.0.26100`, x64, Node 26, absence, semantics `windows-cim-completed-v1`;
  - `source-c4122dde…`: darwin, `25.6.0`, arm64, Node 26, absence, semantics `darwin-ps-selection-v1`.

  Both bind contract `sha256:e9793b09…c66e`, registration revision `65f008a1…` and index digest `sha256:356633aa…d170` (identical to the JSON `registrationApproval`), source `91fa4acd…0443` and inventory `sha256:671b62eb…5ac6`. The win32 class binds tarball `0ac59445…deab21` and darwin binds `8d42ec62…9ebe3`, matching the accepted registration review's tuple lines. Each proposal has exactly one evidence digest, so "2 finite proposals from 2 signed receipts" holds.
- **Class IDs are new.** Grep across `evidence/` finds `b8c43746…` and `c4122dde…` only in wave-13 files. They do not collide with any earlier class. Their scopes are disjoint from the wave-12 darwin/win32 classes (`309cdbd0…`, `4d1b20fb…`), which cover Node 24 only.
- **Receipts versus registrations.** For both receipts, `captureId`, `hostId`, signature `keyId`, `sourceCommit`, `tarballDigest`, `inventoryDigest`, `contractDigest`, platform, build, architecture, `nodeMajor`, all four probe fields and `kind` equal the registration record. Both registrations have `kinds: ["absence"]` and `transitions: []`. Each receipt's `registrationDigest` equals the digest that `registration-index.json` lists for that capture (`68844201…44e1` darwin, `aec817a6…68ea4` win32). Both carry `registrationRevision` 65f008a1… and `registrationIndexDigest` 356633aa…. The two host IDs (`11783a04…`, `157bd82f…`) and two key IDs (`99f1ac7b…`, `6e4192d8…`) are distinct from each other and from the wave-12 darwin key (`b0a16e19…`) and host (`88a3499a…`).
- **Receipt contents.** Both are absence-only: `transitions: []`, boot before/after `null`, exit code 0 with no signal, absence `absent` for the same PID as the live control, negative control `unknown` / `probe-query-error`, and cleanup `childExited:true`, `restoration:"not-required"`. This is the same shape as the accepted wave-12 darwin Node 24 receipt. The darwin creation window is 1 s wide and the Windows window is 100 ns. The darwin live creation time (~1792114115 s) is about 589 s after the wave-12 darwin Node 24 capture (~1792113526 s). That fits these two workers resuming after the later wave-13 approval was published.
- **Host controls.** Both bind run `38832691552`, attempt `1`, `codeCommit` 91fa4acd…, `captureProducerCommit` `7069d782…`, the matching `captureId` and `kind: absence`, with `clockChanges: "none"`, `restoration: "not-required"` and `verified:false` at both levels. `7069d782…` differs from wave 12's `09b2602e…`. That is consistent with the separate approval publication described ("Publish normal approval for final two fresh source captures").
- **Registration approval lineage.** The pinned subject path, revision `451015b0…`, blob `3949a50a…` and sha256 `b06778f9…` match the `artifact_*` fields of the accepted final reviewer response and the manifest's `artifact_history` / `final_commit`. The manifest records `status: "accepted"`, `acceptance_basis: "reviewer-consensus"` and a single turn with decision `accepted`. Its `reviewer_response.digest` `09e7aa98…f38b` equals the pinned `finalResponse.sha256`. The author (codex / gpt-6.1-sol) and reviewer (claude-code / claude-opus-5-5) are distinct sessions, so the registration approval is not self-approved. The final reviewer response records `accepted` with no findings and defers the same mechanical checks to this class review.
- **CI projection.** Run 38832691552, attempt 1, `workflow_dispatch`, `.github/workflows/process-source-capture.yml`, completed/success, with six completed/success jobs over Linux/macOS/Windows × Node 24/26. `verified:false` is kept. Wave 13 uses the Windows Node 26 and macOS Node 26 workers. Wave 12 used the other four (Linux 24, Linux 26, Windows 24, macOS 24). The waves do not overlap.
- **Prior run.** The three failed-wait captures (ac9a darwin Node 26, be99 win32 Node 24, c8bb win32 Node 26) are named only to deny them authority. This matches the wave-12 artifact.
- **Earlier optional suggestion addressed.** The registration review's reviewer asked that the "91fa4ac advances only Markdown/JSON from edc0585" claim name its mechanical basis. This artifact now names the exact `git ls-tree -rz --name-only` / `git diff --name-only -z edc0585… 91fa4ac… --` comparison, the 28 changed authority/review paths and `assertCaptureProducerFiles`.
- **Scope language.** Absence-only for Windows and macOS Node 26. No creation, clock, timezone, DST or privilege coverage is claimed. Wave-12 Linux creation stays confined to its own class. Budgets (30/15/5/800, four-job cap), the #209/#210 statements, exclusions and the list of incomplete installed journeys are carried forward unchanged. Apart from the wave-specific header counts, table, registration-approval pins and scope paragraph, the text matches the accepted wave-12 class artifact word for word.

**Verification limits.** I could not independently verify any of the following in this session. Accepting this review does not attest to them; the genuine normal class reader must check them mechanically.

1. Any SHA-1 blob or SHA-256 value in the JSON block, the proposal `evidenceDigests`, receipt `registrationDigest`, `registrationIndexDigest` or the `finalization` digest. No hashing was possible, so I only cross-matched identical strings between files.
2. The Ed25519 signatures on both receipts against the registered public keys.
3. That revisions `65f008a1…`, `451015b0…`, `5a538abe…` and `629e9f19…` contain these exact bytes. Also that `7069d782…` descends from 91fa4ac… with only non-producer changes, and the 91fa4ac/edc0585 tree comparison with `assertCaptureProducerFiles`. Git was not permitted.
4. The authenticated GitHub run, job and attempt identities and conclusions for 38832691552, and the outcome of 38826982156. No network or `gh` was used. Host controls and receipts carry no job ID, so I could not tie either capture to job `116754795338` (Windows 26) or `116754795455` (macOS 26) beyond platform/Node matching.
5. Class-ID derivation, the 117-file closure, the contract-digest derivation, and the regression and repair claims in the source paragraph.
6. Key protection and provenance, and actual host behaviour beyond what the signed and unverified records state.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The sentence "All 38 previously accepted classes remain immutable history for their old covered bytes" was copied from wave 12. At artifact commit `52564f94…`, the wave-12 class review (`review-90629282…`) has also been accepted and finalized. Its four classes are for the *current* contract, not old bytes, and `classes/review-index.json` still lists only 14 reviews (38 classes). Nothing here is widened, because wave-12 scopes are disjoint (Node 24 on darwin/win32, Linux-only otherwise) and the artifact already says other waves keep separate provenance. Future waves could still state explicitly that the wave-12 current-contract classes are separately approved and supply no coverage for these classes. That would keep the count and its description accurate once the ledger adopts wave 12.
2. As noted in the wave-12 class review, recording the GitHub job ID per capture (in the host control or receipt) would let a reader-only review tie each capture to a specific authenticated job, not just a platform/Node pairing.

## Decision

accepted
