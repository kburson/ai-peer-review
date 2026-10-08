<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-fa52e197da5d0c7c9e2d9f047e7232f4"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/170-local-absence.md"
artifact_commit: "1f8b1b50900ca9d04d0ca31cea690406fddb7761"
artifact_blob: "059a6ca159aaa039e9453f92f4ae8f86184a18ee"
artifact_digest: "sha256:c98e266e0cbd77489b7f969cd93af3283f355e7853f529d655e4b0b612606717"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:87e42d5fe013dbc6536fe4e2f306921d6f040334a156941f7e322f4d8c2d79c6"
  identity_source: "runtime"
started_at: "2026-10-08T05:16:52.769Z"
submitted_at: "2026-10-08T05:19:12.131Z"
finding_ids: ["R1-F001","R1-F002","R1-F003"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the registration-review subject `evidence/portable-runtime/process-source/registration-reviews/170-local-absence.md` (artifact commit `1f8b1b5`). I also reviewed the committed index `evidence/portable-runtime/process-source/registration-index.json` and the registration `evidence/portable-runtime/process-source/registrations/source-f7b53374f29bb03521914c74a2afdfe4.json`. For the driver and gates, I read `test/live/process-source/{records,authority,package,capture,absence}.mjs`, `schemas/process-source-registration-v1.json`, `observeProcessSourceContext` and `observeExecutionHostIdentity` in `src/protocol/process-identity.mjs`, and Task 18 of the #107 plan. I also read the local, Git-ignored binder outputs under `.scratch/peer-review/source-registration-170/`: `process-source-binding.json` and `process-source-binding.json.registration.json`.

The coverage this registration declares is safe and is not wider than the subject claims:

- The registration declares `kinds: ["absence"]` and `transitions: []`. Both `validateProcessSourceRegistration` and the JSON Schema `else` branch accept this.
- `captureRegistered` refuses any kind the committed registration does not list (`capture.mjs:77`). A creation capture against this registration is therefore refused.
- `hostId`, `package` and `scope` are checked again against the binding and the live observations at capture time (`capture.mjs:78-79,121-122`).
- The key must re-derive from the protected private key, with an unchanged key generation (`capture.mjs:104-112,125`).
- The absence driver keeps its fixed 120 s deadline. It also requires a nonce-owned child, a clean `exitCode 0` / `signal null` exit, a live → absent transition, and a darwin `identity-unavailable` error probe.
- Results stay `verified: false` / `classAdmitted: false`. Approving this registration therefore adopts no class and no runtime authority. This matches the plan's split: absence coverage needs no clock change, while creation coverage needs separately authorized clock, timezone and DST controls.

Every field except `kinds` and `transitions` matches the local binding's candidate registration exactly: `captureId`, `hostId`, `publicKey`, `keyId`, the five `package` fields, and every `scope`/`probe` field. The public key is a well-formed 44-byte Ed25519 SPKI (prefix `302a300506032b6570032100`). The capture ID follows the `source-<32 hex>` form the binder produces. The index entry path and capture ID match, and the subject's capture reference uses the same revision (`6eaa572`) as its index reference, as `authority.mjs:131` requires.

Verification limit: this session's tool permissions did not allow running commands other than the prescribed `join` and `submit`. So I could not independently recompute these values:

- the Git blob IDs `5e538399…` and `2afc4e23…`;
- the raw-byte SHA-256 values `a0b2d497…` and `2d770519…`;
- the canonical index-entry digest `sha256:b42fa694…`;
- the `/bin/ps` + `/usr/sbin/ioreg` probe digest and the host digest.

I also did not rerun the 33 tests the subject says passed. These are mechanically re-verified before any capture: `authority.mjs` `reference()` checks blob ID and SHA-256, `verifyProcessSourceIndexCore` checks the canonical digest, and `capture.mjs` re-observes scope and host. A mismatch therefore fails closed, but the claims are not independently confirmed in this review. The raw-byte and canonical digests are expected to differ, because the stored file uses unsorted keys and pretty-printing while the index digest uses `canonicalProcessSourceBytes`.

Two statements in the subject do not accurately describe what is committed. Both need correcting so the durable review record states the exact provenance and scope this approval binds.

## Findings

### R1-F001 — The subject does not say the committed registration was narrowed by hand from the binder's absence + creation candidate (Medium)

Location: the subject's title and paragraph 1 ("Review the exact immutable registration…", "the exact local absence capture candidate" in the commit subject); the `captures[0]` reference.

At `test/live/process-source/package.mjs:420-421`, `bindProcessSourceCandidate` always writes `kinds: ["absence", "creation"]` and all four transitions, and has no absence-only mode. The local binder output `.scratch/peer-review/source-registration-170/process-source-binding.json.registration.json` contains exactly that. The committed registration declares `kinds: ["absence"]` and `transitions: []`. So the committed record is not the binder's output. It is a manual derivative, which the committed driver cannot reproduce. The subject says nothing about this edit.

The narrowing itself is correct and only reduces authority. Every other field is equal in value, and capture-time gates enforce the narrower kinds. However, this subject is the review authority that `readApprovedProcessSourceIndex` binds into every future receipt, through `registrationRevision` and `registrationIndexDigest`. A later reviewer or auditor who compares the binding's `registrationPath` candidate with the committed record will find an unexplained difference. That reviewer cannot tell from the record whether the change was intended, or whether any other field was edited.

### R1-F002 — The subject calls the probe version a "stock ps hash", but it pins `/bin/ps` and `/usr/sbin/ioreg` together (Low)

Location: paragraph 2, "the exact Darwin 25.6.0/arm64/Node 26/stock ps hash and source contract".

On darwin, `observeProcessSourceContext` computes `scope.probe.version` as `sha256(readFileSync('/bin/ps') ‖ readFileSync('/usr/sbin/ioreg'))` (`src/protocol/process-identity.mjs:165-171`). The registered value `sha256:3489ed38…` therefore pins the bytes of both executables. An OS update that changes only `ioreg` invalidates this registration. The subject asks the reviewer to check the "exact source/package/host scope", but its own description of that scope is wrong. This is not a widening, since the real binding is narrower than described. It still misstates the scope being approved.

## Required changes

1. **R1-F001:** In the subject, say that the committed registration is the binder's candidate for capture `source-f7b53374f29bb03521914c74a2afdfe4`, narrowed by hand from `kinds: ["absence","creation"]` with four transitions to `kinds: ["absence"]` / `transitions: []`. Say that every other field (`captureId`, `hostId`, `publicKey`, `keyId`, `package`, `scope`) is unchanged in value. Also give the reason: absence-only coverage needs no clock change, and creation stays unauthorized. Alternatively, add an explicit absence-only mode to the binder and regenerate. That would change the key and capture ID, though, so the disclosure route is simpler.
2. **R1-F002:** Replace "stock ps hash" with a correct description, for example "the darwin probe digest over stock `/bin/ps` and `/usr/sbin/ioreg` bytes (`sha256:3489ed38…`)".

## Optional suggestions

### R1-F003 — State the two digest conventions in the subject

The subject's `sha256` fields are raw-byte file hashes. The index's `digest` field is the canonical-record digest from `processSourceRecordDigest`. Receipts then carry `registrationIndexDigest = 'sha256:' + <raw index file hash>`. A single sentence saying which convention each field uses would stop future reviewers from reading the different values for the same registration file (`2d770519…` and `b42fa694…`) as a mismatch.

## Decision

revisions-requested
