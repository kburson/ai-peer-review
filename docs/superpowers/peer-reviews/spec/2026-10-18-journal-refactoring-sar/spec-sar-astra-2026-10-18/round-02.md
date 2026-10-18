# Specification SAR round 2

**Method:** Same agent, complete specification re-review after round 1. No independent reviewer or package review session.

**Started:** 2026-10-18T13:16:16.846052+00:00. **Finding recorded:** 2026-10-18T13:16:56.778115+00:00.

**Input:** [Round 2 before](snapshots/round-02-before.md), SHA-256 `674f07d1771693866c52424554041510caf6859d7f6a0dc6b8234635f2a5488a`.

**Source baseline:** Clean `codex/aipr-journal-refactoring` at `db0febda2e07f827a5c5f47808bcf27ad64e0ed9`, unchanged from round 1.

## Findings and dispositions

### SAR-003 — Keep the existing restore-and-retry route after drift

**Priority:** P2. **Disposition:** Accepted; correct the new round-1 wording in §3.1.

**Evidence:** Round 1 introduced “An unfinished turn remains incomplete unless an adopted operation explicitly supersedes it.” Read literally, this permits only continued incompleteness or supersession, omitting ordinary completion after the external author restores the exact event-authorized bytes. `src/cli/run-core.mjs:2917–2936` explicitly refuses changed bytes and instructs restoration and retry. The unchanged §3.3 also preserves supported recovery and duplicate-safe retries.

**Consequence:** A cleanup might unnecessarily force a new supersession operation after a recoverable temporary edit, or prevent an otherwise valid pending submission from completing.

**Required correction:** Limit the incomplete state to unresolved drift. Preserve the existing valid submit/retry route after an external author restores the exact authorized bytes. AIPR itself must not edit or restore the subject. Keep supersession dependent on an adopted operation and version.

**Verification of disposition:** Check that revised wording permits (1) unchanged authorized bytes and a valid submission, (2) temporary drift that continues to refuse, (3) an external restoration followed by supported retry, and (4) a distinct adopted supersession. None may silently retarget historical responses or grant AIPR artifact-write permission.

## Re-review coverage

- Re-read the complete revised specification, including unchanged versioned-reader rules, process safety, issue reconciliation, budget and adoption sections. The companion plan was consulted solely to understand the existing decomposition; no plan SAR or approval is inferred.
- SAR-001's historical preservation fix remains justified; SAR-003 narrows one overbroad sentence introduced by that fix. The acceptance criterion preserves history without requiring a new supersession feature.
- SAR-002 consistently distinguishes aggregate totals from bounded executable child forecasts and cumulative child engagement. Existing #217 numbers and Unknown preservation are unchanged.
- The ten source-grounded challenge results in round 1 remain valid at the unchanged source commit. No native runtime action, process probe, protected-state read, product test or GitHub mutation was performed.
- No other actionable finding was identified. No rejected, disputed or deferred finding exists.

**Round result before revision:** One new actionable finding, accepted. Correct it, preserve exact before/after snapshots, then perform another full round rather than declaring acceptance from the correction alone.

## Revision result

**Completed:** 2026-10-18T13:17:16.315425+00:00. SAR-003 is resolved in revision 4. The external author can restore exact bytes and use the existing valid submission/retry route; unresolved drift remains incomplete and no moderator artifact-write power is introduced.

**Output:** [Round 2 after](snapshots/round-02-after.md), SHA-256 `473fd686384a563f21504a10a4d5223a319a6855906099f1176c6a7e0a3e28a3`. [Exact revision diff](round-02.patch) records every change. No other specification text changed except its revision number. No open finding remains from this round.
