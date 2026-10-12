<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-0bc28f44b37335380c9209d34cdd9069"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave1.md"
artifact_commit: "e0d6f5509189fa57fcfba9c354c31daac7863693"
artifact_blob: "321204fbeef956bc544f07486800f16fcc085623"
artifact_digest: "sha256:aa6d695278605fabe23df67d193916c5fa7045320f8d0a0f031a0b49a5bbcbf3"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:d8b9dc46f94be5bb1f510b528292153cce045bcf34be0c3d3499d43f59a89600"
  identity_source: "runtime"
started_at: "2026-10-12T06:24:13.446Z"
submitted_at: "2026-10-12T06:32:25.399Z"
finding_ids: ["R2-F001"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised artifact at `e0d6f55` against author response 1 and the unchanged public records. Both required changes from turn 1 are correctly made, and both optional suggestions are addressed accurately. The revision does not widen scope, change any capability, or alter the table or JSON reference block. I accept the wave.

Disposition check:

- **R1-F001 (resolved).** Prose paragraph 4 now says each registration binds its publishing worker's actual host hash and its own distinct signing key, that each Linux worker's absence/creation pair shares the worker host hash, and that no host hash is shared across the four workers. I re-read all six records and confirmed this:
  - Linux Node 24 pair `source-73fd05…` / `source-c24791…`: both `sha256:33d6db92…`.
  - Linux Node 26 pair `source-2311c9…` / `source-f102f7…`: both `sha256:3dee427a…`.
  - Windows `sha256:d1c0d600…` and macOS `sha256:032d6e1b…` are unique.
  - All six `keyId`s are distinct.
- **R1-F002 (resolved).** Paragraph 1 now names the four included workers (Linux Node 24/26, macOS Node 24, Windows Node 24) and the two excluded ones (Windows Node 26, macOS Node 26). It says the excluded workers are queued behind `max-parallel: 4` and need a separately reviewed wave. It also says the run is not complete or green, and that corrected Windows Node 26 preparation is unexercised and unproved by this wave. That matches the workflow's `max-parallel: 4` over a six-entry matrix.
- **R1-F003 (addressed).** Paragraph 3 now says the tap runs during preparation on every OS and never during capture. It says the tap wraps only callback and promisified array-argument `execFile` calls, that other overloads fail closed, and that empty Buffer stderr is conservatively misreported. It also says the source-controls artifact retains the diagnostic log and that the log excludes command text and output bytes. This matches `.github/workflows/process-source-capture.yml` (`--import` on the prepare step only) and `test/helpers/windows-stock-timing.mjs` / `windows-stock-diagnostic-core.mjs`:
  - A non-array object or function as the second argument throws `TypeError` inside the tap before the original `execFile` is called, in both the callback and the promisified paths.
  - Calls whose argument list is undefined or null still delegate unchanged, so "fail closed" accurately describes the unsupported shapes.
- **R1-F004 (addressed).** New prose paragraph 5 says the tarball, inventory and contract digest fields are byte-identical to the accepted 0783554 registrations for the same platforms. I confirmed this on all three platforms:
  - Linux: `source-32a383…` / `source-75eb2d…` use `sha256:21331c1d…`.
  - macOS Node 24: `source-2ee00e…` uses `sha256:21331c1d…`.
  - Windows Node 24: `source-8069f6…` uses `sha256:785b254e…`.
  - All of them, and all six new records, use inventory `sha256:dae2c976…` and contract `sha256:340ece55…`.
  - The new paragraph also states the producer-freeze count (898 at 9fe6817 versus 894 at 0783554).

Unchanged facts re-confirmed:

- `registration-index.json` still lists exactly the six capture IDs, paths and canonical digests.
- All six records still bind `sourceCommit` `9fe68172…` with the same kinds, transitions and probes as in turn 1.
- The artifact's JSON reference block is textually identical to turn 1: same index and capture revisions, blobs and sha256 values.
- The clock-procedure, absence-only, non-adoption, budget and incomplete-delivery paragraphs are unchanged in substance.

Verification limits, unchanged from turn 1:

- This session's shell was restricted to the prescribed `submit` command, and Git use was prohibited. I did not compute or verify any raw-blob sha256 or Git blob ID, the index's canonical-record digests, or that revision `91432dd` holds these exact bytes.
- I could not access GitHub run 38211666754. The author's statements are therefore accepted as stated, not independently verified:
  - the current queued status of Windows Node 26 and macOS Node 26;
  - the 898-input producer-freeze count and its partition check;
  - preflight reports, signatures and private evidence.
- As the artifact itself requires, the later ordinary finite class review must verify these mechanically before ledger adoption. This acceptance authorizes only the six exact signed captures described. It grants no class acceptance, scope adoption, Windows admission or #190/#107 completion.

## Findings

None.

## Required changes

None.

## Optional suggestions

### R2-F001 — Stray "its," in prose paragraph 4

Location: prose paragraph 4, third sentence: "Each record binds its, exact package tarball/inventory/contract, finite OS/build/architecture/Node/probe and expressly bounded capability."

The words "its," look like a leftover from the R1-F001 edit. They don't change the meaning and don't block acceptance. If the artifact is revised again for another reason, consider changing the sentence to "Each record binds its exact package tarball/inventory/contract, …".

## Decision

accepted
