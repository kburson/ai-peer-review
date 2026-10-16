<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-3da826744d79b65dff3f733d784232c5"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave12.md"
artifact_commit: "0581204151391f1d047c59cdc97f36fef3960ce5"
artifact_blob: "3fbcaffac1b7e2d67c0adeb0115de9f2bc5716d2"
artifact_digest: "sha256:a3ce58745c6e616aec54163139efd4fba81971debf50c5fb10f94ca822df38ee"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:dd8b9362204111a088aaa59cb663b54aa4c9544812f0edb92c5e1c23debeafa2"
  identity_source: "runtime"
started_at: "2026-10-16T01:14:54.419Z"
submitted_at: "2026-10-16T01:16:57.254Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-12 registration review artifact against the six working-tree registration records and `registration-index.json`. I also compared it with the accepted wave-10 and wave-11 artifacts and the wave-11 reviewer response. I used only Read, Glob and Grep. I ran no shell, Git, hashing or test commands. Bash was denied in this session for anything other than the exact join and submit commands.

What I checked and found consistent:

- **Table versus records.** All six rows match their records exactly: capture ID, platform, build, architecture, `nodeMajor` and `kinds`.
  - 1bc4: linux, `6.17.0-1022-azure`, x64, Node 24, creation.
  - 2df3: win32, `10.0.26100`, x64, Node 24, absence.
  - 361b: linux, `6.17.0-1022-azure`, x64, Node 26, creation.
  - 4ceb: darwin, `25.6.0`, arm64, Node 24, absence.
  - a06c: linux, `6.17.0-1022-azure`, x64, Node 24, absence.
  - a2a5: linux, `6.17.0-1022-azure`, x64, Node 26, absence.
- **Index coverage.** The working-tree `registration-index.json` lists exactly these six capture IDs and paths, in the same order as the JSON reference block. It lists no wave-10 or wave-11 capture and no Windows or macOS Node 26 capture. This matches "excluded from this index". All seven references name revision `29cf2f2…` ("Pin six fresh capture registrations after review-host relocation"). The artifact commit is `0581204…`, which comes after it.
- **Package tuple.** All six records bind `sourceCommit` 91fa4acdfdd5f3a16930cdbc4ad1a735ef440443, inventory `sha256:671b62eb…5ac6` and contract `sha256:e9793b09…c66e`.
  - The four Linux records and the darwin record bind tarball `sha256:8d42ec62…9ebe3`.
  - The Windows record binds `sha256:0ac59445…eab21`.
  - These match the prose tuple lines exactly. The contract, inventory and both tarball values are identical to waves 10 and 11 (source `edc0585…`). That fits the claim that only review collateral advanced, since 91fa4ac is the commit that sealed the wave-11 review.
- **Host and key separation.** There are four distinct `hostId` values:
  - `d8f1fecd…`: Linux Node 24 creation (1bc4) and absence (a06c).
  - `805b69af…`: Linux Node 26 creation (361b) and absence (a2a5).
  - `e4e0ffe0…`: Windows (2df3).
  - `88a3499a…`: darwin (4ceb).

  There are six distinct `publicKey`/`keyId` values (`b967cf14…`, `904a32fe…`, `261697a2…`, `b0a16e19…`, `6bf02dd8…`, `06dd0a45…`). This matches "4 actual worker host hashes and 6 distinct protected signing keys". It also matches "The Linux absence/creation pairs use distinct keys on their respective workers". None of these host or key hashes appears in any other file under `evidence/portable-runtime/process-source`, so no host or key is reused from an earlier wave.
- **Probes.**
  - The Linux records use `/proc`, `full-pid-namespace`, `exact-pid-directory-v1` and `procfs-v1`.
  - The darwin record uses `/bin/ps`, `same-user-full-selection` and `exact-ps-selection-v1`, with version `sha256:62c342e1…940f`. This matches earlier accepted darwin probes.
  - The Windows record uses the system `powershell.exe` path, `local-cim-query` and `completed-cim-query-v1`, with version `sha256:54b68d39…4366`. This matches earlier accepted Windows probes.
  - No probe path is a user path, SID or raw host identifier.
- **Capabilities and transitions.**
  - Only the two Linux creation records (1bc4, 361b) carry `kinds: ["creation"]`. Their transitions are `clock-forward`, `clock-backward`, `timezone` and `dst`. These match the prose: ±90-second UTC steps, the New York-to-Detroit zone change and the opposite-DST seasonal step.
  - All four absence records have `transitions: []`.
  - The creation authorization paragraph names exactly 1bc4 and 361b. It limits Windows and macOS to absence.
- **Run lineage.** The artifact explains why run 38826982156 is superseded: three successful workers and three failed approval waits remain incomplete and give this run no class approval. It confines this index to four of the new run's workers. The Windows and macOS Node 26 captures are deferred to separate normal approval. The wave-11 defect (a Linux claim stated about a wave with no Linux records) does not recur. Every host/key claim here describes records that are in this index.
- **Carried-forward content.** These parts are unchanged from accepted waves 10 and 11:
  - the source-closure paragraph (117 files, contract `e9793b09…`, the two repairs against `55825683`);
  - the regression paragraph (36 and 124 controls, 38 prior classes, preserved immutable index blobs);
  - the producer-freeze paragraph (now checked against 91fa4ac);
  - the class-review gate;
  - the #209 and #210 statements;
  - the budgets;
  - the incomplete-journey list.
- **Scope language.** The artifact claims no aggregate success, completed signed capture, class admission or installed authority. Class approval stays a separate gate.

**Verification limits.** I could not independently verify any of the following in this session:

1. The raw Git blob SHA-1 and SHA-256 values in the JSON block, and the canonical-record digests in `registration-index.json`. No hashing was possible.
2. That revision `29cf2f2…` contains exactly these working-tree bytes, or that 91fa4ac differs from edc0585 only in non-covered review collateral. Git was not permitted.
3. Hosted run 38832691552: its attempt, event, worker/job scope, and the outcomes of run 38826982156.
4. The 117-file closure, the contract-digest derivation and the producer-freeze check.
5. The RED/GREEN regression claims, the "36 + 124 affected controls" claims and the lint/format claims.
6. Ed25519 key provenance, and whether the keys are protected.
7. The privilege/restoration preflight for the Linux creation procedure.

Accepting this registration review does not attest to any of these items. They stay with the separate class review, which must verify them mechanically.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. In the source-closure or producer-freeze paragraph, add one clause saying that source 91fa4ac differs from the previously reviewed edc0585 only in non-covered review collateral. The unchanged contract, inventory and tarball digests make this mechanically checkable. Stating it would tell readers why the same covered-bytes narrative and package tuples carry forward to a new source commit.
2. Artifact line 30 reads "the exact Linux creation registrations source-1bc4c61df889d6260311297d84aff16e, source-361b058077b403406d8f65e8be0afdc8 to execute …". Consider "the two exact Linux creation registrations source-1bc4… and source-361b…". This matches the wave-10 wording and states the count explicitly.

## Decision

accepted
