<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-d64d3708398469b949ad130ef8d9fdb5"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave6.md"
artifact_commit: "5444fd01db7722936c468ed66eb8507d06654a16"
artifact_blob: "e003d6066f99c46ea64f7a825f0e78a9a9568202"
artifact_digest: "sha256:8abd6294a9bf1ffd8c83bf4db0c96accac5edb2908ce97335695e59f4f1b5b77"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:1c665df6f34ae10b6ddad0bb12ebc73f09190c69c39b3a04643cf96055aa6894"
  identity_source: "runtime"
started_at: "2026-10-12T16:41:37.402Z"
submitted_at: "2026-10-12T16:49:45.426Z"
finding_ids: ["R2-F001"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised wave-6 artifact at commit `5444fd0` against author response 1. All four round-1 findings are resolved. The revision changes prose only. The six registration records, the index, the capabilities, the transitions and the immutable JSON references are byte-for-byte the same as in round 1. All six references still point to revision `ff45983` with the same blob and SHA-256 values. I found no new synthetic, widened, inconsistent or self-approved material.

Disposition checks:

1. **R1-F001 (host hashes): resolved.**
   - Line 18 now says six registrations bind four actual host hashes. It says the Linux Node24 and Node26 absence/creation pairs each share one host, and that Windows Node24 and macOS Node24 each have their own.
   - It also says all six signing keys are distinct.
   - This matches the records: `68517fe6…` is shared by `576323d2…`/`bcdbc785…`, and `fbe76106…` is shared by `0f9002ed…`/`c39a8d6d…`. Windows has `9b7fe321…` and macOS has `27ba16c8…`. The six key IDs are pairwise distinct.
2. **R1-F003 (package tuples): resolved.**
   - Line 20 discloses the Linux/macOS tarball `06f2a3d8…6b35`, the Windows tarball `a06c5e57…332f` and the shared inventory `05994552…3aa3`. Each value is identical to the corresponding registration record.
   - The prior `2a6adf5` tuples it cites (`5fed440b…7da`, `5d96830e…c9a9`, inventory `4cf3ce90…f2`) match accepted waves 3–5.
   - All five changed packaged files it names exist in the working tree. One of them is `src/protocol/process-source-contracts.json`, which is consistent with a changed contract digest.
   - It correctly disclaims archived-member byte identity, and it does not claim an exact archive-byte cause.
3. **R1-F002 (Windows statement): resolved.**
   - The ambiguous sentence "Windows worker is not approved" is gone.
   - The artifact now states three things explicitly:
     - registration acceptance permits this exact Windows Node24 absence capture;
     - it grants no class/source admission or installed readiness;
     - the Node24 C1 pass changes none of those later gates.
   - The forecast requirement now attaches to the prospective guard-owned persistent PowerShell ACL query process.
   - This reattachment has a basis in the record. `2026-10-12-190-selection-scope-wave1.md` introduced the forecast gate for "the proposed guard-owned resident Windows observation worker … (distinct from these one-shot process-source capture registrations)". Selection-scope waves 2 and 3 repeat that. So the revised wording returns to the gate's original subject rather than inventing a new exemption.
   - Line 28 also keeps finite source admission for every profile behind the separate signed-control/class review.
4. **R1-F004 (absent workers): resolved.** Line 22 says Windows Node26 and macOS Node26 are queued and contribute no registration, receipt or coverage. It also says each needs its own follow-up wave.

Everything else is unchanged from round 1 and remains consistent:

- the Linux-only clock procedure;
- empty transitions for Windows and macOS;
- deferral of signature, CI-scope, host-control and producer-tree verification to class approval;
- the 30/15/5/800-second budgets;
- disabled native builds;
- the Linux manual-review exclusion;
- the list of incomplete #190/#107 journeys.

Verification limits (stated as required):

- As in round 1, Bash was unavailable except for the prescribed CLI commands, and I did not use Git. As a result:
  - I did not recompute any raw SHA-256, Git blob or canonical index digest.
  - I did not recompute contract digest `a3c54de6…`.
  - I did not confirm that the working-tree record bytes equal revision `ff45983`.
- I did not verify the author's Git comparison that exactly five packaged inputs changed between `2a6adf5` and `89a2d7d`, or that package metadata, the lockfile and the pack scripts are unchanged. I only confirmed that the five named files exist.
- I did not independently verify any of the following:
  - run 38278337597 or its job and queue state;
  - the C1 results at `2b2970a`;
  - the producer-freeze partition;
  - any Ed25519 signature;
  - the privacy of the hashed host identifiers.

All of these belong to the later class-approval stage, which the artifact correctly defers.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R2-F001 — Note the wording change from earlier recapture waves' Windows source-admission gate

Recapture waves 1–5 said "The Windows worker remains excluded from source admission (or unadmitted) without a complete ordinary/limited forecast". Wave 6 instead ties the forecast only to the "prospective persistent PowerShell ACL optimization". It names the selection-scope waves' "guard-owned resident Windows observation worker" differently, and does not cross-reference that term. The revised meaning is supported by selection-scope wave 1. Even so, a later class reviewer comparing waves could read this as a silent narrowing of a previously accepted Windows source-admission gate.

A short sentence would remove the ambiguity. It should say that the earlier recapture-wave wording referred to the same resident or persistent Windows query process, and that this is the selection-scope waves' "guard-owned resident Windows observation worker". It should also say that Windows source admission still needs whatever the class review requires. This is wording only and is not required for acceptance.

## Decision

accepted
