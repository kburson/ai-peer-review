# Story 190 restart checkpoint

User requested a pause for restart. This is an incomplete-work checkpoint, not a completion receipt.

## Resume location

- Issue: [190](https://github.com/kburson/ai-peer-review/issues/190)
- Draft PR: [196](https://github.com/kburson/ai-peer-review/pull/196)
- Worktree: `/Users/kpburson/.codex/worktrees/story-190-installed-journeys/ai-peer-review`
- Branch: `codex/190-installed-journeys`; base: `codex/171-portable-consumers`.
- Source checkpoint before this evidence-only commit: `786a1d5318d158e885c92dc9c52c352736e5cd51`.
- Owning chat: `01a12fee-ed19-7751-b03a-dfed9f5658f3`.

Reload current task guidance and live issue authority before resuming. Resume the native paused timer in the same chat; for a new chat, use the native binding/transfer workflow rather than editing tracking state.

## Completed evidence

Hosted capture run [38278337597](https://github.com/kburson/ai-peer-review/actions/runs/38278337597) completed all six combinations: Linux, Windows and macOS, each on Node 24 and 26. Eight signed controls were normally reviewed and admitted through immutable approval readers. Six current classes are admitted alongside 26 preserved historical classes, for 32 total. Current contract digest: `sha256:a3c54de6bcdfad324577850e29c2f2ab4b809a74ea6f5c9a0de4e9afa6d38f22`. Registration and class wave 6/7 reviews are finalized; none remains active.

Run [38285486815](https://github.com/kburson/ai-peer-review/actions/runs/38285486815) passed the actual Linux Node 24/26 register/activate comparisons at `bd7cc56bee2d6c6ad2219fa276986d5de9dc3d02`. Its 14 JSON artifacts are preserved byte-for-byte under `evidence/portable-runtime/process-source/selection-scope-comparison/38285486815-bd7cc56/`. All eight report hashes match their provenance; actual child exits are observed with code zero. Provenance intentionally retains `verified: false` and `operationalAuthority: unavailable`: these diagnostic comparisons do not confer operational authority or establish end-to-end installed delivery.

## First blocker to resolve

Latest installed journey run [38288385677](https://github.com/kburson/ai-peer-review/actions/runs/38288385677) completed with failure. Linux broker child refusal is `APR_BROKER_STALE`, reason `owner-reconciliation-unproved`; artifacts are in `.scratch/190-delivery/fresh-installed-786-artifacts/`.

`src/broker/portable-reconciliation.mjs` unconditionally appends four unavailable producers (registry, manual, wake, provider) and returns `status: unknown`. `src/broker/portable-ownership-core.mjs` requires `status: clear` with zero outstanding obligations before owner startup. The fetched parent branch has the same stub. This is a missing prerequisite to investigate through the governed scope, not merely a CI wait. Do not replace it with unconditional clearance or empty reconciliation callbacks.

Other incomplete gates: heavy submission still exceeds its original deadline; macOS and Windows installed readiness need passing original-budget receipts; whole-child review, exact-head full hosted CI, and native delivery remain pending. CI run [38288391716](https://github.com/kburson/ai-peer-review/actions/runs/38288391716) was queued at checkpoint inspection. Cloud jobs may finish while the agent is paused; inspect their actual conclusions on restart.

## Preserved experiments

Three unfinished local changes (primary policy byte checks, effect fence observation placement, and the corresponding unit test) were backed up and removed from the working tree. Exact patch, modified files and SHA-256 manifest are in:

`/Users/kpburson/.codex/worktrees/story-190-installed-journeys/ai-peer-review/.scratch/190-delivery/restart-20261012T181539Z`

The experiment passed 33 authority-fence unit tests and the positive installed effect boundary, but the final heavy submission remained failing under its original deadline. One earlier passing submission preceded the necessary original-clock guard and is not a final fix. Logs and passive CPU profiles remain under `.scratch/190-delivery/fresh-policy-*`; raw profiles remain private. Reapply only after inspecting the patch and reconciling the prerequisite above.

Maintain the sole-implementer scope, targeted host tests, hosted cross-platform suites, original budgets, and fresh security observations. No source-unavailable waiver, cached permission/principal/source authority, or native build was introduced for this checkpoint.
