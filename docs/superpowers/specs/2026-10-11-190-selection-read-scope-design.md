# #190 conditional selection read scope within an original operation

## Active simple local handoff amendment

The user's 2026-10-16 direction selects trusted agents already permitted to work
in one local project. The [simple handoff design](./2026-10-16-190-trusted-local-storage-design.md) and
[implementation plan](../plans/2026-10-16-190-trusted-local-storage.md) govern that workflow. Reviewer writes only its
current response notes; author may also revise the artifact; neither participant
modifies other tracked files, Git metadata or anything outside the project.
Use normal filesystem access with essential turn authentication, locking and
restart recovery. No initial/repeated ACL or SID challenge, protection-admission
scope, source-class enrollment/capture prerequisite, persistent query worker or
native binary is required for this local handoff.
Conflicting stronger requirements below are historical/broader capability scope,
not local handoff gates. Preserve their evidence and do not mark their broader
claims complete. Old accepted revisions do not approve this amendment; normally
review the revised documents and record the changed #190 scope before runtime
implementation.

## Purpose and actual evidence

Task5 must finish actual installed operations inside their original budgets.
The accepted stock Windows worker design remains conditional. This document
addresses repeated selection-store descriptor acquisition before considering
worker implementation; it grants no process-source or installed authority.

[Windows observation run 38191125761](https://github.com/kburson/ai-peer-review/actions/runs/38191125761)
passed Node 24/26 with ordinary and genuine limited accounts: complete fresh
records agreed, a real ACL change was detected, the exact captured descriptor
was restored, and child exit was observed. Cold first queries were 396, 435, 429
and 3142 milliseconds. The 3142 ms sample remains part of the variability evidence.
All reports retain verified:false, unavailable authority and zero guaranteed
savings. These measurements do not prove parent-loss handling or registration.

[Complete cost run 38191790750](https://github.com/kburson/ai-peer-review/actions/runs/38191790750)
executed immutable 40a3e279d551719416eb750974fe30d011d6a37a on disposable Linux
Node 24/26 installations. Actual primary registration finished in 4497/5019 ms
under the original 30 s limit, including primary admission withdrawal. Both
runs counted 428 ancestor inspections, 424 inspections, 38 protection observations,
36 protected-root opens, 208 verifications, 59 reads and no nested selection scope.
Fixture cleanup remains unproved; Linux elapsed is not Windows elapsed.

Commit b58e95f already retains one descriptor across the two fresh snapshots
inside one assertSelected call. Four real C1 descriptor controls and 70 affected
regressions pass. Original code reproduced two opens instead of one. A complete
operation still repeats selection admission many times. No complete Windows
forecast or production observation worker is admitted.

## Implementation admission and attributed benefit

This specification defines a conditional proposal. It does not authorize scoped
retention implementation while attributed feasibility evidence is missing.
The aggregate V8 counters above do not identify selection callers or original
contexts. Their selection share and full-operation matching admission count N
remain **unobserved**; no numerical value is inferred from 36 opens.

The established b58e95f per-admission path has one protection observation and
one protected-root open across two independent snapshots. Source inspection
identifies two open-time root inspections, two snapshot reads, and two explicit
guard verifications. Windows reads perform two fresh root/file pair queries
per snapshot, so the ordinary successful path has eight stock ACL queries.
A later matching borrower would retain both fresh snapshots/verifications and
remove only its protection observation and open-time inspection: six queries.
These are source-derived path counts, not measured complete Windows counts.

There are three explicit successful-path admissions in primary register and
activate, and additional admissions through process-source/election checks.
Their matching share is unknown. If N eligible admissions are actually observed,
the proposed selection acquisitions change from N to 1, saving N-1 observations,
N-1 opens and 2(N-1) root queries. N=3 is only an illustrative explicit-path
lower bound, yielding four fewer queries; it is **not** a complete count or a
sufficient reason to keep this complexity.

Before implementation, collect an attributed baseline on the unchanged immutable
candidate with the original commands and budgets. Record selection-store caller,
original-context identity, protection observations, opens, inspections/pairs and
verifications per admission and complete primary register/activate. Private
identities/paths remain private; public projections contain bounded counters.
Unattributed or mismatching calls cannot be counted as eligible savings.

Admission requires that both Node 24/26 complete baselines mechanically support
at least 75% fewer selection-store acquisitions and at least 20 fewer complete
operation stock root-query starts, with all remaining observations accounted for.
Otherwise defer the proposal as marginal history without implementing it.
A diagnostic scoped prototype must then compare before/after counts on that
same immutable diagnostic candidate and operation, preserving the original
failing candidate and all of its loaded inputs unchanged; its ports/counters
grant no authority.
If actual counts fail the prediction, discard the prototype and preserve its
failed results. The separate Windows worker gate still requires a complete
registration forecast below 30000 ms, including measured cold variability,
remaining work, margin and cleanup. No scope approval alone admits that worker.

## Internal API and identity

The production singleton supplies `withSelectionReadScope(context, callback)`
through an explicit `selectionScope` function port. The callback receives an
internal effect-observation sink, never a public capability. `read()` and
`assertSelected()` may borrow; `location()` keeps its existing behaviour.
Runtime selection `register`, `--update` and `--dry-run` refuse while any scope
is open or closing on that store, regardless of the registration context.
They also refuse while a scope retains uncertain cleanup.

A scope accepts only its original actual AbortSignal and exact finite monotonic
deadline, strictly future and at most 30000 ms away at entry. Longer deadlines
refuse rather than clamp, including ones earlier checks might have admitted
after elapsed initialization time. No injected clock, root, account, descriptor,
receipt, current observation, provider or script is an input.

Each store instance owns an AsyncLocalStorage association and a private WeakMap
keyed by actual signal identity, containing entries keyed by exact deadline.
The association identifies lexical nesting; the WeakMap identifies original
contexts. At most 64 live entries participate; overflow refuses.

The first matching read binds a copied tuple `{directory, home, uid, principal}`.
Every borrower freshly derives all four fields from its normal account and
portable-system checks and compares them. Principal comes from a freshly checked
`system.userId()`; the Windows SID is meaningful even when uid is -1. No current
principal result is cached. A different tuple poisons the scope; no root migration
or newly observed replacement protection is adopted.

Each call still creates its ordinary portable system, validates account/path
components, performs both fresh snapshots and existing generation, selection,
principal, protection and installed inventory checks. Retain only one genuine
C1 descriptor and its existing original binding. The first acquisition uses the
existing protection/open path. Subsequent reads independently verify root,
ancestry, token, ACL and file generation with that guard. Never retain current
account, permission, bytes or source observations for reuse.

## State machine and concurrency

| State        | Matching read/admission                       | Enter another scope with same key | Different/unscoped read                           | New distinct sibling scope                       |
| ------------ | --------------------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| open         | Bounded FIFO borrow                           | Refuse                            | Ordinary one-shot                                 | Allowed                                          |
| closing      | Refuse                                        | Refuse                            | Ordinary one-shot                                 | Allowed while closure is known, otherwise refuse |
| closed-clean | Ordinary one-shot under its original deadline | Refuse                            | Ordinary one-shot                                 | Allowed                                          |
| poisoned     | Refuse permanently for that key               | Refuse                            | Ordinary one-shot                                 | Allowed only if no uncertain cleanup remains     |
| uncertain    | Refuse                                        | Refuse                            | Ordinary one-shot; no discharge of old obligation | Refuse until actual cleanup is discharged        |

Successful closure keeps a closed-clean tombstone until the signal is collected.
A poisoned/uncertain key never becomes reusable: cleanup discharges resources,
then leaves a poisoned tombstone. A fresh original signal/deadline is required
for a later scope. Ordinary one-shot reads cannot revive an old worker or scope.

Entering any scope from inside that same store's associated scope callback
refuses as lexical nesting, even with a different context. Independent concurrent
siblings with distinct keys may each own their own guard. No guards or records
are shared between store instances. New scope entry refuses while any old scope
retains an uncertain acquisition or close; existing independent scopes do not
silently take ownership of it.

Serialize matching borrowers in FIFO order, with at most 64 pending calls per
scope. Queue time consumes the original deadline. One initialization promise
owns acquisition; it cannot publish multiple descriptors. Every participating
call is registered before any asynchronous acquisition, including unawaited
calls. Once closing starts, no further call may borrow. A failed read poisons
its original scope, refuses queued borrowers and prevents reopen/retry.

## Completion, effects and uncertainty

Run the awaited callback, stop borrowing, establish tracked-call quiescence,
then close the particular guard. Never wait unboundedly for unawaited reads;
query and quiescence work retain the original deadline. If quiescence or close
cannot be proved, retain the real guard/pending operations as an obligation and
refuse **scope completion**, not pretend the callback's effects did not happen.

The store's `pendingCleanup`/`retryCleanup` owns all scope obligations, including
failed acquisition when the first portable system's post-open principal check
fails and its close is uncertain. The scope must retain that owning system or
its explicit cleanup handle so its obligation is reachable. No ephemeral system
is dropped while it holds a retained guard. Explicit retries discharge only
actually observed closure and do not renew read authority or revive poisoned keys.
Closing after expiry releases resources only; it authorizes no new query/effect.

Each successful admission privately records its last genuine selection snapshot
and installed inventory. After the last awaited closure, synchronously revalidate
that snapshot, declared installed inventory/source and original context before
returning a result. Preserve the existing pre-effect admission/effect fences;
this final boundary is an additional completion-integrity adjunct.

The integration callback reports effect progress through the private sink at the
actual producer boundary: `none`, `committed` after actual primary record
read-back, or `unknown` after a possibly partial effect. Retain the genuine
receipt/result privately; caller-declared JSON does not establish effect state.
If this post-effect integrity or close boundary fails, report the bounded outcome
**effect committed; scope completion uncertain** for a proved committed effect,
**effect status unknown; scope completion uncertain** for an uncertain effect,
or **no effect committed; scope completion uncertain** for a proved dry run.
Retain the actual receipt/record and obligation in private recovery evidence.
Never roll back, automatically retry, replay register/update, or replace the
existing callback error. Public collateral exposes bounded state and obligation
categories, not private receipt bytes, paths, SIDs or handles.

In particular, a selection change after `writeRecord` and before final closure
must preserve the committed primary receipt/record and report committed effect
plus uncertain completion. A later explicit human recovery may inspect the
actual record; a generic automatic register retry is not authorized.

## Explicit primary integration

Production `primary-operations` passes the singleton scope function to
`createPrimaryMaintenance`. The production factory requires that port; absence
refuses. `createPrimaryMaintenanceCore` has an explicit optional fixture port:
omitting it deliberately retains unscoped test-core behaviour, and injected
fixture ports create no production membership or positive installed evidence.

Wrap only the `guarded` register/activate operations. Construct original context,
enter selection scope **before** the first `admit(original)`, then await existing
primary admission, callback effects and withdrawal. The producer reports actual
effect state/receipt through the internal sink before returning. Finally finish
the scope as above, including callback failure paths.
`preserveHistory`, `holdReview` and `releaseReview` remain outside this integration;
their separate review-history wrapper is unchanged. Broker startup/submission
need separate explicit boundaries and evidence. Do not wrap process-wide CLI
lifetime or unrelated authenticated operations in the same scope.

On Windows, a directory handle retained for this bounded operation may prevent
another process from renaming/deleting that selection directory until closure.
This bounded hold is expected; no uninstall/manual-repair success is claimed
while it is held. Uncertainty retains that obligation rather than hiding it.

## Authority and required rejection controls

The conditional stock Windows worker remains owned by one genuine C1 guard.
Scope retention implements no resident process. A later admitted worker retains
its 15000 ms query limit, original deadline, poisoning, exact framing and
parent-loss requirements; guard closure must prove its particular child's exit.

All historical classes and review attempts remain history. Changed producer
bytes require ordinary new registration, signed capture and separate normal
finite class review before adoption. Quantitative diagnostics cannot replace
complete actual Windows registration, fresh installed/manual recovery, hosted
full receipts or whole-child review. No native build, permission/principal cache,
budget increase, class waiver or fixture permission is introduced. Host TIA only;
Linux manual review remains excluded, missing macOS/Windows input incomplete.

Required controls include:

- Attributed baseline and admission thresholds above; missing evidence blocks
  implementation. Same-source prototype before/after counts must agree.
- Each snapshot stays fresh. Changed bytes, same-byte inode/root/ancestor/ACL,
  home, uid, POSIX/Windows principal, stale inventory and late account changes
  refuse; actual descriptor closure is observed.
- Different signals/deadlines, longer deadline, same-key re-entry, lexical nested
  scopes, expired/aborted/poisoned calls refuse borrowing. Closed-clean matching
  calls go one-shot; independent siblings and unscoped calls use the stated table.
- Concurrent acquisition opens one guard; FIFO/overflow/unawaited/callback-error
  and uncertain acquisition/close controls retain real reachable obligations.
  Cleanup cannot erase poisoning or supply success without actual exit.
- Register/update/dry-run cannot reseal selection while any live/uncertain scope
  exists. read participates, location remains independent.
- Selection/source replacement during final closure refuses scope completion.
  After an actual committed primary effect it reports committed effect/uncertain
  completion and preserves the actual receipt; dry-run and unknown-effect paths
  report their truthful distinct states. No rollback or automatic retry.
- Private projections and copied test objects cannot become production membership
  or leak paths, SIDs, bytes, stack text or handles.
