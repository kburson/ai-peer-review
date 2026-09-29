---
issue: 117
review_type: single-agent-review
author: Codex
reviewer: Codex
model: gpt-6-astra
reasoning_effort: high
model_provenance: parent-dispatch-configuration
independent_review: false
protocol_acceptance: false
reviewed_commit: 8f63325
reviewed_commit_full: 8f63325202a8a4957dd22369ced21b5411a5e6ae
artifact: docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md
revised_artifact_sha256: d0f97497c5c943cc91ba98ecf5567d94302a16dbd34eb42929c712b88560da01
recorded_at: 2026-09-29T06:00:01Z
assessment: revised-with-implementation-prerequisites
---

# Issue 117 specification single-agent adversarial review

## Method and provenance

One Codex participant critiqued and revised the specification. The model and effort label comes from parent dispatch configuration; no provider identity attestation or independent reviewer protocol was executed. This is an informal self-review, not independent acceptance, an XPR result, or implementation verification.

Reviewed the committed specification, the live issue #117 scope/acceptance criteria/deep dive, and current code at the recorded commit. The issue's incident description supplies the #1841 facts; this review did not inspect, mutate, or launch those external workspaces. The initial working tree was clean. Only the specification and this report were changed. The code review and verification skills guided evidence checking; the Superpowers startup skill explicitly exempts dispatched subagents.

## Findings and dispositions

### SAR-117-01 — High: absent protocol participation is not provider non-submission

The original retirement predicate required no reviewer or decision and a fence, but allowed both incident attempts despite recorded Claude sessions/tool use. Issue #117 expressly requires durable no-submission proof and protects ambiguous outcomes. `src/cli/run.mjs` (`abandonReview`) currently checks a broker journal only; `src/provider/claude-launch.mjs` (`runClaudeReviewerLaunch`, `classifyClaudeReviewerOutcome`) can execute independently, and its `failed`/`outcome-unknown` classifications do not certify non-delivery. `src/broker/launch.mjs` explicitly distinguishes launch acknowledgment from definitely-not-submitted.

**Disposition: revised.** Defined provider non-submission separately from no protocol join/decision, added an evidence eligibility table, and prohibited interpreting null broker operations, hook denial, or missing legacy files as proof. Neither recorded #1841 attempt qualifies on its current described evidence. This prevents the design from satisfying the recovery goal by weakening the issue's safety criterion.

### SAR-117-02 — High: manual dispatch can race retirement without advancing protocol revision

`runClaudeReviewerLaunch` inspects authority, spawns the provider, and persists session state afterward; it has no shared dispatch reservation or review lock. Therefore a compare-and-swap on protocol revision alone cannot catch a concurrent manual spawn, a crash before launch-state persistence, or external wake evidence changing without an event. Existing `fenceManualRecovery` uses dispatch-then-review lock ordering, while `abandonReview` calculates eligibility outside the mutation callback.

**Disposition: revised.** Require a durable operation reservation before manual spawn, shared dispatch exclusion for all managed launch/resume/wake routes, complete operation history, evidence digests, and final validation under the review lock using review ID/revision/sequence/actor. Added both race orderings and crash cases. Legacy pinned code cannot be assumed to honor new controls; unsupported exclusion stays blocked.

### SAR-117-03 — High: reconciliation needs a truthful reachable outcome for manual attempts

The draft directed all ambiguity to reconciliation without identifying what manual evidence the operation could reconcile. `src/broker/launch.mjs` currently observes broker launch acknowledgment and refuses fenced reconciliation; the Claude surface's session/wake observations in `src/providers/claude.mjs` do not supply a general legacy manual non-submission certificate. A completed transcript or a denied join proves neither that the provider request was unsubmitted nor that all attempted deliveries are accounted for.

**Disposition: revised.** Specify bounded, observation-only reconciliation of exact manual and broker operations even when fenced, with bound receipt provenance and explicit submitted/definitely-not-submitted/unknown results. Unavailable or incomplete evidence remains unknown. Add a concrete fresh-output route through existing `start` parameters while retaining old ambiguity/reservations. `src/cli/run.mjs` includes reviews root/template in deterministic identity but excludes record ID, so the design warns that `--record-id` alone is insufficient. This route does not bypass a consumer's requirement for terminal lineage. Cancellation after delivered provider work is explicitly outside this non-submission contract.

### SAR-117-04 — Medium: recovery candidate discovery and ranking were underspecified

`inspectBrokerEvidence` in `src/cli/run.mjs` currently derives candidates from registrations at two ambiguous stages and recovery records, then lexically chooses a workspace. An `authority` crash may predate registration. The draft said “newest” without an ordering definition and described the newer incident runtime as successfully compatible based only on historical incident evidence. Equal package versions can contain different pinned images.

**Disposition: revised.** Enumerate interrupted journals as well as registrations, authenticate their relationship to exact protocol/project/runtime authority, preserve invalid records without suggesting them, and define deterministic ranking with explicit reasons and unknown chronology. Distinguish heuristic suggestion from verified mixed-image capability and authenticated readiness. Failed candidate fallback requires proof the failed broker no longer owns execution. Recovery-only paths explicitly perform no cross-image provider dispatch or resource acquisition.

### SAR-117-05 — Medium: terminal reservation cleanup and replay need separate crash semantics

`abandonReview` appends the terminal event and then calls `releaseReservation`; exact abandonment retry performs cleanup, but the original design only said to release after durability. It did not specify a crash between the two actions, foreign/replaced file handling, or the difference between exact abandonment retry and exact startup retry.

**Disposition: revised.** Specify durable-terminal/cleanup-pending behavior, owned regular-file verification and lock ordering, same actor/reason idempotency, conflicting retry refusal, and terminal startup replay without broker/provider effects or reservation recreation. Require late join/submit and both join race outcomes to be verified.

### SAR-117-06 — Medium: version diagnostics need an actual fixture and authority-safe retry guidance

`src/provider/claude-launch-diagnostics.mjs` parses a bounded structured envelope and allowlisted selection/join codes. `classifyClaudeReviewerOutcome` gives an authenticated decision precedence over failure output. The draft did not identify an actual version-floor envelope, constrain inconsistent versions, describe result-schema compatibility, or prevent an update/retry instruction from causing duplicate uncertain work.

**Disposition: revised.** Require a sanitized fixture from the actual supported error shape before implementing its allowlist; cover normalizer/schema/rendering together, preserve size bounds and submission precedence, reject injected/contradictory version data, and require reconciliation before retry. Diagnostic failure is not non-submission proof. The exact provider version-error fixture is an explicit implementation prerequisite, not an invented claim in this review.

### SAR-117-07 — Medium: test direction omitted safety assertions and a required suite

The original test paragraph named scenarios without defining mutation/dispatch observables or crash barriers, and it omitted the issue's explicit `npm run test:slow` gate. Existing `broker-startup` tests cover several fencing and refusal baselines; `broker-upgrade` checks image preservation but does not alone reproduce mixed-image candidate ranking.

**Disposition: revised.** Added a five-part regression matrix covering zero effects, malformed/foreign evidence, legacy gaps, earlier ambiguous operations, both lock races, reservation crash replay, independent fresh outputs, and diagnostic precedence. Listed all issue gates and distinguished future implementation verification from this specification-only review.

## Final assessment

All seven findings were addressed in the specification. The resulting design preserves the issue's strict non-submission requirement and gives concrete tests for recovery/race/cleanup behavior. It does not claim that the two observed incident launches can be abandoned today. Implementation must demonstrate exact evidence coverage and compatible exclusion; unsupported legacy manual reconciliation must remain blocked. A fresh independent output scope is the available path without deleting old evidence, subject to consumer policy.

Two prerequisites remain explicit for implementation planning: a real sanitized Claude version-floor error fixture, and fixture-backed validation of supported manual reconciliation/proof coverage (including the unsupported legacy outcome). No provider feature or old-image fence behavior should be invented to satisfy them. No source implementation, live recovery, package build, global installation, publication, issue mutation, or protocol acceptance occurred in this review.

## Validations actually run

- `git rev-parse HEAD` confirmed `8f63325202a8a4957dd22369ced21b5411a5e6ae`; `git status --short` initially showed a clean tree. Read-only `gh issue view 117 --repo kburson/ai-peer-review --json number,title,body,state` confirmed the current issue requirements.
- `node --test test/unit/claude-launch-classifier.test.mjs test/integration/broker-startup.test.mjs test/integration/broker-upgrade.test.mjs`: the sandbox run reported 83 tests, 46 passing and 37 failing with Node `uv_uptime` permission errors. The approved host-access rerun passed all 83 tests, with zero failures or skips (30.7 seconds). These are existing implementation baselines, not tests of the newly specified repair. Temporary logs were written under `/private/tmp/`; they are not durable review artifacts.
- `node_modules/.bin/prettier --ignore-path /dev/null --check docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md docs/superpowers/peer-reviews/117/spec/sar-review-01/sar.md`: passed for both documents. The explicit ignore override includes this report, which normal repository formatting excludes.
- `node_modules/.bin/markdownlint-cli2 docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md docs/superpowers/peer-reviews/117/spec/sar-review-01/sar.md`: linted both files with zero issues.
- `node_modules/.bin/cspell --no-progress` with both changed documents found zero eligible files because repository configuration excludes `docs/superpowers/**`; this was not a spelling validation pass.
- The parent independently ran `npx cspell lint --no-progress stdin://review-117-spec.md` and `npx cspell lint --no-progress stdin://review-117-sar.md` with each document redirected to standard input. Both checked one file and found zero issues.
- `git diff --check`: passed. Final `git status --short` showed only the specification modification and this new report directory.

Full package, packaging, slow, lint, and tarball gates were not run for this documentation-only SAR. They remain mandatory for implementation delivery as specified above.
