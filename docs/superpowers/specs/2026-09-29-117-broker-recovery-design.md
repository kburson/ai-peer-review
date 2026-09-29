# Issue 117: Broker Recovery and Unjoined XPR Retirement

## Status and scope

This design addresses the package defects exposed by the AITM #1841 XPR. Two review workspaces exist with different pinned package images. The older Opus 5 review is unjoined at startup stage `manual`; the newer Opus 5.5 review is unjoined at stage `authority` and has a durable manual fence. Both have Claude session handles and tool-use observations from attempts to run the package-generated `join` command. An AITM Bash hook denied both commands. Neither review has a reviewer participant or reviewer decision event.

The package must present a usable offline broker recovery route, permit an author to retire an unjoined review through durable protocol authority when that is safe, and surface explicit provider errors that explain a failed launch. It must preserve the recorded workspaces and each review's pinned execution image. It will not change AITM hooks or loosen the package-generated absolute `node` and CLI paths. The package will be repacked for local installation; publication to the npm registry is outside this issue.

## Recovery authority

`broker status` is a read-only projection. It must report every unreconciled workspace with its review ID, startup stage, and pinned runtime digest when those fields can be authenticated from the registration and startup journal. It must distinguish an unverifiable record from an authenticated candidate. It may suggest the newest authenticated candidate as the first recovery attempt; the suggestion is advisory, and a successful authenticated broker handshake and registration reconciliation establish actual readiness. If the newest runtime fails, the status result must retain the other candidates and the failure evidence rather than claim that the broker is ready.

`broker reconcile <workspace>` remains the mutation that starts that workspace's verified pinned broker image while offline. When a different review has another pinned runtime digest, the broker may construct a recovery-only worker for it, but it must never dispatch that review under the candidate image. An old pinned image that cannot construct a recovery-only worker for a newer registration may fail; the CLI must make the next candidate visible without deleting or rewriting a registration. `broker status` must not start a broker or infer that a candidate is compatible solely from version text or filename ordering.

The immediate #1841 recovery should therefore recommend the Opus 5.5 review's newer pinned runtime first, because it reconciles the old review as recovery-only. The older Opus 5 review remains recorded and cannot be launched under the newer image.

## Unjoined retirement

An author may request `abandon <workspace> --reason <text>` for an awaiting-reviewer review only when the sealed author session matches, the reviewer participant is absent, and no reviewer decision event exists. The operation must inspect the startup journal, broker recovery fence, manual Claude launch state, and any wake operation ledger under the same review's authority. A Claude session handle or tool-use observation is retained as evidence of an attempted launch; it is never rewritten into `not-submitted` or called an explicit provider refusal.

For a `manual` startup, no broker worker owns reviewer dispatch. For an `authority` or `registered` broker startup, a durable fence must exclude future automatic dispatch before terminalization. `launch-pending` or `outcome-unknown` broker operations require reconciliation before retirement. Any reserved or ambiguous wake operation also blocks retirement. A terminal `abandoned` event is written with an expected revision while holding the review mutation lock. A concurrent reviewer join makes that revision stale and causes abandonment to fail. Once terminal, a late `join` or `submit` must be rejected by protocol authority. The collateral reservation is released only after the terminal event is durable; all launch state, observations, and broker records remain on disk.

The CLI must explain why retirement is refused and point to the exact reconciliation action. `supersede` still requires valid lineage and is not used to evade a missing lineage receipt. A fresh review gets a new review ID and invitation after the old attempts are terminal. Exact retries of an abandoned review remain terminal and must not recreate a reservation.

## Claude launch diagnostics

An explicit structured Claude error that states the installed Claude Code version is below a required version should produce a bounded diagnostic with the observed and required versions and an update/retry recovery instruction. The parser must accept only that narrow error shape and valid version strings; it must not echo arbitrary provider text, prompts, paths, or raw stderr. A documented model or effort rejection remains `APR_REVIEWER_SELECTION_REFUSED` only when the provider explicitly identifies that selection. A generic nonzero exit, absent JSON, tool hook denial, or missing reviewer event remains a failed or uncertain launch according to current classification and requires status/reconciliation. No diagnostic constitutes protocol submission.

## CLI and agent guidance

`help broker`, `help abandon`, and `explain` must distinguish offline status from the reconciliation command that starts a pinned broker. Help should show the full candidate list and explain recovery-only workers and preserved evidence. Add the missing `APR_LINEAGE_UNAVAILABLE` explanation so users know why a supersession attempt cannot replace abandonment. Help must avoid saying that an unjoined review was never launched merely because the broker journal lacks a provider operation.

## Verification

Tests must first reproduce the mixed-image status suggestion and the old-image refusal, then show the newer image can recover the old registration without launching it. Separate tests must cover unjoined manual and fenced authority-stage abandonment, launch-state preservation, late join rejection, concurrent join, ambiguous broker or wake operations, and exact retry. Claude diagnostic tests must cover a structured version-floor error and generic nonzero or malformed output. Run issue #117's targeted verification commands, full package tests, packaging tests, lint, and format checks before creating a local tarball. Validate the tarball and its SHA-256 before any global reinstall; do not publish it.
