<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-f495299d7a66807eb6b294ae9cfe78fd"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-post209-wave9.md"
artifact_commit: "af4bb1cba12fd68dbf0c79ded09e9f053695fbe1"
artifact_blob: "e2814930a0b563a84a2655421587a42b165b93ed"
artifact_digest: "sha256:a71fd3fccc7cd19f91d9adf4c952a86a07cdf4757ca6b4d29c89958be55afdf7"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:fe687f8621421682eb85c1aeca8b2d189d7e09e3a2c992ec890121dfe5a72859"
  identity_source: "runtime"
started_at: "2026-10-15T23:05:50.867Z"
submitted_at: "2026-10-15T23:08:49.121Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-9 class-approval subject (`evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-post209-wave9.md`). I checked it against every file its JSON block references: the proposals bundle, both receipts, both host controls, and the CI provenance projection. I also checked the registration approval it pins: the registration-review subject, the manifest, the final reviewer response, the registration index and both registration records. For comparison I read the wave-8 class subject. I read the consumer code: `readReviewedProcessSourceClasses` and `readApprovedIndex` in `test/live/process-source/authority.mjs`, `verifyCiCaptureControlsCore` in `records.mjs`, and `proposeProcessSourceClassCore` in `classes.mjs`. Finally, I queried GitHub's authenticated API (read-only `gh api`) for run 38816754588.

### What I verified

- **Raw-byte SHA-256 of every referenced file matches (recomputed with `shasum -a 256` on working-tree bytes).** These are the proposals (`3862748a…2235`), receipt 3c46 (`eebe0cbe…2a25`), receipt b61f (`336a95c7…15be`), host control 3c46 (`d6a07624…916a`), host control b61f (`8c75806d…c3c3`), CI provenance (`f64e6f19…187f`), registration subject (`67ce2197…4b86`), manifest (`06db589e…8c09`) and final response (`4a95fbcf…87e9c`). The registration index (`18d88dec…7f6f`) also matches, which equals `registrationApproval.indexDigest`. So do both registration records (`3dae99a2…4bca`, `c56e0dd8…096c`), which match the pinned registration-review subject.
- **The CI provenance projection matches authenticated GitHub data.** `gh api …/runs/38816754588/attempts/1` reports: repository `kburson/ai-peer-review`, event `workflow_dispatch`, path `.github/workflows/process-source-capture.yml`, `head_sha` d754d02bbc30c6c92113e87be08c105fda08e12c, branch `codex/190-installed-journeys`, status `completed`, conclusion `success`. The top-level `run_attempt` is 1, so there is no later attempt. The jobs endpoint returns exactly six jobs. Their IDs (`116703258155`, `…384`, `…429`, `…461`, `…476`, `…546`), runner OS, Node major (from job names such as "Source capture / Node 26 / windows-latest") and completed/success outcomes all match the projection's `jobs` array entry for entry. Each wave-9 receipt therefore has exactly one matching worker (Windows/26 → `116703258155`, macOS/26 → `116703258461`), as `verifyCiCaptureControlsCore` requires. The run also has unexpired `source-registrations-{macOS,Windows}-26-1` and `source-controls-{macOS,Windows}-26-1` artifacts.
- **Capture timing is consistent with "registration approval before signed capture."** In both Node-26 jobs, "Publish public pre-capture registrations" finished at 22:40:51Z (macOS) and 22:41:24Z (Windows). After that, the step "Await immutable ordinary approval, capture real controls, verify restoration" ran until 22:51:31Z and 22:51:40Z. The receipts' `live.creation` lower bounds decode to 2026-10-15T22:51:30Z (darwin, one-second bracket) and 22:51:33.43Z (win32). Both fall inside that await step and after the registration review was submitted (22:49:35Z) and its author claim (22:50:20Z). So each child was created after registration approval, not before.
- **Receipts bind the approved registrations.** Each receipt's `registrationDigest` equals its index entry (`c408aece…2dba` for 3c46, `69cd8094…e4cf` for b61f). Each receipt's `hostId`, `keyId`, package tuple (source, per-platform tarball, inventory `93da7ecb…d9de`, contract `55825683…a468`) and full probe scope equal the registration record exactly. `registrationRevision` and `registrationIndexDigest` equal the pinned `2e9555e…`/`18d88dec…`. `kind` is `absence`, `transitions` is `[]` and both boot fields are null. The controls show live → exit 0 → absent for the same PID, a negative error control (`unknown`/`probe-query-error`), and `childExited: true` with `restoration: not-required`.
- **Host controls match the reader's absence contract.** Both have the schema `ai-peer-review.process-source-ci-control/v1` and `verified: false`. Both carry run 38816754588, attempt 1, and `codeCommit` = provenance `sourceCommit` = d754d02. `captureId` and `kind` match their receipt. The control is exactly `{verified:false, clockChanges:"none", restoration:"not-required"}`. Both share `captureProducerCommit` 155cf31, which per the subject is after the registration finalization at 79f1206.
- **The proposals have the shape `proposeProcessSourceClassCore` produces for one receipt each.** Each proposal's `builds`, `architectures` and `nodeMajors` are singleton arrays equal to its receipt's scope, and its probe equals the receipt's. Semantics and precision match the code tables: `darwin-ps-selection-v1` and `windows-cim-completed-v1`, both `not-applicable`. `contractDigest`, `registrationRevision`, `registrationIndexDigest` and the single `packageProvenance` entry equal the receipt package. There are 2 proposals for 2 receipts, which satisfies the reader's `used.size === captures.size === index.captures.length` coverage check against the two-entry wave-9 index. The table in the prose matches the JSON (class IDs, capability, platform, build, architecture, Node).
- **The scope is not widened.** These are absence-only classes for darwin 25.6.0 arm64 Node 26 and win32 10.0.26100 x64 Node 26. Wave 8 already admits darwin and win32 absence for Node 24 only, so `nodeMajors` do not intersect. Combining the two waves in a class-review index therefore does not trip `class-review-set-overlap`, and neither wave claims the other's Node major. No creation, clock, timezone or DST coverage is claimed, and the wave-8 Linux creation class is explicitly kept to its own receipts.
- **The prior optional suggestion is addressed.** The registration review (`review-317003…`) suggested stating which approved ref authorizes each post-209 capture. This subject now does: wave 8 uses `e8adc71…` for six captures, wave 9 uses `2e9555e…` for two, and the latest working-tree index is explicitly not the full eight-capture set.
- **The non-claims are explicit and consistent with wave 8.** The subject keeps the original budgets (30/15/5/800 s), the four-job portable cap, the #210 exclusion and the exclusion for Linux manual review alone. It lists the installed-journey/CI/delivery work that is still required. It grants no operational, provider, reboot or descendant capability. Private material is absent: receipts carry only hashed host IDs, key IDs and signatures.

### Verification limits

- The Bash permission policy denied running Node, so I did **not** execute the reader or the pure verifiers. In particular I did not recompute canonical `processSourceRecordDigest` values (receipt `evidenceDigests`, `classId`, registration digests), check that `keyId == sha256(SPKI)`, or check the Ed25519 signatures. My proposal-shape check is a field-by-field comparison by reading, not a digest recomputation.
- I was told not to use Git, so I did not verify the Git blob OIDs, that the pinned revisions (`7eb4a00`, `2e9555e`, `b0d89be`, `79f1206`, `155cf31`) contain these exact bytes, any ancestry relationship, or the producer-input freeze from d754d02 to 155cf31. The reader enforces all of these mechanically at adoption time (`reference`, `ancestor`, `inspectProcessSourceProducerFreeze` → `class-review-transitive-producer-changed`).
- I did not download the raw run artifacts (the permission policy denied it). So I did not compare the published receipts and controls byte-for-byte with the uploaded `source-controls-*-26-1` artifacts. GitHub-side checks are limited to run, attempt, job and artifact metadata and step timings.
- Mitigation: at ledger adoption, `readReviewedProcessSourceClasses` refuses any blob, digest, signature, ancestry, freeze, CI-worker, proposal-recompute or finite-scope mismatch. My acceptance rests on the hash, structure, authenticated-CI and timing checks above. It does not rest on an executed replay of the reader.

## Findings

None.

## Required changes

None.

## Optional suggestions

None.

## Decision

accepted
