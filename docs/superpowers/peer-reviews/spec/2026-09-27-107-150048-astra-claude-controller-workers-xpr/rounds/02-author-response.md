# XPR Round 2 - Author Response

- **Review:** `2026-09-27-107-150048-astra-claude-controller-workers-xpr`
- **Round:** 2
- **Phase:** revision
- **Issue:** #107
- **Role:** same replacement headless author, non-controller
- **FUR:** `docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md`
- **Verified input SHA-256:** `82fa213f49a0897af4cbac037f719ae8f084ac572edccf7b9d34b7c9508c7825`
- **Reviewer-response SHA-256:** `09c1ac6c0975bfad8e94eeb0f10cd45cf1f0f209237e6d61c60b311843a9bc18`
- **Delivery:** proposed author response and patch only; no files or Git/task state changed
- **Revised digest:** pending controller application and supervisor observation

## Scope

This response addresses only XPR-008, XPR-016, XPR-017, XPR-018 and XPR-019.
The normalized controller/headless-worker architecture and previously accepted
remedies remain intact. "Addressed" denotes the accompanying proposed change;
it does not claim patch application or reviewer resolution.

## Findings

### XPR-008

- **Disposition:** addressed.
- **Rationale:** The current FUR contains the corrupted identifier and grammar
  quoted by the reviewer. The contract must preserve the literal `finding_id`
  and `^[A-Za-z][A-Za-z0-9._-]{0,63}$`, specify ECMAScript without flags and
  an inclusive 1-to-64-character length, and require a whole-input match.
  "Reserved IDs" must unambiguously mean already-used IDs unavailable for new
  findings, not a runtime-allocated pool.
- **Change:** Restore and code-format the identifier and regex. Specify
  whole-input validation without trimming, including rejection of a trailing
  line terminator. Supply the complete already-used ID set, including resolved
  history, as a sealed JSON array in the read-only context projection, with
  exact path, count, digest and ledger revision. Extend gate 2 to compare the
  published literal with the registry grammar and exercise representative,
  boundary-length and invalid IDs plus complete historical-ID disclosure.

### XPR-016

- **Disposition:** addressed.
- **Rationale:** A monitor-induced dispatch hold must be observable independently
  of process health and integrity fences. Loss of visibility alone does not
  imply broker reconciliation or participant failure.
- **Change:** Add `dispatch_admission` with `held`, `reason_code` and
  `required_action`. The monitor hold reports `awaiting-visible-observer` and
  `reattach-visible-observer`. Define coarse status during the hold, journaled
  hold transitions, restoration through a verified visible surface and the
  independence of other admission checks. Add the observer-loss tuple and
  gate-6 assertions for hold fields, admitted-work completion, blocked new
  dispatches and verified reattachment.

### XPR-017

- **Disposition:** addressed.
- **Rationale:** The allowance belongs to a requested-stage round, not to the
  lifetime of a participant or replacement stage-attempt. A replacement's new
  round must receive its own full sealed allowance while the exhausted round
  remains exhausted.
- **Change:** State the counter scope explicitly. Every new round receives
  `max_revision_attempts_per_round`, including its initial revision attempt.
  No v1 intervention adds attempts within an exhausted round; `extend-cap`
  adds rounds only and does not authorize replacement by itself. Extend gate 2
  to verify the replacement round's full allowance and the old round's
  permanently exhausted counter.

### XPR-018

- **Disposition:** addressed.
- **Rationale:** Verified monitor visibility and verified wait behavior are
  separate capabilities. Unknown wait behavior is admissible with
  `unattended=false` when a visible surface is verified, but cannot support a
  single-wakeup claim or an invented ceiling, cadence or re-entry count.
- **Change:** Define unknown-capability disclosure, null values and reasons,
  admission behavior and observation accounting. Preserve independently known
  component observations without promoting the overall capability. Replace
  the remaining "capable host" guarantees with the explicit
  `host_wait_capability=single-wakeup` predicate. Add an unknown-capability
  gate-6 fixture, including the separate missing-surface rejection case.

### XPR-019

- **Disposition:** addressed.
- **Rationale:** Enforced staging boundaries require exact runtime-supplied
  paths. A correctable scope error must not consume the round or submission
  grant.
- **Change:** Require every critique/revision handoff, including resume and
  replacement, to supply the exact absolute role-partition and shared-collateral
  paths. Participants do not reconstruct them from templates. Define
  `APR_SUBMISSION_SCOPE_INVALID` as non-advancing and non-consuming, returning
  `submit_review_turn` for the same phase/revision with the permitted partition.
  Extend gate 4 to verify path delivery and a successful corrected submission.

## Unresolved or Debated

None. All five findings have proposed remedies and corresponding verification
requirements. Reviewer confirmation remains pending.

## Verification Boundary

The two supplied input files were read and their SHA-256 digests observed.
No files were written, no patch was applied, and no implementation or registry
tests were run. No further review was performed after drafting. The controller
must apply the patch and publish the supervisor-observed revised digest for the
fresh reviewer pass; author dispositions do not close the reviewer ledger.
