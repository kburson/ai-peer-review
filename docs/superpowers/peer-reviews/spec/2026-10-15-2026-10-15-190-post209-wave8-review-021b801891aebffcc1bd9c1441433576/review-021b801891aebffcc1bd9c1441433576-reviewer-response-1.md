<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-021b801891aebffcc1bd9c1441433576"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-post209-wave8.md"
artifact_commit: "ca5f2d034897bdf58468afda2160d02196e40dd1"
artifact_blob: "43bf4c91af81c29fd049f533744edd9957cd0ce6"
artifact_digest: "sha256:ec0e036f9dad63b4cfecc9c2348a05938238f59b70d655b26c6aa2ab5991cf18"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:931bc5d8baa2db04705876c93098345a2bb246946bd6445c983ec086463abc77"
  identity_source: "runtime"
started_at: "2026-10-15T22:34:29.518Z"
submitted_at: "2026-10-15T22:36:21.741Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-8 post-#209 registration artifact (`evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-post209-wave8.md`) against the six registration records on disk and the current `registration-index.json`. The artifact asks for approval of six exact public registrations from hosted run 38816754588 attempt 1, built from source `d754d02bbc30c6c92113e87be08c105fda08e12c`. It explicitly leaves out the queued Windows Node26 and macOS Node26 workers and claims no capture success, signed-control success, class admission or installed authority.

What I checked directly by reading the files:

- **Table vs. records.** All six records match their table row: captureId, platform, build, architecture, Node major and capability (`kinds`). The two Linux creation records (`3313…`, `525d…`) carry `transitions: [clock-forward, clock-backward, timezone, dst]`. All four absence records (`335a…` darwin, `6efc…` linux24, `73ca…` linux26, `dc1e…` win32) carry `transitions: []`. Windows/macOS are absence-only, as stated.
- **Host hashes and keys.** There are exactly four distinct `hostId` values. `670cde…` is shared by Linux Node24 creation and absence (`3313`, `6efc`). `3b3d35…` is shared by Linux Node26 creation and absence (`525d`, `73ca`). `dcfeb5…` is darwin only and `798b83…` is win32 only. All six `publicKey`/`keyId` pairs are distinct. This matches the claim of "four actual worker host hashes and six distinct protected signing keys", with each Linux worker's absence and creation records sharing a host hash but using separate keys.
- **Package tuple.** Every record binds `sourceCommit` d754d02…, inventory `sha256:93da7ecb…` and contract `sha256:55825683…`. The five non-Windows records bind tarball `sha256:0351b927…` and the win32 record binds `sha256:f016f655…`, exactly as the artifact lists them. The artifact says the platform tarball split is "recorded as actual values" and does not claim a causal explanation or archive-member equivalence. That framing is appropriately narrow.
- **Probe scope.** Linux records bind `/proc`, `full-pid-namespace`, `exact-pid-directory-v1`, `procfs-v1`. Darwin binds `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1` plus a digest version. Win32 binds the stock PowerShell path, `local-cim-query`, `completed-cim-query-v1` plus a digest version. These are finite and consistent with earlier accepted waves.
- **Index.** The current `registration-index.json` contains exactly these six captureIds, each with a path matching its record and a canonical-record digest. No other captures are present, so the index does not widen scope beyond the six.
- **Historical classes.** `src/protocol/process-source-contracts.json` holds exactly 32 `contractDigest` entries. None equals the new contract `sha256:55825683…`. This agrees with the claim that all 32 previously accepted classes are historical and grant no current admission.
- **Exclusions.** No record contains private keys, raw host identifiers, SIDs, user paths, credentials or provider handles. Only hashed host IDs and public SPKI keys appear.
- **Authorization boundary.** The clock/timezone/DST procedure is limited to the two expressly listed Linux creation registrations, after actual privilege/restoration preflight, with mandatory restoration on failure and no ordinary host change. Acceptance permits only these exact signed captures. Class approval, ledger adoption, installed journeys, whole-child review, exact-head CI and #190 delivery stay separate, later gates. Budgets (30/15/5/800 s, four-job portable cap) are unchanged and no waivers are introduced. The #209 prerequisite evidence is explicitly limited to its own repair checks, and #210 orphan resources are kept open.

Verification limits (stated as required):

- Shell execution was not available to this reviewer session, and Git use was prohibited. So I could **not** recompute the raw-blob SHA-1 (`blob`) or raw-byte SHA-256 values in the JSON reference block. I also could not confirm that revision `e8adc71…` contains these exact bytes, recompute the canonical index digests, or verify that HEAD `ca5f2d0` changed only review collateral after `e8adc71`. My consistency checks were against the working-tree files, which I treated as the bytes being referenced.
- I could not recompute the 117-file closure count, the contract digest, the tarball/inventory digests, or the producer-freeze partition check against d754d02.
- I did not inspect hosted run 38816754588 or CI 38808114086 on GitHub. Their identity, attempt, branch, job outcomes and worker status are taken from the artifact.
- These limits fall on the mechanical gates that the protocol already places on separate verification (signature/run-scope checks at class approval and blob verification by the tooling). They do not leave a semantic inconsistency in the material I could inspect.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Several numeric tokens lack a separating space: "per-read30second", "all32", "CI38808114086 (39required", "attempt1", "plus/minus90second", "remain30/15/5/800seconds", "Windows24 and macOS24". This is cosmetic only and needs no change for this immutable wave. Future waves could restore the spacing used in wave 7 (e.g., "30/15/5/800 seconds") for readability.

## Decision

accepted
