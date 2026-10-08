<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-fa52e197da5d0c7c9e2d9f047e7232f4"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/170-local-absence.md"
artifact_commit: "1f8b1b50900ca9d04d0ca31cea690406fddb7761"
artifact_blob: "059a6ca159aaa039e9453f92f4ae8f86184a18ee"
artifact_digest: "sha256:c98e266e0cbd77489b7f969cd93af3283f355e7853f529d655e4b0b612606717"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "gpt-6-astra"
  session_fingerprint: "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
  identity_source: "runtime"
started_at: "2026-10-08T05:16:06.113Z"
submitted_at: "2026-10-08T05:21:12.685Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Corrected the durable provenance and probe-scope descriptions without modifying the committed registration, index, signing key, candidate bytes or permitted controls.

## Finding dispositions

- R1-F001: Accepted and resolved. The subject now explicitly records the manual absence-only narrowing of the binder candidate and lists every unchanged field. Actual JSON deep comparisons confirmed captureId, hostId, publicKey, keyId, package and scope are unchanged in value. Creation remains unauthorized on this host.
- R1-F002: Accepted and resolved. The subject now names the darwin probe digest over combined stock /bin/ps and /usr/sbin/ioreg bytes. The production observer confirms both bytes enter the version digest.
- R1-F003: Accepted and resolved. A sentence distinguishes raw committed file hashes, canonical registration entry digests and the raw committed index digest carried in capture receipts.

## Changes made

Only the tracked review subject prose was clarified. Its pinned JSON references still point to the same immutable registration/index revision and blobs. No capture has run and no class is accepted.

## Declined changes and rationale

None. An additional binder mode is unnecessary for this deliberate reviewable narrowing; it would replace the current capture identity/key while the existing closed registration gate already enforces absence-only scope.

## Verification

Actual binder and committed registration JSON records were compared field by field with deep strict equality for all unchanged fields. Production process-source context hashes /bin/ps and /usr/sbin/ioreg together. The revision changes documentation only; formatting, Markdown lint and spelling checks are recorded before submit. The authority reader will independently recompute every immutable blob/raw hash/canonical index digest before capture.
