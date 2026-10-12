<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-0bc28f44b37335380c9209d34cdd9069"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave1.md"
artifact_commit: "15907de4a303353ade044da9da8e4f6bf8f26f14"
artifact_blob: "4b8bc9d8f2d66211a26977b45571451cdc76e164"
artifact_digest: "sha256:3e296d261a8ca09c2af66a00a5febb09dc06ce1188402146aca6cc365ce7680a"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6.1-sol"
  model_display: "gpt-6.1-sol"
  session_fingerprint: "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
  identity_source: "runtime"
started_at: "2026-10-12T06:20:21.381Z"
submitted_at: "2026-10-12T06:30:18.851Z"
finding_ids: []
answered_finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004"]
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Corrected both required authority-prose findings and addressed both optional precision suggestions. The table, JSON references, index and registration bytes are unchanged.

## Finding dispositions

- R1-F001: Addressed. Records bind four publishing worker hosts and six distinct signing keys. Each Linux worker’s absence and creation pair shares its actual worker host; hosts are distinct across the four workers.
- R1-F002: Addressed. Explicitly named included Linux 24/26, macOS 24 and Windows 24, and excluded queued Windows 26/macOS 26 behind max-parallel 4. Fresh actual GitHub status confirmed the latter are queued. The run is not complete or green; Windows 26 preparation is not exercised or proved by this wave. Separate normal registration review remains required for the excluded workers.
- R1-F003: Addressed by qualified prose. Timing tap applies on every OS during preparation only, never capture, and wraps callback/promisified array-argument UTF-8 execFile calls. Unsupported overloads fail closed; Buffer stderr-empty reporting is conservatively inaccurate. Neither grants authority. The source-controls artifact retains the safe diagnostic log. Producer code remains frozen; this response makes no untested generic Node API compatibility claim.
- R1-F004: Addressed. Explicitly stated actual 898 tracked producer inputs, compared with 894 at source 0783554. Verified unchanged tarball/inventory/contract digest fields for each platform against the earlier genuine registrations. Windows tarball differs from Linux/macOS while inventory and contract agree.

## Changes made

Changed the owned subject prose only. No scope, key, host record, capture capability, script, command, context, deadline, producer input, table or JSON reference changed. Historical failures and incomplete delivery gates remain explicit.

## Declined changes and rationale

No requested prose change declined. No timing-tap implementation change is made during the live producer freeze; its actual supported calling convention and diagnostic limit are explicitly disclosed instead.

## Verification

Read the full genuine submitted reviewer response. Compared actual six records: four distinct worker host hashes, one stable host per Linux pair, six distinct key IDs. Compared per-platform digest fields to genuine source 0783554 records. Re-read actual published worker lists and producer-freeze data (898 inputs) and current GitHub run/job status. Exact table and JSON reference block compared byte-identical before/after author revision. Index/registrations remain pinned at 91432dd2f7f9f48e39114ee15162ea52eef69b62. No six-job green, class acceptance, scope adoption, Windows performance or #190/#107 completion is claimed.
