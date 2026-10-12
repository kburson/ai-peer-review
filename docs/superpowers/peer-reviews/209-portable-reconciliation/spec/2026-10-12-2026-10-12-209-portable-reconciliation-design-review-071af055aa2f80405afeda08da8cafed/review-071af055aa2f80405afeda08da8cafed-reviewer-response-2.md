<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-071af055aa2f80405afeda08da8cafed"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md"
artifact_commit: "425e675f2774013551e8a0d355900f193bf448b2"
artifact_blob: "48a818ad320cad6229388ac7e3d22885609c1790"
artifact_digest: "sha256:6e5cede02c93c0598bfeca553cb8dbfcdc7129ffe5792785fbae8171ada88b19"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:bb08761a852bbd80b75a86caf1b80d91ada22393fa0b77ab36d3c9e1b3c243a7"
  identity_source: "runtime"
started_at: "2026-10-12T19:21:54.010Z"
submitted_at: "2026-10-12T19:49:52.300Z"
finding_ids: ["R2-F001","R2-F002","R2-F003","R2-F004","R2-F005"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I re-checked the revised spec at `425e675` against the tree. Most round-1 findings are resolved.

| Finding | Status | What the revision does |
| --- | --- | --- |
| R1-F001 | Resolved | Adds a per-store authority table that states honestly which stores use ordinary checks and which are protected. |
| R1-F002 | Partially resolved | See below. |
| R1-F003 | Resolved | States the clear/private-record mapping. |
| R1-F004 | Resolved | Adds the `provider-resource-retained` terminal obligation, tracked in #210, and the #190 crash constraint. |
| R1-F005 | Resolved | Revalidates foreign entries instead of refusing; adds bounds and distinct refusal reasons. |
| R1-F006 | Resolved | Closes the vocabulary for the scratch root and adds `review-initialization-unproved`. |
| R1-F007 | Resolved | Names the stock root derivations. |
| R1-F008 | Resolved | Makes legacy `reconcile` optional and inert. |
| R1-F009 | Resolved | Adds assertions before `publishEndpoint` and before `lifecycle.publish`. |

R1-F002 is only partly resolved. The new contract covers the `readPreparedPortableRegistrations` binding and the start/suspend/close receipt model. It does not cover how a restored worker actually behaves.

Three problems remain, and each would block either correctness or the purpose of the repair:

1. A restored worker keeps mutating the observed stores after `start()` resolves. It can also perform provider wake effects. Both happen outside any receipted transition, inside the window between restoration and publication.
2. Several dispositions the spec now classifies as unresolved can only be reconciled by a restored broker worker. But the documented recovery command, `peer-review broker reconcile`, itself requires portable startup. A crash during a reviewer launch or a wake delivery would therefore block the project permanently.
3. The closed vocabulary leaves out `broker/recovery`, a namespace the broker itself writes. This worktree has a record there right now.

## Findings

### R2-F001 — A restored worker's coordinator writes stores and may wake providers outside any receipted transition, before publication

Location: "Restoration and publication generations", paragraphs 2–4, and the publication assertions in "Production boundary", paragraph 3.

The receipt model recognizes only completed `start`/`suspend`/`close` transitions, and it says "an unexpected write outside the authorized worker transition … refuses." The worker does more than that:

- `worker.start()` calls `startCoordinator()` without awaiting it, then returns (`src/broker/worker.mjs:117-157, 160-169`). The coordinator keeps running after the start receipt would be issued.
- `runCoordinator` acquires a coordinator lease in the review workspace. It then runs `reconcileWake`, which reserves wake operations and delivers them through the provider adapter. It heartbeats the lease, and it creates the `deliveries/` and `coordinator/` directories (`src/coordinator/service-core.mjs:228-252, 275-330, 173-197`).
- `guardedAdapter.deliver` and `lease.beforeDelivery` only check `owner.verify`. A prepared, unpublished owner passes that check (`src/broker/worker-factory-core.mjs:382-384`, `src/broker/portable-ownership.mjs:758-784`). So a provider wake can be delivered before the endpoint is published.
- `onStateChange` also schedules `settleWorkers` asynchronously through `sequence` (`src/broker/service-core.mjs:112-121`). That can suspend or close workers concurrently with `owner.publish()`.

The assertions before `publishEndpoint` and before `lifecycle.publish` would therefore race these writes. Any `runnable` or `automatic-wait` restorable registration would fail startup nondeterministically. If the writes were exempted instead, unreceipted wake reservations and provider deliveries would sit inside the window the spec says only closed producer transitions may touch.

### R2-F002 — Unresolved launch/wake dispositions cannot be reconciled, because their only producer runs inside the broker that the observer refuses to start

Location: "State classification and restoration", paragraphs 2–3 and 5 ("Those effects remain with existing authenticated and independently elected producers").

The existing exact reconciliation producers for interrupted effects run only inside a restored broker worker:

- Reviewer launch in `launch-pending` or `outcome-unknown` is handled by the worker's `bootstrap` classification. It calls `adapter.reconcileLaunch()`, which runs the exact-session `reconcileReviewerLaunch` (`src/broker/worker.mjs:20-30, 96-105`, `src/broker/worker-factory-core.mjs:498-517`).
- A reserved wake operation is resolved by the coordinator's `reconcileReserved` (`src/coordinator/service-core.mjs:186-194`).

The documented recovery command is `peer-review broker reconcile <workspace>` (`src/broker/registry.mjs:172`, `src/broker/launch-core.mjs:41`, `src/startup/runtime-core.mjs:311`). When no broker is live, it reaches `prepareRecordedClient` → `ensureBroker` (`src/cli/run-core.mjs:4788-4806, 4819-4824`), which means portable startup. Under the revised spec, the observer classifies the same reserved/unknown launch or wake as unresolved and refuses that startup.

The result is a deadlock. A crash during reviewer launch or wake delivery blocks the project's broker permanently, and the advertised recovery command cannot reach the producer that would resolve it. That is a regression from the legacy path, which restored the worker in `bootstrap` state to run exactly that reconciliation.

A related gap: the spec says an acknowledged provider effect is retained "only when existing exact-session reconciliation proves its current restoration route". It does not name the read-only predicate the observer uses. The existing local check is `joinedLaunchMatches` (`src/broker/worker-factory-core.mjs:84-97`): journal stage `launched`, operation `acknowledged`, and a session fingerprint equal to the current reviewer's. Without a named predicate, an implementer cannot tell whether an ordinary in-progress review whose reviewer launch has been acknowledged is restorable or blocking. This review is in exactly that state.

### R2-F003 — The closed vocabulary omits `broker/recovery`, which the broker writes, and leaves crash-left per-review entries undefined

Location: "Complete protected observation", paragraph 7 (the closed vocabulary for `broker`), and "Restoration and publication generations", paragraph 2 (the receipt binds "before/after review generations").

`recoveryAdapter.persistRecovery` writes `.scratch/peer-review/broker/recovery/<review_id>.json` with schema `ai-peer-review.broker-recovery/v1`. It does so whenever a worker is suspended to `recovery-only` (`src/broker/worker-factory-core.mjs:99-148`), and `src/cli/run-core.mjs:4695` reads it. This worktree has `.scratch/peer-review/broker/recovery/review-071af055aa2f80405afeda08da8cafed.json` right now.

The spec says `broker` contains only "the registrations namespace and exact repository-produced bootstrap diagnostic names", and that unknown children refuse with `reconciliation-namespace-unproved`. Read literally, every project that has ever had a recovery-only suspension refuses portable startup.

The same write also undermines the receipt model. Recovery-only suspension during restoration writes this file, which is outside the review workspace. The receipt binds only "before/after review generations", so the publication assertion would see an unreceipted change.

Per-review crash residue is also unclassified. The coordinator lease under `coordinator/`, and `deliveries/`, `dispatch/` and `locks/`, all exist in real review directories. A coordinator lease left by a crashed broker is authority-bearing. Depending on interpretation, "unknown authority-bearing child names refuse" either blocks every crashed review, or the entry is silently tolerated. The spec should say which.

## Required changes

1. (R2-F001) Define restoration-mode worker start. Recommended: during startup restoration, `start` observes, classifies and settles but defers `startCoordinator` and state-change-driven settlement until after `lifecycle.publish` succeeds. Coordinators then start under the published owner's lifecycle authority. This also guarantees that no provider wake happens before ownership is discoverable.

   If you choose instead to receipt coordinator activity, list every coordinator write (lease, heartbeat, wake reservation, delivery, directory creation) as a receipted transition, and require quiescence before each assertion.

   Add a RED control: an `automatic-wait` restorable review whose coordinator would reserve a wake reaches publication with no wake effect before publication.
2. (R2-F002) For every non-clear disposition class, name a recovery route that does not depend on the startup it blocks. Specifically:
   - (a) Either define a bounded reconcile-only restoration. The observer's exact unresolved launch/wake entries are restored solely to run their existing exact producers: bootstrap `reconcileLaunch` and coordinator `reconcileReserved`. No new launch or wake is allowed. Their receipts must satisfy the publication contract.
   - (b) Or state that these entries are terminal operator obligations. Name the offline route, and correct the `peer-review broker reconcile` recovery text that currently points into the deadlock.

   Also name the read-only exact-session predicate (the `joinedLaunchMatches` semantics) that makes an acknowledged launched review restorable. Add RED/GREEN controls for an in-progress acknowledged review and for an interrupted `launch-pending` review.
3. (R2-F003) Add `broker/recovery/<review_id>.json` to the closed `broker` vocabulary, with its closed schema and disposition. The existing immutable original bytes are evidence of a recovery-only or fenced state, and the record is never deleted.

   Include that file in the restoration receipt for recovery-only suspension. Also enumerate the per-review child vocabulary (`coordinator/`, `deliveries/`, `dispatch/`, `locks/`, `responses/`, `provider/bindings`, `provider/<host>/observations`, `provider/<host>/launch-state.json`, `startup/`, and the top-level protocol files), each with its disposition. That list must include the disposition of a stale coordinator lease left by a non-live broker.

## Optional suggestions

### R2-F004 — Describe the provider store as it already is

The provider-row wording "now backed by genuine portable protection/guards" implies a change. The production ports already do this. They provision or observe every chain directory as a C1 root, including `ai-peer-review` and `provider-resources`, and they store the record as `apr-resource-<resourceKey>.json` beside an election (`src/broker/provider-resource-ports.mjs:25-37, 66-69, 121-138`).

The spec should state that, so it is clear `listOrdinaryEntries()` applies to `provider-resources`. It should also state that the legacy native `resource.json`/`resource.lock` names are blockers (`src/broker/provider-resource-ports.mjs:39-50`).

### R2-F005 — Receipt the worker-factory provider acquisition

Provider-resource leases are acquired in the worker factory with the prepared owner's `instanceId`/`nonce`, before `start` (`src/broker/worker-factory-core.mjs:346-380`). The receipt contract names only `start`/`suspend`/`close`. Say explicitly that factory creation, including its `releaseUnused` unwind, is a receipted transition that binds the acquired lease.

## Decision

revisions-requested
