# #200 Same-session expired reviewer recovery

## Scope

Repair managed Claude resume for the existing registered reviewer's expired pending turn. Preserve the same provider session, sealed invitation, current response, artifact, HEAD/index, and normal commit mode. Production operation budgets and worker/source-class authority are unaffected.

## Context

The real #190 normal XPR has a submitted author revision at 326db5436e59df93c3d62b438cfdc3635504b92a. Its reviewer claim expired while prerequisite #198 was delivered. The launcher requires live reviewer-turn status; status instead requires the reviewer to run recover --reclaim. The author cannot run that command as the reviewer, and the launcher cannot currently reach the reviewer. This is distinct from #198 passive measurements and #190 production stock-probe feasibility. Installation doctor passes; separate broker-start readiness failures remain retained and are not claimed fixed here.

## Acceptance Criteria

- [ ] Same recorded reviewer session can run the exact package-generated recover --reclaim before the exact pending response is edited or submitted.
- [ ] Normal live resume remains supported; wrong role/session, challenged/fenced/uncertain authority, and replacement remain refused.
- [ ] Local affected controls pass; actual hosted suites and authenticated exact-head downloaded receipts pass before delivery.

## Plan Metadata

- Priority: P0
- Size: S
- Estimate: 2 base human hours; native risk forecast is separate.
- Execution: sole inline implementer, no implementer delegation.

## Story Intent

- **Beneficiary:** review authors and reviewers
- **Capability:** resume an expired review turn through its original managed reviewer session
- **Need:** the current launcher refuses the same session needed to reclaim an expired reviewer claim
- **Value or failure prevented:** preserve independent review continuity without replacing participants or fabricating review authority

## Global Constraints

Affected/TIA tests only on host; full suites hosted with downloaded receipts. No native broker build, OAuth/auth transfer, principal cache, production timeout change, reviewer replacement, raw private handles, or gate waiver. Preserve #190 review and all failed/unknown evidence. Use public AITM lifecycle and exact-head CI evidence. Reclaim must occur inside the actual recorded reviewer process, never in the author shell.

## Review Focus

- Expiry during the author revision wait must not permanently block the registered reviewer.
- Stale author claims and challenged claims must not gain reviewer recovery authority.
- Wrong private recorded session must be refused before dispatch.
- Current turn response remains exact; neighboring responses and the artifact remain unwritable.
- Failed/unknown reclaim must not become accepted review or permission to replace the session.

## Implementation Tasks

### Task 1: Preserve expired reviewer continuity under closed launch permissions

#### Story Intent

- **Beneficiary:** review authors and reviewers
- **Capability:** reclaim the original reviewer's expired pending turn within its recorded session
- **Need:** live-status validation currently excludes the recovery state that only that reviewer can resolve
- **Value or failure prevented:** avoid stalled reviews and preserve cross-provider independence

**Files:** src/cli/run-core.mjs; src/provider/claude-launch-core.mjs; test/helpers/claude-launch-cli-regression.mjs; test/unit/claude-launch-identity.test.mjs; test/unit/claude-launch-permissions.test.mjs; skills/peer-review/SKILL.md if a user-visible recovery instruction is needed.

**Interfaces:** Consume event-authoritative status, stale reviewer claim and existing private resume validation; produce a same-session launch with an exact package-generated recover command and the existing one-response Edit boundary. No public arbitrary command/string permission input.

- [ ] Extend the existing real-protocol fixture to advance the clock beyond claim expiry after the initial registered launch; assert the existing launcher fails before dispatch. Add stale-author/challenged and wrong-private-session refusal controls.
- [ ] Allow only a pending reviewer turn with stale reviewer claim and a validated same recorded Claude session. Derive the exact recover command/permission through the package's command and rule generators. Never construct permission rules manually.
- [ ] In that actual resumed reviewer, run recover --reclaim before response edits or submit. Validate any explicit intervention's interrupted state and keep normal live resume unchanged. Retain runner identity, revision/current-response, no-rejoin, sanitization and outcome classification checks.
- [ ] Run the affected launch identity/permission/classifier tests. Verify exact recovery rule rejects different workspace/flags and permission scope rejects artifact/neighbor writes. Run existing protocol recovery tests and lint/format.
- [ ] Commit with [#200], push a draft PR, collect genuine hosted CI receipts, get the required fresh whole-branch review and fix its findings. Use native Test, Review, approval, delivery and close with accepted receipts; do not restamp tests in Test.
- [ ] Install the actual delivered repair without modifying pinned old evidence or building the portable native broker. Resume #190 and its same recorded reviewer; prove actual reclaim/submission through protocol events rather than provider exit.

**Verification Commands:**

```sh
node --test test/unit/claude-launch-identity.test.mjs test/unit/claude-launch-permissions.test.mjs test/unit/claude-launch-classifier.test.mjs
node scripts/ci/verify-receipts.mjs
```

## Self-review and semantic review

The role, capability, actual expiry deadlock and avoided replacement are grounded in the genuine #190 review and inspected launcher. All seven story-quality questions pass: real stakeholders, behavioral capability, concrete need and counterfactual value, source grounding, distinction from measurements/production workers, and standalone readability. The sole task covers all five focus cases. Actual resumed submission remains later operational verification; this plan does not assert it has occurred.
