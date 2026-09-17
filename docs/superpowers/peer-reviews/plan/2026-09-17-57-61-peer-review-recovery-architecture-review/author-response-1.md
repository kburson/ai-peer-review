# Author response 1 — implementation plan revised

- **Artifact:** `docs/superpowers/plans/2026-09-17-57-61-peer-review-recovery-architecture.md`
- **Governing spec:** `docs/design/2026-09-17-57-61-peer-review-recovery-architecture-design.md`
- **Reviewer response:** `docs/peer-reviews/plan/2026-09-17-57-61-peer-review-recovery-architecture-review/reviewer-response-1.md`
- **Author:** Codex
- **Reviewer:** Claude (Opus 5)
- **Review mode:** manual relay
- **Disposition:** revised; reviewer re-evaluation requested

## Summary

All twelve findings are accepted. The revised plan chooses a dormant-v2
delivery through #60, moves every new public command grammar into the atomic #61
activation, restores omitted repository dependents to their owning tasks, and
adds a full gate to every story boundary.

The plan also records that its `docs/superpowers` review commits are off-trunk
planning evidence. Implementation worktrees start from the approved code
baseline after issue hydration, preserving the existing parity rule that a
publishable tree contains no Superpowers planning files.

## Blocking findings

### P1 — Accepted; v2 remains dormant through #60

Tasks 1-8 may expose v2 constructors and mutation services only through
`test/helpers/internal-api.mjs`. Every user-reachable mutation continues writing
event-v1 through the #57, #58, #59, and #60 releases. Task 9 atomically switches
public writers and seals the final accepted-schema list.

Task 1 now creates a real public v1-cycle dormancy test and a release-upgrade
test. The dormancy test runs at every intermediate story gate; Task 9 changes it
to assert public v2 activation. The upgrade test proves that a record created by
release N receives `compatibility-declared` immediately before its first v2
event under release N+1.

### P2 — Accepted; all new grammar moves to Task 9

Tasks 4, 7, and 8 now implement internal services only. They no longer modify
`parse.mjs`, `help-data.mjs`, or public routing. Task 9 owns the atomic addition
of `reclaim-lock`, `recover-record`, `enter-intervention`,
`cancel-intervention`, `rotate-author`, and `adopt-record`, together with the
workspace-first launcher and `--preflight-only`.

The serial delivery order now states that #59 and #60 expose neither new grammar
nor public v2 writers.

### P3 — Accepted; repository dependents added

The launcher tasks now include both Claude permission suites, reviewer boundary
and guard suites, and the live conformance script as update-only. Recovery owns
the existing recovery suite and intervention fixture. CLI activation owns both
startup templates, all six template goldens, and their golden test. Lineage owns
the manifest golden test and all four fixtures.

Tasks 1, 2, 3, 5, 6, and 7 run the ported-behavior parity test. Task 10 owns any
justified ledger owner change; the plan forbids wholesale regeneration and
requires preserving existing owner names unless a deliberate rename supplies a
documented replacement.

## Significant findings

### P4 — Accepted; full gate at every story boundary

Story-closing Tasks 2, 3, 5, 8, and 10 now run the complete test, slow,
packaging, smoke, lint, formatting, and dry-pack gate. Focused commands remain
the inner TDD loop.

### P5 — Accepted; closed environment policy expanded

The Claude allowlist now includes Windows process essentials, uppercase and
lowercase proxy variables, gateway token/base-URL inputs, and the API-key helper
TTL. A negative child-process test proves arbitrary inherited variables are
absent. The plan explicitly distinguishes preserving `PATH` for subprocesses
the resolved provider may launch from the package's own absolute executable
resolution, which never consults `PATH`.

Direct Anthropic, configured Claude, and gateway authentication are supported.
Bedrock and Vertex mode flags fail preflight with
`APR_ENVIRONMENT_INVALID` in this increment; those credential families require
a separately versioned adapter classification before admission.

### P6 — Accepted; terminal lineage receipt is optional in manifest-v1

`lineage_receipt` is an optional closed-schema property, not a new required
field. Existing manifests remain valid. A pre-#58 terminal record without the
receipt may be inspected from retained workspaces; after scratch loss it becomes
`incomplete-unavailable` and cannot be consolidated or executed. Task 3 owns
deterministic regeneration and review of all manifest goldens.

### P7 — Accepted; rollback and abort policy added

The plan identifies #61 as the format point of no return. Releases #57-#60 are
runtime-revertible because public writers remain v1-only. A workspace containing
v2 must be preserved and opened with its declared or a newer compatible reader;
its log is never downgraded or rewritten. Partial #61 activation is forbidden.

### P8 — Accepted; liveness probes are collision-only and absolute

Liveness probes run only after exclusive lock creation reports an existing
path. Linux reads proc files without spawning. macOS uses fixed canonical
`/usr/sbin/sysctl` and `/bin/ps`; Windows uses the fixed canonical PowerShell
system path and degrades on nonstandard installations. Missing, redirected,
unverifiable, or failed executables produce
`APR_REVIEW_LOCK_LIVENESS_UNKNOWN`; no probe searches `PATH`.

## Clarifications

### P9 — Accepted

The #60 decomposition row now explicitly includes sequence-only execution
authority.

### P10 — Accepted

Task 7 now names both protected actions and
`protectedParametersMatchEvent`, with a RED test covering the silent unmatched
action fallthrough.

### P11 — Accepted

Task 4 now defines optional sequence-only event-v2 `lock-reclaimed`. It is
appended through the internal path only for a reducible nonterminal log; the
retained stale-lock receipt remains authority, and genesis or terminal/no-log
reclamation remains receipt-only.

### P12 — Accepted

The asserted mapping is replaced by an explicit acceptance-criterion-to-task
matrix. Criterion 10 maps to the decomposition decision and serial delivery
order rather than a runtime task.

## Verification

- Rechecked the named current files, test scripts, closed manifest schema,
  intervention fixture, generated templates, golden fixtures, parity ledger,
  and lock/event reducer seams.
- Re-ran plan self-review for file ownership, activation ordering, rollback,
  task interfaces, and acceptance-criterion coverage.
- Document formatting, Markdown, spelling, and Git whitespace checks are run
  before committing the plan, reviewer response, and this author response.
