<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1a8a872f54baab9ed9aabc4a99fd9b5a"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave11.md"
artifact_commit: "91fa4acdfdd5f3a16930cdbc4ad1a735ef440443"
artifact_blob: "123abd5ac09cdb5dfdc80bfb7e1acd2e79a1c7ff"
artifact_digest: "sha256:8d29da6abf4c489739308189ae110f7b2a0057afe6239941a45b03bfcf5f4649"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:7ede98a76f71d3299e07dd1c10caff8001ccaf249e04376fdaee8c0a555bb2ce"
  identity_source: "runtime"
started_at: "2026-10-16T00:58:45.761Z"
submitted_at: "2026-10-16T01:00:18.336Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-11 registration review artifact against the three working-tree registration records and `registration-index.json`. I also compared it with the accepted wave-10 artifact and its reviewer response, and with the earlier Windows and darwin registrations. I used only Read, Glob and Grep. I ran no shell, Git, hashing or test commands; Bash was denied in this session.

What I checked and found consistent:

- **Table versus records.** All three rows match their records exactly: capture ID, platform, build, architecture, `nodeMajor` and `kinds`.
  - ac9a: darwin, `25.6.0`, arm64, Node 26, absence.
  - be99: win32, `10.0.26100`, x64, Node 24, absence.
  - c8bb: win32, `10.0.26100`, x64, Node 26, absence.
- **Index coverage.** The working-tree `registration-index.json` lists exactly these three capture IDs and paths, in the same order as the JSON reference block. It lists none of the five wave-10 captures, which matches "excluded from this index". All four references name revision `201f367…`, which is the recent commit "Preserve five signed controls and remaining repair registrations". The wave-10 registration files (35e9, 6451, 74d6, 837d, c8bf) are still present in the working tree.
- **Package tuple.** All three records bind `sourceCommit` edc0585afd21be8e645b4903323b116225987711, inventory `sha256:671b62eb…5ac6` and contract `sha256:e9793b09…c66e`.
  - The darwin tarball `sha256:8d42ec62…9ebe3` equals the wave-10 Linux/darwin value.
  - Both Windows records bind `sha256:0ac59445…eab21`.
  - These match the prose tuple lines exactly. The artifact correctly disclaims archive-member equivalence and any causal explanation of the platform difference.
- **Host and key separation.** There are three distinct `hostId` values (`298788dd…`, `1ea99171…`, `ae4b27fc…`) and three distinct `publicKey`/`keyId` values (`41e8a3e7…`, `45f949d5…`, `4d739b08…`). This matches "3 actual worker host hashes and 3 distinct protected signing keys". None of these host or key hashes appears in any other file under `evidence/`, so no host or key is reused from an earlier wave.
- **Probes.**
  - The darwin record uses `/bin/ps`, `same-user-full-selection` and `exact-ps-selection-v1`. Its version hash `sha256:62c342e1…940f` matches the accepted wave-9/wave-10 darwin probe.
  - Both Windows records use the system `powershell.exe` path, `local-cim-query` and `completed-cim-query-v1`. Their version hash `sha256:54b68d39…4366` appears in 19 earlier Windows registrations.
  - All probe paths are system paths. None is a user path, SID or raw host identifier.
- **Capabilities and transitions.** All three records are `kinds: ["absence"]` with `transitions: []`. This matches "no creation registration, permits absence only with empty transitions" and the statement that no clock, timezone, DST or privilege change is authorized.
- **Carried-forward content.** The source-closure paragraph is unchanged from accepted wave 10: 117 files, contract `e9793b09…`, the two repairs and the prior `55825683` source. So are the regression paragraph (36 and 124 controls, 38 prior classes), the producer-freeze paragraph, the class-review gate, the #209/#210 statements, the budgets and the incomplete-journey list. The preservation sentence now also names "index blobs at their own immutable revisions", which adopts wave-10 optional suggestion 2.
- **Scope language.** The artifact claims no aggregate success, completed signed capture, class admission or installed authority. Class approval stays a separate gate.

**Verification limits.** I could not independently verify any of the following in this session:

1. The raw Git blob SHA-1 and SHA-256 values in the JSON block, and the canonical-record digests in `registration-index.json`. No hashing was possible.
2. That revision `201f367…` contains exactly these working-tree bytes. Git was not permitted.
3. The hosted run 38826982156, its attempt, event or the Windows/macOS job scope.
4. The 117-file closure and contract-digest derivation, and the producer-freeze check.
5. The RED/GREEN regression and "36 + 124 affected controls" claims, and the lint/format claims.
6. Ed25519 key provenance and whether the keys are protected.

Accepting this registration review would not attest to any of these items. They stay with the separate class review, which must verify them mechanically.

## Findings

1. **A stale Linux claim is inconsistent with this wave's scope.** In the host/key paragraph (artifact line 15), the sentence "Each Linux absence/creation pair shares only its worker host identity and uses separate keys." was carried over from wave 10. Wave 11 contains no Linux registration and no creation registration. The artifact itself says the index "covers only Windows Node 24/26 and macOS Node 26 absence registrations" and that "This wave contains no creation registration". The sentence therefore asserts a property of records that are not among "the 3 registrations" this paragraph describes, and the bound index cannot support it. The artifact's own rule says to "Reject widened, inconsistent … or unproved material". A sealed registration review should not make an in-scope claim about out-of-scope captures. It could also be read as implying that Linux captures are part of this index.

## Required changes

1. Remove the sentence "Each Linux absence/creation pair shares only its worker host identity and uses separate keys." from the host/key paragraph. Replace it with a statement that fits this wave, for example: "No two of these registrations share a worker host identity or signing key, and none reuses a host identity or key from an earlier wave." Then re-seal the index, capture and artifact references as usual.

## Optional suggestions

1. The Windows Node 24 and Node 26 records share build, architecture and probe hash but have different `hostId` values. Stating in one clause that they ran on separate hosted workers would make the "3 actual worker host hashes" claim self-explanatory.
2. To match the wave-10 precedent of naming excluded workers, consider stating that this wave plus wave 10 together cover all eight current repair-source registrations. Do this only if that statement is mechanically true. Otherwise leave the scope as it is.

## Decision

revisions-requested
