<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-fa52e197da5d0c7c9e2d9f047e7232f4"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/170-local-absence.md"
artifact_commit: "bdfba992550e3b49895c5faac64ab81522bb2b4a"
artifact_blob: "b15da5905a801d1c7f8748c5b7ed1a4bb30eaab6"
artifact_digest: "sha256:3ef0af7588296cacd3a6c704603fc36efddd8901d6be810a90cef91e192bca99"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:87e42d5fe013dbc6536fe4e2f306921d6f040334a156941f7e322f4d8c2d79c6"
  identity_source: "runtime"
started_at: "2026-10-08T05:16:52.769Z"
submitted_at: "2026-10-08T05:22:17.344Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised subject `evidence/portable-runtime/process-source/registration-reviews/170-local-absence.md` (artifact commit `bdfba99`) against `review-fa52e197da5d0c7c9e2d9f047e7232f4-author-response-1.md`. All three round-1 items are resolved. The revision touches only the subject's prose. The pinned JSON reference block is byte-identical to round 1 (index and capture at revision `6eaa572`, with the same blob IDs and raw SHA-256 values). The committed registration in the working tree still declares `kinds: ["absence"]` and `transitions: []`. The index entry digest is still `sha256:b42fa694…`.

- **R1-F001 (resolved).** New paragraph 2 says the committed registration is a deliberate manual narrowing of the binder candidate for `source-f7b53374f29bb03521914c74a2afdfe4`. It names the exact change: from absence + creation with four transitions to absence only with no transitions. It lists every unchanged field (`captureId`, `hostId`, `publicKey`, `keyId`, `package`, `scope`) and gives the reason: absence needs no clock change, and creation stays unauthorized. This matches my round-1 field-by-field comparison with the local binder output. Declining a separate absence-only binder mode is reasonable. A new mode would mint a new capture ID and key, and `capture.mjs:77` already enforces the narrower kinds.
- **R1-F002 (resolved).** Paragraph 3 now describes the probe as the "darwin probe digest over the combined stock /bin/ps and /usr/sbin/ioreg bytes". This matches `observeProcessSourceContext` (`src/protocol/process-identity.mjs:165-171`). The `cspell:words ioreg` annotation is harmless.
- **R1-F003 (resolved).** Paragraph 4 now separates three digests:
  - raw committed-file hashes, which the subject's `sha256` fields use;
  - the canonical-record digest, which the index entry uses;
  - the raw committed index hash with a `sha256:` prefix, which receipts carry as `registrationIndexDigest`.

  This matches `authority.mjs:121,143` and `records.mjs:400`.

The subject claims no coverage wider than the committed registration and capture gates permit. My round-1 conclusions on driver authority, protection and signature gates still hold.

Verification limit, unchanged from round 1: this session could run only the prescribed `submit` command. I did not independently recompute blob IDs, raw or canonical digests, the probe or host digests, or the reported test results. The subject itself now says these are recomputed before capture, and `authority.mjs` `reference()` and `verifyProcessSourceIndexCore` fail closed on any mismatch.

## Findings

None.

## Required changes

None.

## Optional suggestions

None.

## Decision

accepted
