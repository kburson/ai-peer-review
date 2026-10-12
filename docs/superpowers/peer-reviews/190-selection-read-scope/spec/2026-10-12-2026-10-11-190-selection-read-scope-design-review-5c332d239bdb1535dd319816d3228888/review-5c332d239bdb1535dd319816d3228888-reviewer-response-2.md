<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-5c332d239bdb1535dd319816d3228888"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md"
artifact_commit: "bb659a195bc456cb8b5c985c6954b3867b808687"
artifact_blob: "fe4781a3da8585a72577d05381293400e1fd3f97"
artifact_digest: "sha256:d7aff3831ecd08fa1fa34fe3c19514edc62d5e702dcbd75371c3bd9ef695dc39"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:4aa1751fafeeca10ee6b721c7a2bc83321a82bec1a1b883fcec0648e211b5805"
  identity_source: "runtime"
started_at: "2026-10-12T01:58:45.231Z"
submitted_at: "2026-10-12T02:21:17.400Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-reviewed the revised `docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md` at `bb659a1`, together with author response 1. I checked the revision against the turn-1 required changes and against the current source, which is unchanged since `ba59707` according to the author:

- `runtime-selection-core.mjs` (L73–86, L208–232, L315–519);
- `primary-maintenance.mjs` (L146–182, L261–338);
- `primary-admission.mjs` (L77–154);
- `portable-system.mjs` (L105–404);
- `storage-protection.mjs`: `windowsProbe` L403, `inspect` L708–726, `inspectWindowsReadPair` L784–792, `observeStorageProtection` L864–885, `openProtectedRoot`/`verify`/`readObserved` L961–1145, `readSnapshot` L1409–1447.

How the turn-1 required changes were handled:

1. **Post-effect boundary (RC1): resolved.** Scope completion is now explicitly an integrity adjunct. The pre-effect admission and effect fences are kept. A failure after an effect is reported as one of three distinct bounded outcomes: committed, unknown, or no effect, each with uncertain completion. There is no rollback, automatic retry or replay. The genuine receipt is kept privately. The specific control I asked for (selection change after `writeRecord`) has been added.
2. **State model (RC2): resolved.** The registry key is a per-store `WeakMap` keyed by signal identity, holding entries keyed by exact deadline. Lexical nesting is detected with `AsyncLocalStorage`, so "nested" is now precise and different from independent siblings. The five-state table covers all four of my cases (a)–(d). Closed-clean matching calls go one-shot. Poisoned and uncertain keys never become reusable. New scopes are blocked while any cleanup is uncertain.
3. **Identity tuple (RC3): resolved.** The scope binds `{directory, home, uid, principal}`, and every borrower freshly derives and compares all four. The principal comes from a freshly checked `system.userId()`, so the Windows SID is covered. Controls exist for both POSIX and Windows.
4. **Integration seam (RC4): resolved.**
   - `withSelectionReadScope` is supplied through an explicit `selectionScope` port.
   - The production factory refuses if the port is absent.
   - The core fixture port is optional and creates no membership.
   - Only `guarded` `register`/`activate` are wrapped, and the scope is entered before the first `admit(original)`.
   - Review-history maintenance is excluded.
   - A caller deadline more than 30000 ms away is refused, not clamped.
5. **`register`/`read` (RC5): resolved.** `register`, `--update` and `--dry-run` refuse while any scope is open, closing or uncertain on the store, regardless of context. `read()` participates and `location()` is unchanged. The resealing control has been added.
6. **Benefit (RC6): resolved as a conditional gate.** The author correctly declines to infer N from the aggregate V8 counters. The spec now has three parts:
   - **Per-admission count.** I verified the source-derived Windows path count. One admission makes 8 stock probe starts:
     - `observeStorageProtection` → `inspect` (1);
     - the open-time `inspect` (1);
     - two `readSnapshot` calls, each making two `inspectWindowsReadPair` probes (L1070, L1115) (4);
     - two `guard.verify` calls (2).

     A borrower drops the first two, leaving 6. `inspect` covers the whole ancestor chain in one `windowsProbe` call (L726), so "root-query starts" is the right unit.
   - **Reduction formula.** It is stated explicitly.
   - **Admission gate.** Implementation needs attributed Node 24/26 baselines showing at least 75% fewer acquisitions and at least 20 fewer root-query starts, followed by a same-source prototype comparison. Otherwise the proposal is deferred as history.

   Since 2(N−1) ≥ 20 implies N ≥ 11 eligible matching admissions per complete operation, the 20-start threshold is the binding one. This is the decision rule I asked for. Because the spec now explicitly grants no implementation permission until that evidence exists, accepting the conditional design does not depend on the missing dataset.

The turn-1 optional suggestions were also taken up:

- FIFO serialisation, with at most 64 pending borrowers and queue time charged to the original deadline;
- reachability of the obligation when the initialising portable system's post-open check fails;
- disclosure of the Windows directory-handle hold;
- number spacing.

Verification limits: as before, this session could run only the prescribed submit command. I did not run tests or inspect hosted runs. Source line numbers refer to the working tree.

## Findings

None blocking. The open points below are precision items. The required implementation plan and its review can settle them, and the spec's evidence gate already blocks implementation.

## Required changes

None.

## Optional suggestions

1. **Make effect-sink transitions monotonic and pin the "no effect" cases.** The spec says `unknown` is reported "after a possibly partial effect". To make the reported state truthful by construction, say three things:
   - the producer moves the sink `none → unknown` *before* its first mutating call, which is `writeExclusive` of the receipt in `writeRecord` (L158);
   - it moves `unknown → committed` only after the activation read-back (L177–178);
   - nothing ever moves backward.

   The "no effect committed" outcome is currently stated only for "a proved dry run". Non-dry-run paths that never reach a mutation should also be covered by name: the unchanged-record early return in `register` (L321), and any failure before `writeRecord`. A sink still at `none` there is also proved no-effect. Otherwise an implementation could report an unproved path as "no effect", or a proved no-op as "unknown".
2. **Say what the 64-entry limit counts.** A `WeakMap` cannot be counted. State that the 64 "live entries" limit counts only open, closing and uncertain scopes, tracked in a separate counter or `Set`. Say that closed-clean and poisoned tombstones do not count and are released only through signal collection. That avoids an implementation that needs a `FinalizationRegistry`, or that hits the overflow because of tombstones kept alive by a long-lived caller signal.
3. **Note how far `AsyncLocalStorage` reaches.** The association is inherited by every async continuation created inside the callback, including timers or lease renewal set up under `withPrimaryAdmissionFence`, and it stays with them after the scope finishes. A scope entry from such a continuation after closure will be refused as lexical nesting. That is conservative and acceptable, but one sentence saying it is intended would stop a later change from treating it as a bug.
4. **Bring the gate's units together in one place.** The admission section mixes "selection-store acquisitions" with "complete operation stock root-query starts". Adding the inequality above (≥20 starts ⇔ N ≥ 11 eligible matching admissions, given 2 starts saved per borrower) would let the baseline be checked mechanically against the source-derived per-admission count.

## Decision

accepted
