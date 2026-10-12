<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-b4675e5ea00233412385f82396f08c39"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave4.md"
artifact_commit: "faa376da2103cb2dec2c1560c94ee07aba4a898b"
artifact_blob: "539a5e39449e3bfb85a2c4414b0c728eb593977d"
artifact_digest: "sha256:46d36a77a168ba8d64bdef4246db26b7da405e9184a633a55ba1fad8625ee629"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:e4633a1bc573e9176f1ffe94824cb2b1b2543b40524a9deee8f6f2ac32a00b64"
  identity_source: "runtime"
started_at: "2026-10-12T09:05:19.776Z"
submitted_at: "2026-10-12T09:07:05.370Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Independent review of the wave-4 registration artifact (`2026-10-12-190-scope-recapture-wave4.md`, artifact commit `faa376d`) proposing five public registrations from hosted run 38224061596, attempt 1, at executing source `2a6adf5b057084ada54ca0708e0a0f02482ce85a`.

What I checked, by reading the working-tree files (git status shows only the untracked peer-review directory, so these are the files committed at `faa376d`):

- **Index vs artifact.** `evidence/portable-runtime/process-source/registration-index.json` lists exactly the five capture IDs in the artifact table, and nothing else. Each entry's `path` matches the path in the artifact's JSON block, and each `digest` is a `sha256:` canonical-record digest. The new index contains only this wave. That matches the earlier wave pattern, where earlier index generations are kept through immutable Git references.
- **Each registration record vs the artifact table.** I checked platform, build, architecture, Node major and capability for all five records:
  - `source-16bc77b6…`: linux / 6.17.0-1022-azure / x64 / Node 24 / creation. Transitions are `clock-forward, clock-backward, timezone, dst`.
  - `source-fc9482e6…`: linux / same / x64 / Node 24 / absence. Transitions are empty.
  - `source-3b3170e1…`: linux / same / x64 / Node 26 / creation. It has the same four transitions.
  - `source-55832d07…`: linux / same / x64 / Node 26 / absence. Transitions are empty.
  - `source-3628b759…`: darwin / 25.6.0 / arm64 / Node 24 / absence. Transitions are empty.
  - All five match the artifact table exactly.
- **Package tuple.** All five records carry the same values:
  - `sourceCommit` `2a6adf5…`
  - tarball `sha256:5fed440b…27da`
  - inventory `sha256:4cf3ce90…a0f2`
  - contract `sha256:340ece55…db25`

  These match the artifact. The tarball and inventory differ from the accepted 9fe6817 Linux/macOS tuple (`21331c1d…`/`dae2c976…`). I confirmed that by reading the accepted 9fe6817 records `source-2311c91f…` (Linux) and `source-c9b4d0b5…` (macOS Node 26, unreviewed wave-2). The contract digest is unchanged, as the artifact claims. The inventory digest `4cf3ce90…` is also the one in the separately accepted wave-3 Windows Node 24 record `source-69a9352a…` at the same source. Only the tarball differs by platform family (Windows `5d96830e…`), the same Windows vs Linux/macOS tarball split that the accepted wave 1 records.
- **Host grouping.**
  - Linux Node 24 creation and absence share hostId `769cf77b…`.
  - Linux Node 26 creation and absence share `012979f2…`.
  - macOS Node 24 has `58e77774…`.

  That is three distinct hosts, matching "five registrations on three actual worker hosts". Pairing creation and absence on one Linux worker host follows the accepted wave-1 precedent (wave 1: "Each Linux worker's absence and creation registrations share that worker's host hash"). A search of `evidence/` finds none of the three host IDs in any other record or receipt, so they are fresh hosts and no earlier host binding is reused.
- **Key distinctness and freshness.** The five keyIds (`ab7c837a…`, `0299d4dd…`, `6534c810…`, `a413a2c0…`, `6cba20d9…`) and the five public keys are pairwise distinct. A search of `evidence/` finds each keyId only in its own new record. No old key is reused, which supports the artifact's "No old keys … reused" claim.
- **Probes.** The Linux records use `/proc`, `full-pid-namespace`, `exact-pid-directory-v1`, `procfs-v1`. The macOS record uses `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1`, version `sha256:62c342e1…940f`. Both are byte-identical to the probe tuples in the earlier accepted Linux record and the macOS records at 9fe6817, so the probe scope is not widened.
- **Capability bounds.** Only the two Linux creation records carry the clock/zone/DST transitions. All three absence records, including macOS, have empty transitions. The clock procedure paragraph is verbatim the procedure accepted in wave 1, with the same preflight, restore-on-failure and no-ordinary-host-change limits. Nothing widens creation to macOS or Windows, or adds reboot, descendant, provider or activation authority.
- **Exclusions and non-claims.** Windows Node 24 is excluded and pointed to its separate accepted review `review-1d46e84069a533817a7d5123ff1e38a7`, finalization `e4c5e16` and index revision `6f736f9`. The finalization and index revision match the git log and the wave-3 artifact's index revision. Windows Node 26 and macOS Node 26 are excluded and need separate approval. The unreviewed wave-2 records `source-184fd40e…`/`source-c9b4d0b5…` are preserved with no approval. Failed or canceled runs 38211666754, 38205882840 and 38211337118 are not relabeled. The artifact also states that no class acceptance, ledger adoption, installed-journey proof, CI-receipt completion or native lifecycle delivery follows from this wave. The C1 feasibility, budget, native-build, cache/waiver and Linux-manual-review statements match the accepted wave-1 and wave-3 artifacts word for word.

Verification limits:

1. I did not independently recompute the Git blob SHA-1, raw-file SHA-256 or canonical-record digests in the JSON reference block and index. Hashing commands were not permitted in this session, and the review rules forbid using Git. My verification of those values is limited to the content agreement above. The broker/tooling must verify byte identity against revision `6cf84a6`.
2. I could not confirm that commit `faa376d` left the five records and the index unchanged since `6cf84a6`. I read working-tree content only.
3. I cannot independently verify facts external to the repository:
   - hosted run 38224061596's identity, event, attempt and worker publication state;
   - that the host IDs are the actual host hashes;
   - that the private keys are protected and unique to their workers;
   - the 899-input producer-freeze count;
   - the #202/#207 trunk delivery and original startup reproduction.

   I accept these as author attestations that the later class-approval step must mechanically verify against the signed captures, as the artifact itself requires.
4. No archived-member byte comparison of the tarball was performed. The artifact states this openly and does not rely on it.

Within these limits, I found nothing synthetic, widened, inconsistent or self-approved in the proposed registrations.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. In the clock-procedure paragraph, "Windows/macOS permit absence only and empty transitions" is carried over word for word from wave 1, where a Windows record was in scope. This wave has no Windows record, and the sentence leaves out the two Linux absence records. A future wave could say "The Linux absence and macOS absence registrations permit absence only and empty transitions" so the authorization sentence lists exactly the in-scope records. The scope paragraph's sentence "Only Linux creation permits its literal bounded clock transitions; both Linux absence records and macOS absence permit empty transitions" already states this correctly, so this is clarity only.
2. "Only Linux creation permits its literal bounded clock transitions" uses a singular "its" but covers two Linux creation records (Node 24 `source-16bc77b6…` and Node 26 `source-3b3170e1…`). "Only the two Linux creation registrations permit…" would be clearer.
3. Two creation/absence pairs share a Linux host. A future wave could state outright that the clock procedure's restore-on-failure (UTC, configured zone, NTP) must finish and be observed before the same-host absence capture runs. That way an absence capture with empty transitions can never run against a stepped clock or changed zone. This is implied by "Restore … even on failure" and by the wave-1 precedent, but it is not stated as an ordering control.

## Decision

accepted
