# Provider Authority and Broker Reconciliation Amendment (#88)

## Status and authority

- Date: 2026-09-21
- Status: Proposed for human and independent peer review; not implementation authority
- Parent: epic #39; remediation child #88
- Amends: [Project-Local SPR/XPR Broker Design](2026-09-14-project-local-spr-xpr-broker-design.md)
- Evidence: whole-branch review of `0f5dfb2`; the three findings are tracked
  by [child #88](https://github.com/kburson/ai-peer-review/issues/88)

The accepted 2026-09-14 design and plan remain immutable provenance. This
amendment narrows how their provider-conformance and broker-worker requirements
can be claimed. Epic #39 cannot pass integrated acceptance or release until
#88 is Done and its exact implementation head has passed whole-branch review,
the full verification matrix, and the supported-host CI gate. No published
package, API credential, or provider subscription limit is changed by this
document.

## Problem

The shipped-in-progress source has three Important integration defects:

1. Startup holds a dispatch lock while awaiting a Claude reviewer process.
   That process must submit before returning, but submission calls manual
   recovery fencing, which reacquires the same lock. A non-manual review can
   therefore fail with `APR_REVIEW_LOCKED` in its normal path.
2. CLI join fills alleged runtime effort and adapter version from sealed
   request values. The Claude adapter similarly constructs an alleged runtime
   observation from its launch command. Comparison against the request then
   proves only that the request equals itself.
3. The production broker always creates a recovery-only worker with no
   provider driver, coordinator input, or provider-resource lease. Injectable
   fixture workers do not make the installed broker capable of a handoff.

The correction must not turn an installed executable, a requested flag, a
successful process exit, or a fixture into proof of exact-session control.

## Scope and provider boundary

Claude Code, Codex, and Grok Build are the intended review partners. Their
installed local command-line or officially supported local SDK/agent-control
interfaces are the candidate surfaces. This amendment does **not** authorize a
new separately billed provider API dependency or a request to expand the
operator's paid budget. Claude live calls must wait for the stated 04:00 CT
limit reset; provider-limit errors stop that provider's conformance run rather
than trigger retries, substitutions, or a background loop.

Official interfaces establish candidate control, not conformance by
themselves: [Claude Code programmatic mode](https://code.claude.com/docs/en/headless)
supports structured session output; the [Codex SDK](https://developers.openai.com/codex/sdk)
supports local thread start/resume; and [Grok Build headless/ACP](https://docs.x.ai/build/cli/headless-scripting)
supports structured runs and explicit session IDs. The implementation must
probe exact installed versions and record which required fields and outcomes
each surface actually returns before marking a capability healthy.

Gemini/Antigravity remains compatibility-only and untrusted. It is not a
fourth production reviewer selector, an `other`-family escape, or an automatic
fallback in #88. A later Google-family feature needs its own versioned
identity/schema and independent review as the parent design already states.

Existing sealed reviews retain their original bytes and recovery contract.
New manual XPR still uses the project-local broker for registration and
routing, but neither a manual nor a `resume-only` label implies automatic wake.
No provider is silently substituted when a selected surface fails a gate.

## Observation and assurance contract

Before a reviewer claims a turn, compare the sealed selection with an
independent, current observation from the selected provider's official local
surface. Provider evidence must be bound to the exact provider session and
record its source, time, and operation ID. The executing pinned runtime
separately attests its own adapter version; that value is not represented as
provider-emitted metadata. The claim requires matching provider family, host,
exact model, effort, adapter version, and distinct session identity. Persist
only bounded, non-secret evidence or a digest and owned pointer; never put raw
provider handles or credentials in tracked collateral.

An observation cannot obtain `runtime` assurance from environment variables,
generated invitations, launch arguments, or fields copied from the sealed
request. A provider-reported model is evidence for the model only. A command
flag for effort is a requested setting, not proof of the effective effort
unless an official acknowledgment or session/result record binds that setting
to the exact run. Missing, ambiguous, stale, or divergent evidence denies the
runtime claim before the reviewer turn is claimed. A deliberately declared identity remains
the existing restricted manual-assurance path; it cannot satisfy provider
conformance or automatic wake.

The installed-provider conformance record is per adapter version and exact
control surface. It must state the provenance for every claimed field and
must include a requested-versus-actual mismatch test. `doctor` and startup
may advertise only capabilities established by that record plus a fresh local
health check. Unsupported Claude, Codex, or Grok surfaces remain usable only
through modes whose authority can actually be proven; a recognized selector
is not a promise of automated control.

## Dispatch, submission, and manual recovery

Startup reserves a durable, uniquely identified provider operation and its
sealed intent while holding the review dispatch lock. It releases the lock
before waiting for the provider process or session. The launch acknowledgment
records one of `definitely-not-submitted`, `acknowledged`, or
`outcome-unknown`, with an exact session/operation binding where available.
Crash recovery reads that durable state before any new dispatch. An unknown
outcome is never automatically retried.

An authenticated reviewer submit that belongs to the current provider
operation is an ordinary protocol action. It does not request manual recovery
and must be able to join and submit while the launcher is still awaiting the
provider. It must still pass sealed identity, event revision, response seal,
and operation ownership checks. A separate, explicit offline/manual takeover
requests suspension, waits for in-flight work to settle or returns the exact
unknown-outcome intervention, and then publishes a durable fence under the
dispatch lock. Worker delivery rechecks that fence and revision immediately
before use. No lock is held across the provider's entire execution interval.

## Production broker worker

At registration and restart, the broker loads the sealed review authority,
the verified pinned runtime image, and the selected adapter version. A
package-owned factory constructs a review-scoped worker for that exact
registration; it cannot default an apparently automatic review to the
recovery-only stub. The factory obtains a passive resource lease before
touching an exclusive provider surface, or records a proven concurrent
surface. Lease loss or incompatible version prevents dispatch.

The worker's provider bridge maps one sealed wake operation to a role-specific
target session, invitation/capsule, expected event revision, and adapter
handle. It may use existing coordinator mechanics only when both participants
meet the current resident/transport and health requirements; `resume-only`
cannot be promoted to `automatic-required`. For each operation the bridge
must distinguish accepted delivery, definitely-not-submitted, and unknown
outcome; restart reconciliation uses the provider's official exact-session
surface before any retry. A worker with no conformant delivery surface is
honestly recovery-only and cannot satisfy an automatic request.

The first installed-package release gate must prove at least one real,
supported local-provider automatic handoff through this production assembly, not just an
injected worker fixture. If none of the three installed provider surfaces
can furnish the required observation and operation semantics, #88 and #39
remain open for an explicit scope decision. Passing offline fixture tests
alone cannot waive that gate.

## Verification and review gates

The child implementation plan must name exact test paths and include observed
red-to-green coverage for:

- launch, authenticated join, and reviewer submit before launch resolves;
  manual takeover racing that submit; and an unknown outcome with no retry;
- requested-versus-provider-observed model, effort, session, and adapter
  divergence through the ordinary CLI and selected production surface;
- installed-package broker-owned handoff, exact worker reconstruction after
  restart, lease contention/loss, and no duplicate wake after ambiguity;
- each supported partner's capability report, including truthful refusal
  when a field or operation cannot be observed; and no Gemini/Antigravity
  production selector;
- legacy sealed-review recovery, default and slow suites, packaging,
  provenance, and the cross-platform exact-head CI matrix.

Provider conformance tests that consume a live provider must be bounded and
explicitly recorded. Do not run Claude before its limit reset or consume an
extra paid API budget. After two chained newly discovered defects or failed
fix rounds, stop and check in with the operator before a third. This is a
delivery-process stop, not permission to weaken a runtime or release gate.

## Non-goals

- No new global daemon, scheduler, public coordinator command, or additional
  npm package.
- No automatic model/effort fallback or provider substitution.
- No live Gemini/Antigravity reviewer support in this child.
- No npm publication or epic closure as a consequence of design approval.
