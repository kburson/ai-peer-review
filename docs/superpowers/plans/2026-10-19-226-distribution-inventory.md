# Issue 226 distribution and downstream census supplemental plan

> For agentic workers: use executing-plans for this bounded task. This supplemental source adds task-specific Story Intent and execution details; the accepted #222 specification and plan remain unchanged. This proposal is not native Plan approval.

## Scope

Inventory accessible AIPR installations, released package inventories, relevant remote refs and known AITM interface consumers. Produce only `docs/superpowers/adoption/222-distribution-inventory.json`, plus issue226 planning, evidence and validation files. Do not install, build, publish, activate, change runtime source or write downstream repositories. The census may complete with explicitly unavailable evidence and blocked removal; it cannot claim absent consumers from a failed lookup.

## Context

Issue226 implements Task 01B of `docs/superpowers/plans/2026-10-18-222-review-journal-refactoring.md` (issue-222-plan-r6; SHA256 40f42a01820509ed7d24afe13291fdceabe0f1bd565da0548191da065951afb7). Governing specification is `docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md` (issue-222-r13; SHA256 f67d8a5c22b8a36537876aee529fe9dbc0530b7137650c28f144d7b9960ad5be), particularly sections5/5.1 and6. Base095599d8471830dc4ed38859957fc6168a04c106, parent141, branch feature/child/226. Dependencies: adopted specification and accepted plan; no native child prerequisites observed at intake. Task01A owns source census and Task01C owns issue census; Task01 (issue228) joins records later.

## Story Intent

- **Beneficiary:** AIPR maintainers coordinating package and downstream compatibility
- **Capability:** identify shipped proof interfaces and their actual downstream callers before retiring exports
- **Need:** source absence and failed registry lookups do not establish that an installed or released interface has no consumers
- **Value or failure prevented:** prevent removal of interfaces still needed by an installed package or AITM workflow

## Proposed User Story

As an AIPR maintainer coordinating package and downstream compatibility
I want to identify shipped proof interfaces and their actual downstream callers before retiring exports because source absence and failed registry lookups do not establish that an installed or released interface has no consumers
So that I prevent removal of interfaces still needed by an installed package or AITM workflow

Seven-question semantic review: the beneficiary maintains real package compatibility; capability is a concrete retirement safeguard; need distinguishes incomplete distribution evidence from absence; consequence prevents caller breakage; claims derive from specification5 and6 and Task01B; sibling01A covers source callers and01C issue requirements rather than installed consumers; the three-line story states its purpose independently.

## Complete-task human forecast proposal

SizeS, 3.5complete hours: human work3.0h retains scoped inspection and JSON census1.5h; human structural and source read-back verification0.5h; independent review0.5h; delivery/integration0.5h. Additional unavoidable machine execution0.5h is a conservative planning assumption for focused checks and exact-head hosted Linux/macOS tests, not measured telemetry or a replacement for human verification. Hard ceiling4human hours including all overhead. One bounded census file, no product code, no package installation and explicit unavailable rows make this narrower than compatibility implementation. Any new broad consumer archaeology becomes separately forecasted prerequisite work. Native forecast registration must follow independent inspection; the provisional source estimate is not evidence of inspection.

## Cumulative agent allowance

Direct owner determination establishes full14400seconds available to each222-hydration leaf at this continuation. Durable source: owner-full-allowance.json in the orchestrator SDD workspace. Prior historical Unknown and parent timing evidence remain unchanged; the owner determination is allocation authority, not repaired telemetry. Charge all work after continuation across sessions/retries/agents. Proposed total5400seconds active reserve includes implementation, verification, independent review and delivery; hard cumulative ceiling14400seconds. This worker resumed2026-10-19; native start timestamp is retained in session timing. Pause passive external waits.

## Global Constraints

Linux and macOS only; Windows213 indefinitely deferred, unscheduled and nonblocking. No Windows worker/native build. Preserve the protected review and Claude session named in the brief unchanged and unsettled; never read them as test inputs. Retain historical accounting and Unknown. Retain operation/query/portable/test budgets30000/15000/5000/800000ms and portable concurrency cap4. Maximum3implementation workers plus integration owner. No #107 activation/release, protected-session recovery, global upgrade, publication, trunk merge, native Review/Close by this worker or broad AC adoption. No new hold labels/edges; preserve222-hydration, completed214 and children. Preserve local role/session/turn authentication, one-writer transitions, expected revisions, atomic durability, exact retries and explicit unavailable states. No new attestation service, policy engine, evaluator, sandbox or migration framework. AIPR review participants never author/stage/commit/push FUR; this worker's separate development role only writes its owned census/planning/evidence. Exact #217 historical bounds/estimates remain as in the accepted plan and brief without repair.

## Review Focus

Unavailable registry metadata cannot mean no distribution. A release tag and binary asset may differ and require separate identities. A linked installation is a source checkout, not proof of registry content. An AITM importer may retain a public proof export even when runtime callers vanish. Sensitive historic records must not be republished in an inventory.

## Implementation Tasks

### Task 1: Inventory shipped packages and downstream interface consumers

#### Story Intent

- **Beneficiary:** AIPR maintainers coordinating package and downstream compatibility
- **Capability:** identify shipped proof interfaces and their actual downstream callers before retiring exports
- **Need:** source absence and failed registry lookups do not establish that an installed or released interface has no consumers
- **Value or failure prevented:** prevent removal of interfaces still needed by an installed package or AITM workflow

#### Files

Create `docs/superpowers/adoption/222-distribution-inventory.json` and `test/unit/distribution-inventory-226.test.mjs`. Own evidence under `.scratch/226/` or issue226-specific tracked evidence files only. Never change package/controller/API/source inventories.

- [ ] After allowance inspection, native intake/refine, JIT Plan entry and current-code deep dive, bind this supplemental source through governed native Plan Metadata. Render User Story with `aitm user-story`; register independently inspected forecast and native Plan approval before Develop.
- [ ] Read actual package manifests and inventories for accessible global/project AIPR installations, resolve link targets, record exact package version/ref, inspected file/export and caller. Inspect release-list asset inventories, remote trunk/parent refs and tags read-only. Never run install or release hooks. Keep each failed/unavailable lookup's known identity and follow-up owner.
- [ ] Read AITM's actual importers and contracts for public API validation/proof interfaces, including the known1939/1944 consumers. Associate proof-retirement candidates from specification5 with retained/retire-after-adoption/blocked-removal dispositions and owning cleanup task. Do not assert downstream changes.
- [ ] Write rows with repository/ref/package version, access state, inspected file/export, caller, introducing owner/commit where available, distribution location, disposition, reason, owning cleanup child/task, verification command/read-back and follow-up owner. Bound inaccessible asset contents explicitly rather than broadening investigation.
- [ ] Verify required row fields and complete selected-export disposition coverage with a focused Node validator; exercise unavailable rows and fail if any selected retirement lacks a consumer decision or blocked removal. Run `git diff --check`, declared lint/format checks and native Test/receipts required by the live issue. Document any environment refusal honestly; no Windows or protected-session run.
- [ ] Commit only owned files with [#226], record native commit-trace, report CODE_COMPLETE with exact base/head, tests, native state, timing and unchecked items. Orchestrator owns independent review, native Review/approval/Close and delivery.

#### Verification commands

```sh
node --test test/unit/distribution-inventory-226.test.mjs
git diff --check
```

## Verification outcomes required

- [ ] All accessible selected distributions and known AITM importers have exact provenance rows.
- [ ] Every unavailable item names its identity, limitation and follow-up owner.
- [ ] Every selected proof-export retirement names concrete consumer disposition or blocked removal.
- [ ] All live issue checks and independent review evidence remain explicit; no successful claim from an absent receipt.

## Current execution status

Owner allowance determination resolves the earlier blocker. Root inspected the human3hour baseline; corrected complete proposal is3.5hours including separate machine execution, pending independent inspection and native registration. Plan approval remains required before Develop.
