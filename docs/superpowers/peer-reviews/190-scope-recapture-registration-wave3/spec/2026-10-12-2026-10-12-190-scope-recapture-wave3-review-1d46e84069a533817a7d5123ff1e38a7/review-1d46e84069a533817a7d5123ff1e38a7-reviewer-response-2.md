<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1d46e84069a533817a7d5123ff1e38a7"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave3.md"
artifact_commit: "373a98460992c28e61d0368237af2533f0180876"
artifact_blob: "d1520c697a503dcea66474e1c9c1af2fa2439554"
artifact_digest: "sha256:e4547a3c83d20e235ca99fcad001d01416b56c46481c4cdf6ad26dc33430386f"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:8123ddb4d4b670c5795c6518c0a61763ff50e9e23ec70ceb5c3263f990a2559f"
  identity_source: "runtime"
started_at: "2026-10-12T08:41:32.049Z"
submitted_at: "2026-10-12T08:51:49.208Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The revision at `373a984` resolves both required changes (R1-F001 and R1-F002) and both optional suggestions (R1-F003 and R1-F004). Nothing in the registration, index, scope or authorization was widened. I accept.

What I re-checked against the working tree at the revised artifact commit (read-only file inspection):

- **Nothing was widened.**
  - The artifact's JSON block is byte-for-byte the same as in turn 1: the same index revision, blob and sha256, and the same single capture reference.
  - `registration-index.json` still lists only `source-69a9352ab6feaa4429330696565157e0`.
  - The registration record is unchanged: `win32` / `10.0.26100` / `x64` / Node 24, `kinds: ["absence"]`, `transitions: []`, and the same host, key and probe.
  - The paragraphs covering authorization, budgets, C1 feasibility and remaining work are unchanged in substance.
- **R1-F001 (package identity) is resolved.**
  - The new paragraph 6 states both complete tarball and inventory digest pairs. Each matches the actual values in `source-69a9352a…` and `source-498739cb…` exactly.
  - It says the contract digest is unchanged. Both records carry `sha256:340ece55…dedb25`.
  - It names `src/broker/registry.mjs` as the only changed packaging input. I confirmed that this path is **absent** from `src/protocol/process-source-contract-files.json`, which lists exactly 29 files. That is consistent with an unchanged contract digest alongside a changed tarball and inventory.
  - The author states the evidence limit honestly: this is a source-input comparison, not an archived-member byte comparison.
  - The paragraph says the 9fe6817 controls are a different package and are never combined with this capture or substituted for it. That is the separation I asked for.
- **R1-F002 (fused tokens) is resolved.**
  - "source 2a6adf5", "capture 38211666754", "Capture 38205882840" and "and 38211337118" are all corrected.
  - "running/reviews0" now reads "authenticated `running` status with zero active reviews", which is unambiguous.
  - "1 actual published worker" is corrected.
- **R1-F003 (unreviewed wave-2 records) is resolved.** The new paragraph 7 names `source-184fd40e…` (Windows Node 26) and `source-c9b4d0b5…` (macOS Node 26). It states that they hold no approval and grant no current coverage. Both files are still present in the tree.
- **R1-F004 (producer-freeze delta) is resolved.**
  - The paragraph now states 898 → 899 and names `docs/superpowers/plans/2026-10-12-207-registration-provenance.md` as the added input, with no removals. That file exists.
  - Its location (`docs/superpowers/plans/`) falls outside the two excluded authority directories. Under the stated partition rule it is therefore correctly a frozen producer input.

Verification limits:

- Bash was denied in this session beyond the prescribed peer-review commands, and Git use was prohibited. I could not reproduce the author's Git comparison between 9fe6817 and 2a6adf5. I therefore did not independently confirm two things:
  - that `src/broker/registry.mjs` is the only changed packaging input;
  - the 898/899 producer-set derivation.
- I could not compute SHA-256 or Git blob hashes. The artifact's `blob` and `sha256` references, and the index canonical digest, remain unverified by me. They are still enforced mechanically at capture time by `test/live/process-source/authority.mjs:63-66,132-147`.
- I did not access GitHub run 38224061596 or earlier runs. I did not verify the broker startup reproduction, signatures, host-hash derivations or private evidence.
- These claims are accepted as stated by the author. The later ordinary finite class review must verify them mechanically, as the artifact requires.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Paragraphs 4, 8 and 10 still use fused forms "Node26", "Node24" and "Node24/26", and paragraph 1 says "the exact 1 public registrations". These are unambiguous, so they are cosmetic only. Consider normalizing them to "Node 26" and so on, and to "registration", in a later wave for consistency with the rest of the artifact.

## Decision

accepted
