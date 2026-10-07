<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-ff812d33b79e68421444081ae37aed02"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-06-141-protected-storage-ownership-decomposition.md"
artifact_commit: "3c15fb6686d85265ec4389a20528eee1a2672e74"
artifact_blob: "61919abe3b1cb5578a2b12dc5771115c8be19f37"
artifact_digest: "sha256:59c04cdb5b19e723e9ff1aebe8124d54591f0d9aaad8c5652adbc8aa8e4051e7"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:db094b09316e5c19e7a52a769b9731a6d2a4a2cec440393187c13b4a8ec89c4a"
  identity_source: "runtime"
started_at: "2026-10-07T03:35:58.711Z"
submitted_at: "2026-10-07T03:42:25.882Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-read the full revised plan, bound at commit `3c15fb6` (blob `61919abe…`), 353 lines. I also read author response 1 and checked each disposition against the revised text, the accepted #107 Task2 source section and its migration map, and the current `src/` tree. This session may run only the submit command, so I could not hash the working-tree bytes against `sha256:59c04cdb…51e7` or use Git. I rely on the runtime's artifact binding for that.

All five round-1 findings are resolved:

- **R1-F001 (consumer inventory) — resolved.** C6's Files list (line 316) now names every native caller I found in round 1:
  - `startup/authority-fence.mjs`;
  - `config/runtime-selection-core.mjs`, `primary-admission.mjs`, `primary-maintenance.mjs` and `primary-authority.mjs`;
  - `cli/run-core.mjs`;
  - `broker/service.mjs`, `service-core.mjs` and `ipc.mjs`.

  These are in addition to the original consumers. The new `test/unit/portable-consumer-inventory.test.mjs` step (line 321) statically walks the complete src/bin graph. It forbids `platformSecurity`, `inspectPlatformSecurity`, `loadBinding`, `peerUser` and native handle operations on any portable path, and it requires an owned row for every new consumer. Remaining build/load inventory goes explicitly to #107 Task4 (#143), with the condition that it must already be unreachable from portable operations.

  `primary-admission.mjs`'s exclusive lock is now an explicit, separate primary-selection resource that runs on the same algorithm in its own slots (lines 189 and 323). Root #141 checks the re-derived current inventory as well as the original map rows (line 352). This also closes review focus 5's native-fallback route.
- **R1-F002 (task namespaces) — resolved.** Line 75 states the convention: C1–C6 for this plan's children, `#107 TaskN` for the source plan. Lines 58, 271, 275 and 326 now use explicit prefixes. I found no remaining bare "TaskN" reference that changes meaning.
- **R1-F003 (per-child sizing) — resolved as asked.** Line 100 and each child's new `Size and estimate` line allocate the unreduced 46 hours as 10/8/7/7/6/8, each under 24 hours. External capture, review and restoration waits are kept separate. Each child must re-estimate natively and split again rather than shrink its estimate. Optional suggestion 1 has a residual credibility note on this.
- **R1-F004 (election reuse) — resolved.** C3's Interfaces (line 189) now bind the `paths` argument to a verified protected election root and canonical resource key. Owner, provider-resource and primary-selection elections use independent slot sets, and no caller string can select an unverified path. A won lease now scopes manual fencing without a nested acquisition or a renewed deadline. The new RED step (line 192) covers cross-resource independence and the manual-fence lease/deadline schedules before C3 closes. C3 keeps the original API name and signature, so the shared contract is unchanged.
- **R1-F005 (dropped obligations) — resolved.** The previously missing obligations are now owned:
  - C1 pins System32 WindowsPowerShell with `Get-Acl -LiteralPath`, with no PATH, wildcard or interpolation (line 122). It adds the owner-SID-only refusal and real elevated/non-elevated Administrators-owned creation with a membership and effective-rights proof (line 120).
  - C4 owns the exclusive 32-byte credential under `.scratch/peer-review/private/` and the field set of `runtime/endpoint.json`. It clarifies that the endpoint digest is a non-secret binding digest, and adds RED checks that endpoint, status, doctor and error output expose neither credentials nor credential digests (line 238).
  - C5 names `classes/<class_id>.json` and the other exact evidence paths (line 269), and adds the Linux before/after boot_id record without any #107 Task3 claim (line 275).

The author also adopted all three round-1 optional suggestions:

- The production and negative-class snippets are now separate (lines 329–342).
- `storage-protection.test.mjs` is in C6's verifier (line 347).
- Strict sequencing explicitly waits at C5 for genuine accepted classes before C6 Develop (line 100).

The revision introduces no new requirement drift. The original named APIs, typedefs, numeric bounds, refusal semantics and cumulative root boundary are unchanged. Nothing in the revision lets a fixture, a proposed class or a child-level result stand in for installed, class or activation authority.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The C5 (6 hours) and C6 (8 hours) allocations look optimistic compared with their scope:
   - C5 covers seven driver modes, two schemas, signing and verification, and registration/index handling.
   - C6 now migrates about 18 modules, adds the static inventory verifier, and runs real multi-OS bootstrap, manual-recovery and fresh-install journeys.

   Meanwhile C1 has 10 hours. The plan already requires each child to re-estimate natively and split at 24 hours, so this does not block acceptance. Consider adding one sentence on how the 10/8/7/7/6/8 split was derived, for example from the 33 base WBS hours. That would let a later reviewer tell a deliberate allocation from an even division.
2. Line 318 says "child C2 owns all process-identity/probe/protection source-contract edits". Storage-protection code belongs to C1 (line 77), and the process-source contract hash covers process adapter, parser and validator bytes (line 159). Consider saying "children C1/C2 own protection and process-identity/probe edits; only C2's adapter/parser/validator bytes form the source contract". That avoids implying that a C1 protection change forces a C5 recapture, or that C2 may edit protection code.

## Decision

accepted
