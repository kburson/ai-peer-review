# Specification SAR round 1

**Method:** Manual same-agent iterative self-review. This is not independent review, SPR/XPR, or package-authenticated acceptance. The same agent assesses and revises the draft under direct authorization.

**Started:** 2026-10-18T13:12:59Z. **Findings recorded:** 2026-10-18T13:15:44.591327+00:00.

**Requested execution:** `gpt-6-astra`, reasoning effort `high`. The dispatch explicitly requested these values. Independent actual-runtime model/effort attestation is unavailable to this agent.

**Input:** [Original revision 2](snapshots/round-01-before.md), SHA-256 `0cf66f91edc2fb4bb71ca1b4b881f40d16563cfa12934ae08330cef90392e1c1`.

**Source:** Clean `codex/aipr-journal-refactoring` at `db0febda2e07f827a5c5f47808bcf27ad64e0ed9`. All source references below resolve against that commit in `/Users/kpburson/.codex/worktrees/aipr-journal-refactoring/ai-peer-review`. No source changes or product tests are authorized for this draft review.

## Findings and dispositions

### SAR-001 — Preserve historical validity when rejecting subject drift

**Priority:** P2. **Disposition:** Accepted; revise specification §3.1 and acceptance criterion 6.

**Evidence:** Revision 2 line 54 says an artifact change during a reviewer turn “invalidates that turn for the prior bytes.” That is broader than rejecting a stale submission and conflicts with §3.3's prior-response preservation and §4.2's byte-preserving interpretation. `src/cli/run-core.mjs:2917–2935` rejects changed working/snapshot bytes without rewriting historical events. `src/manifest/render.mjs:142–164` retains per-turn artifact identity. `src/protocol/reducer.mjs:867–873` checks ordered events and revisions; it does not retroactively invalidate recorded prior bytes.

**Consequence:** An implementation could erase or relabel a previously recorded response as invalid simply because an external author later edits the subject. Alternatively it could silently retarget a response at the new bytes. Both would damage the journal's meaning.

**Required correction:** Reject stale advancement or silent subject replacement; retain existing responses and snapshots as evidence about their original digests. An unfinished turn remains incomplete or explicitly superseded only through an adopted operation/version. Do not invent a terminal enum or erase history. Include this preservation in the behavioral acceptance criterion.

**Verification of disposition:** Inspect the revised §3.1 against the existing refusal and history behavior, with byte-preservation and versioned-transition requirements retained. This is a requirement clarification, not a claim that a new supersession operation already exists.

### SAR-002 — Apply four-hour forecasts to executable children, not aggregate or superseded records

**Priority:** P2. **Disposition:** Accepted; revise specification §6 and clarify §7's unit of engagement accounting.

**Evidence:** Revision 2 §6 requires _each affected story_ to receive measurable ACs, verification commands and an estimate within the limits below. The same section includes aggregate #141/#107 and superseded or cancelled records, while §7 explicitly limits _executable cleanup stories_ and preserves old estimates/history. §7 also says cumulative agent engagement spans all agents and sessions without stating “per executable child” in that bullet, although criterion 10 does. The user direction explicitly sets four cumulative engaged agent hours per child and forbids resetting inherited work.

**Consequence:** The blanket wording could force an inaccurate four-hour total onto a multi-child aggregate, require new execution plans for cancelled work, or allow ambiguous budget accounting between program and child.

**Required correction:** Every affected issue receives a disposition and preserved reference. Every executable replacement leaf receives measurable ACs, concrete verification and an inspected forecast within limits. Aggregate records retain honest total scope and child dependencies; superseded records do not acquire fictional executable forecasts. State the per-child engagement unit while retaining all attributable prior work and the no-reset rule.

**Verification of disposition:** Re-read §§6–8 together for one consistent unit. No numeric forecast, old estimate, #217 bound, or native timing is changed.

## Source-grounded challenge results without a new finding

1. **CI bootstrap:** `scripts/ci/verification-scope.mjs:9–19,55–83` excludes the cleanup branch from the closed automatic POSIX bindings. `scripts/ci/verify-project-receipts.mjs:10–37,46–67` separately derives detached issue/ref scope. §5.2 correctly requires both before a push. This review does not execute CI or alter policy.
2. **API versus journal validation:** `src/api/validate.mjs:26–43` returns from `oneOf` before siblings; the implementation contains no `$ref`/`anyOf` evaluator. The explicit §4.2 restriction is correct. No generic schema engine is needed for this prose review.
3. **Contextual schema identity:** `schemas/api-response-v1.json:2–9` explicitly distinguishes its `$id` from the shared transport tag. `schemas/response-v1.json:2–6,28` owns the participant family. The revised specification already preserves this distinction.
4. **Terminal outcomes:** `src/manifest/render.mjs:267–291,307–318` admits only the four acceptance variants. Pending/rejected response histories belong at the event/response boundary. §4.2 does not invent manifest non-acceptance enums.
5. **Source approval versus process safety:** `src/protocol/process-source-assurance.mjs:190–197,265–335,501–536` contains review-digest approval, installed membership, source revalidation and measured probe checks. `src/protocol/process-source-contract-files.json` includes the affected event/reducer/API files. §5.3 correctly requires the safe contract separation first and preserves Unknown/refusal.
6. **Participant permissions:** `templates/author-startup.md:31–37` and `skills/peer-review/SKILL.md:40–53` permit author artifact edits today and distinguish manual instructions from enforcement. §3.1 identifies this conflict and requires adopted handoff/permission changes without claiming existing enforcement.
7. **Snapshot retry integrity:** `src/protocol/service-core.mjs:54–115` binds bytes to a digest and exclusive snapshot store; `src/cli/run-core.mjs:3688–3778` checks unchanged/changed dispositions and a sealing baseline. The specification preserves these useful mechanisms.
8. **Governance:** Requirements are adopted before affected leaves, and the final backlog audit cannot retrospectively authorize divergence. Spec adoption, native Plan approval and external consumer decisions remain distinct.
9. **Historical compatibility:** Fixed package-owned readers, unsupported outcomes and preserved schema bytes do not require retained-image execution or universal historical workflow replay. Existing schema meanings cannot be silently changed.
10. **Limits and protections:** No protected review/session is read or used as a fixture. No installed runtime or provider is launched. Windows deferral, original #217 forecast/bound, Unknown timing and source/worktree preservation remain intact.

## Scope and tools

Read the full specification and the companion program plan as context only. The plan is not reviewed for acceptance and will not be edited. Read AGENTS.md and the using-superpowers, receiving-code-review and verification-before-completion skills. The using-superpowers skill explicitly exempts dispatched subagents; the other two were applied as source-verification and completion-check guidance. Read peer-review skill files as product/source context; their two-agent native workflow does not apply to this explicitly authorized manual SAR and was not invoked. No provider launches, installations, native task operations or external communication occurred.

A lightweight memory lookup corroborated the user's manual SAR procedure (`MEMORY.md:446–452`); no memory-derived product claim was substituted for current source. One shell search initially failed on a nonmatching `operations*.mjs` glob and was repeated using actual directory arguments; no file was changed by that failed search. Some batched output was truncated, so decisive source sections were re-read separately. These are tooling limitations, not findings against the specification.

**Round result before revision:** Two actionable findings, both accepted. No rejected, deferred or disputed findings. Apply only these corrections and revision metadata/Markdown normalization, then preserve the exact after bytes and perform another complete specification round.

## Revision result

**Completed:** 2026-10-18T13:16:16.846052+00:00. Both SAR-001 and SAR-002 are resolved in revision 3.

**Output:** [Round 1 after](snapshots/round-01-after.md), SHA-256 `674f07d1771693866c52424554041510caf6859d7f6a0dc6b8234635f2a5488a`. [Exact revision diff](round-01.patch) records every textual change. Revision metadata was updated; Prettier made no additional specification changes. No findings remain open from this round. The next round reviews these exact bytes without assuming this disposition proves correctness.
