<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-b9a20b7ba40e0363b2cecb59a3293f6e"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-09-26-106-manual-xpr-startup-design.md"
artifact_commit: "877e107592c3f61ae08f39017bc3b60e3d894afb"
artifact_blob: "d11777a69d3ea88f9ed4e7c69c16780ce465e584"
artifact_digest: "sha256:f2092d5ab0ffc3dd18733d2b79b7032bfc3d8a57b6148d05d5683087546762d3"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6-astra"
  model_display: "GPT-6 Astra"
  session_fingerprint: "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427"
  identity_source: "runtime"
started_at: "2026-09-26T23:52:22.101Z"
submitted_at: "2026-09-27T00:10:36.079Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Addressed all three required findings in the contract and implementation. The reviewed artifact is revised through this protocol commit. Source/test changes from this round remain explicit working-tree changes during this artifact review and will be committed after finalization; they are not claimed to be in the artifact commit. Please review their current working bytes as well as the revised contract.

## Finding dispositions

The reviewer submitted no machine-readable finding IDs. Dispositions by the three numbered findings:

1. Accepted: startup now resolves flag, configuration, then manual default before selecting transport capability and creating startup input. Two real-CLI regressions verify default/configured manual mode, no resume handle, and exact retry after removing inherited resume configuration.
2. Accepted: the shared environment filter removes Claude messaging socket/token, process/child/attendance/entrypoint markers, CLAUDECODE, and inherited effort. Both explicit CLI and broker launches use this filter; ordinary authentication variables are retained. The launch regression checks these keys are absent.
3. Accepted: production active-join observation now uses waitForClaudeStreamObservation. It retries only missing-file ENOENT for a join operation, for at most two seconds with a monotonic clock. Malformed, unsafe, wrong-session and other errors remain immediate refusals. Three regression tests cover delayed actual recorder publication, bounded absence, and contradictory session.

## Changes made

Updated src/cli/run.mjs, src/provider/preflight.mjs, src/providers/claude-stream.mjs, src/providers/claude.mjs, the integration regression file, and a focused observation-wait test. Revised required behaviors 2–4 and named the concrete coverage in the artifact. No provider evidence or protocol decision was fabricated.

## Declined changes and rationale

Optional native-lane symmetry and broker declared-identity environment parity are deferred because production capability selection makes both pairings unreachable and this repair is broker-owned manual XPR. Preserved the existing launcher exit-code contract and documented that callers must read structured status. Adopted the optional request to name covered behaviors.

## Verification

Round-two regressions failed before correction, then 9/9 targeted tests passed. The first live round reached genuine runtime-assured Claude join and event-authoritative revisions-requested submission with status submitted. Unit/golden, integration/MCP/smoke, packaging and lint passed before these additional fixes; full suites will be repeated at the final committed shape. No human-authority verifier is configured.
