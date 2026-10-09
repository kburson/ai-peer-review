# XPR Round 2 Author Response

**Status:** Revised candidate frozen for independent round3 critique; author acceptance is not asserted.

Same dispatched GPT-6.1 Sol/high author. Round2 independent Claude Opus5.5/high verdict is changes-required; provider receipt records same reviewer session and reported counters, whose cumulative scope is not inferred here. Author runtime identity/native usage/cost remain unavailable. Two rounds consumed of12. No hydration or implementation.

## Exact Lineage

Accepted SAR ancestor remains `ad4431df0c5d291a8fe909de1f9227aef165bb8964e3eb853296899e110a3c60`. Round2 reviewed input is `771e011fb573853188bfb7965e73d4a29116ce3636e583344d298611eae9b409`. New candidate is `5064e977983f0f7447d66573a89f26cd93d07cde2242aa8e5a2a8d1759c7a898`.

- [Round2 raw critique](2026-10-03-107-portable-runtime-xpr-reviewer-response-2.md) and [provider receipt](2026-10-03-107-portable-runtime-xpr-round-2-provider-receipt.md).
- [Exact before snapshot](2026-10-03-107-portable-runtime-xpr-author-response-snapshots-before-2.md), [exact after snapshot](2026-10-03-107-portable-runtime-xpr-author-response-snapshots-after-2.md) and [actual unified patch](2026-10-03-107-portable-runtime-xpr-author-response-patch-2.md).
- [Revised plan](../../plans/2026-10-03-107-agent-first-portable-runtime.md), exact after digest.
- [Controller relocation journal](2026-10-03-107-archive-relocation-journal.md) maps old captured names to byte-preserving canonical archives. This response does not alter their content or earlier decisions.

Reviewer-resolved PXPR-001/002/003/004/005/006/009 remain resolved as recorded in round2. Open PXPR-007/008/010/011/012/013/014 have author dispositions below; independent reviewer confirmation remains pending for all seven.

## PXPR-007

**Disposition:** Addressed with owned Node driver, persistent protected key and matrix manifest.

The missing producer and inconsistent invocation were document defects. Task3 now owns scripts/conformance-driver.mjs, conformance-driver tests and host-bundle schema. pack-bind creates the actual package digest, public run/key binding and Task2-protected private key before capture. Node invokes installed npm's resolved Node entrypoint with argument arrays; there is no POSIX variable/substitution/comment requirement in shown commands.

Task3 and Task18 use identical pack-bind/capture-epoch/verify-epoch driver calls, passing the exact package/run-binding from bundle to the underlying script. The key survives reboot in verified protected storage, is reread/reverified afterward, never silently regenerated, and is destroyed only after verified signed host evidence publication plus durable close receipt. Interrupted work retains explicit cleanup obligations. Public bundle has key_id/fingerprint, not private key bytes/locator.

Task18 owns expected release-capability matrix and versioned release-evidence manifest; driver exports uniquely keyed host bundles, assembles all required actual OS/Node/provider/model/effort/role/topology entries and verifies missing/swapped/duplicate/different-package rows. Matrix CI packs once upstream and supplies that tarball through pack-bind --package; aggregation anchors one expected tarball digest. Unsupported live sources cannot pass by omission. Public signatures verify after private-key closure.

**Verification:** Compared both owning tasks' commands/interfaces/inventories and removed shell-specific PACKAGE_PATH plumbing. Only document checks were run; no key, tarball, live epoch or matrix report was created.

## PXPR-008

**Disposition:** Addressed with broker-loss direction, permanence criterion and successor revalidation.

Verified the spec's wrapper-after-broker-loss requirement. Task15 now owns broker-loss.test.mjs plus observeBrokerLease/reconcileBrokerLoss contracts. A wrapper keeps admitted work during the bounded reconnect window from its last authenticated lease heartbeat, using sealed monitoring.reconcile_after_ms/default120000ms on injected monotonic clock; retries do not renew it and no undeclared config key is added.

A verified successor must own the same physical worktree and revalidate run revision/exact session/tool binding/fresh grant under recovery authority; successful in-window reconnect does not kill provider or create an attempt. Expiry without verified successor is permanent lease loss and triggers cancellation of only the exact owned containment tree, with protected durable obligations. It is cancellation authority from the sealed lease policy, not proof of broker/provider death. Unproved descendant/effect obligations retain fences/lease. Tests cover broker kill, surviving descendant, boundary successor/expiry, forged owner, hung transport, clock epoch/restart-before-reconciliation and receipt crash.

**Verification:** Complete accepted spec monitor/lease/disconnect sections reread and opposite-direction test gap verified. No broker/provider was killed.

## PXPR-010

**Disposition:** Addressed with bounded outcome union and own-slot withdrawal.

Election now consumes AbortSignal, absolute injected deadline and clock, returning won/owner-live/indeterminate. Startup uses the existing30000ms readiness budget; nested operations/retries cannot renew it. Authenticated live owner yields owner-live, withdraws the claimant's own slot and joins as client. A live choosing contender may await publication only within remaining budget; unknown/deadline/abort becomes bounded APR_BROKER_STALE-style response naming exact blocker/obligation.

Only won carries a held ElectionLease. Withdrawal failures remain explicit obligations. Tests assert single broker with simultaneous client joins/zero leaked slots, won reclaim, live newcomer, unknown/hung chooser, all-transition abort/deadline and sharing-violation exhaustion.

**Verification:** Current client connectUntilReady's30-second readiness loop inspected; revised sketch cannot create an owner for non-won outcomes. Algorithm/concurrency tests remain future work.

## PXPR-011

**Disposition:** Addressed; read-only probes are explicitly insufficient for old/new exclusion.

Verified native cache broker.lock/broker.json, POSIX aipr/v1 endpoint and Windows pipe layouts in paths.mjs; registry enumerates reviews and transaction workspaces, and provider-resources uses separate cache resource locks/records. Task4 inventories those plus bootstrap registrations, startup/events/manual fences/collateral authority. It owns legacy-observation.mjs and legacy-portable-boundary tests.

Node net supports Windows named pipes and Unix-domain sockets, so a bounded read-only connection can detect endpoint presence without native flock/LockFileEx APIs. A successful connection refuses; hung/unknown endpoint remains indeterminate. Connection refusal is not death; combine exact Task2 recorded-PID proof and terminal/no-provider-obligation evidence. Live, stale socket, hung listener, terminal-only, active/recoverable/fenced and unrecorded endpoints receive fixtures. [Node net IPC documentation](https://nodejs.org/api/net.html)

A probe cannot stop an unmodified old launcher starting afterward. The plan now says so explicitly: Task4 produces urgent native-free CI/installed candidate with controlled conformance activation, not supported general upgrade or final publication. Task5 owns adopted ActivationBinding from #102's current-runtime/launcher family contract plus real old/new race/drain conformance. Stale quarantine requires that binding; without it, preserve leftovers and report diagnostics. No operator assertion or portable lock is claimed to exclude an incompatible old program. Current legacy manual work stays on its original package/state until reviewed migration. This preserves the accepted-spec conflict rather than inventing a solution.

**Verification:** Paths, registry/provider resources and primary Node IPC documentation inspected. No native lock probe, old-runtime launch, quarantine or migration was performed.

## PXPR-012

**Disposition:** Addressed with explicit gate dependency and produced source resolver.

Gate2 now states that fallback-policy assertions depend on Task5/7 adoption, while grammar work can remain independent. Task7 explicitly produces resolvePolicySources(contractAdoption,installation):PolicySources as a wrapper around the adopted #102-owned policy-source classification/primary authority interface, without implementing competing runtime selection.

**Verification:** Gate2 dependency and Task7 consumed/produced contract compared with its invariant;18-task parser checks pass. No unresolved contract is silently chosen.

## PXPR-013

**Disposition:** Addressed with exhaustive current consumer mapping and regression/static gates.

The reviewer identified real source omissions. Expanded source search also found provider-resources native directory/lock consumers. The plan now inventories client bootstrap/manual fence, provider resource claims, broker entry bootstrap, startup/CLI factory calls, identity canonicalization/principal, IPC/service transport/peer identity and all underlying loader/directory/lock/endpoint/connection methods.

Task2 maps Windows bootstrap to provisionProtectedRoot and exact exclusive create/reverify; manual recovery holds the same winning election across reconciliation/fence publication, or uses authenticated live-owner suspend. Unknown provider/manual-launch submission proof remains fenced. Provider resources get separate bounded resource election through the same algorithm and exact session/nonce checks. Tasks1/2 own async callers; Task4 owns full-production-import-graph and actual-packed-inventory no-native static checks.

New portable-manual-recovery and windows-portable-bootstrap regression fixtures preserve #106/#117/#126 assertions, including competing startup and lost fence publication. No method rename or mode-only directory protection is treated as parity.

**Verification:** rg covered all src/bin platformSecurity imports/exports and direct platform consumers; client/bootstrap/manual fence, identity, provider resource and broker entry source were inspected. No production module changed.

## PXPR-014

**Disposition:** Addressed with exact death/source classification, including ambiguous probe errors.

Current process-identity confirms timestamp boot fields on macOS/Windows. Its macOS catch also returns dead for generic ENOENT/ESRCH, which can describe a failed stock executable rather than target PID absence; copying status alone would be unsafe.

Task2 now accepts death only from an installed-conformance-verified no-such-PID observation with explicit source/version/probe-result provenance, or a different verified process start on the same genuinely verified boot. Clock-derived field mismatch, host mismatch, unverified boot/start source, denied/missing probe or malformed result is unknown. Endpoint silence adds no death evidence. Task2 modifies process-identity classification and tests macOS/Windows clock step with hung owner, missing executable/permission/output ambiguity and Linux verified boot/start PID reuse.

This is stricter than trusting any existing status:'dead' result. It enables actual proved PID absence without prematurely depending on Task3 positive reboot proof; it cannot ignore a live contender because wall-clock observations changed.

**Verification:** Complete process-identity source read and exact OS branches classified. No real clock adjustment or death-probe conformance was performed.

## Nonblocking Advice

1. **Admission caps:** Adopted. At128 pending unauthenticated connections, a new status/cancel socket can be refused before authentication. Preserved control capacity applies to already-authenticated keep-alive connections; plan requires full-cap tests and advertises this limit. Real-clock inconclusive is explicitly not CI/conformance passing.
2. **Windows sharing violations:** Adopted. EPERM/EBUSY slot publication/reads receive at most3 total attempts within the same deadline; exhaustion is indeterminate, never takeover.
3. **#102 coordination:** Adopted. runtime-image changes must inspect exact current #102 accepted/merged head at implementation time, sequence/rebase on its owned inventory interface and review overlap. Current-selection/fallback semantics remain its ownership; no current merge success is claimed.

## Verification and Handoff

Plan passes targeted Prettier/Markdownlint and installed AITM parser:18 tasks, ok=true, zero errors/violations. Exact before/after and actual patch are preserved; verification file holds final raw check outputs and reconstruction result. CSpell intentionally excludes these docs and is not evaluated.

All outcomes above describe planned behavior and documentation changes. No source/Git/AITM mutations, implementation, new issue, hydration, OS security change, provider run, clock adjustment or reboot occurred in this author turn. Final candidate is frozen for the same Claude reviewer's next pass. Seven open findings await reviewer confirmation; all15 gates and owner/adoption/platform blockers remain required.
