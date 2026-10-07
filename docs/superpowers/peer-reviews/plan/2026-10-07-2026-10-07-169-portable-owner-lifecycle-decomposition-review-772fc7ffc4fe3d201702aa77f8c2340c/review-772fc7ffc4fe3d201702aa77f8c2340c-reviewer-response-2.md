<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-772fc7ffc4fe3d201702aa77f8c2340c"
role: "reviewer"
turn: 2
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-07-169-portable-owner-lifecycle-decomposition.md"
artifact_commit: "960eadad1496dfa677a0bac273d78812618441c8"
artifact_blob: "ebb2a9a5adce6ed3b23d0d5cf478a55166c3ed91"
artifact_digest: "sha256:3d163c16b307a1bced7b47245707006c7918a01cb35a7842992d75c775abf29e"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:c112d43539fc1880c43963236a67c87185eed9945375905536f44f0f28fa8806"
  identity_source: "runtime"
started_at: "2026-10-07T12:37:21.287Z"
submitted_at: "2026-10-07T12:55:32.028Z"
finding_ids: ["R2-F001","R2-F002"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the complete revised plan (`docs/superpowers/plans/2026-10-07-169-portable-owner-lifecycle-decomposition.md`, 318 lines, at artifact commit `960eada`) and author response 1. I re-checked each disposition against the baseline code:

- `src/protocol/compatibility.mjs`;
- `bin/peer-review-broker.mjs`;
- `test/unit/collateral-compatibility.test.mjs`;
- `src/broker/ownership-election.mjs`;
- `src/broker/storage-protection.mjs`;
- `src/broker/http-*.mjs`.

As in turn 1, this session ran only the prescribed peer-review command. It did not use Git and ran no tests.

**Turn-1 findings resolved.**

- **R1-F001 (resolved).** Line 60, Task 2 step 3 (line 150), the boundary at line 169 and the contract at line 307 now bind the MAC to the server-observed local/remote IPv4 address and port tuple and to the exact endpoint port. The client compares this with its own reversed tuple before sending any bearer bytes. The two-port proxy RED test `relayed-proof-refused` is explicit (line 148). Connections are scoped to one operation, and the 10 s / 5 s #140 timers are preserved. This closes the relay.
- **R1-F002 (resolved in design, one call site unnamed).** Task 3 now owns the async migration of `assertCurrentCleanupOwnership`. It awaits a strict boolean, refuses on rejection, takes `handshake.versions` from the genuine runtime inventory and protected owner facts, and requires an explicit context for portable owners (lines 63, 190, 226). However, the Files list names only the test call sites. The only production call site, in `bin/peer-review-broker.mjs`, is not named; see R2-F001.
- **R1-F003 (resolved).** Global Constraint line 32 and the boundaries at lines 220–224 and 309 cover four points:
  - the bound: an actual AbortSignal and a finite deadline at most 30000 ms ahead;
  - an AsyncLocalStorage marker with synchronous admission;
  - the four named baseline budget mechanisms, which stay unchanged until private genuine completion;
  - RED tests for clean release after expiry, Infinity/NaN/over-bound deadlines and nested renewal.

  `ownerElectionBudget`/`withElectionLease` take their budget from the privately admitted context, never from a caller override.
- **R1-F004 (resolved, with one example contract mismatch).** Positive examples now use `createHeldPrivatePublicationCore` and `acquirePortableOwnerCore` with `verified:false`. RED bullets are classified, and production refusals are separate. The new Task 4 production assertion expects a returned `{kind:'indeterminate'}`, which conflicts with the plan's own Owner-or-throw contract; see R2-F002.
- **R1-F005 (resolved).** Task 1 now generalizes the existing `createOwnedPublication` engine. It keeps the election wrapper and tests unchanged and uses one obligation shape (line 83).
- **R1-F006 (resolved).** The boundary at line 123 adds the post-rename read-back and comparison, an uncertain receipt that retains both locators, no automatic restore, Task 4 checking the exact receipt before create, and the `displaced-generation-retained` RED test.
- **Optional suggestions 1–4 were all adopted** (lines 68, 144, 169 and 285).

Two medium items remain. Both are small textual fixes, but each would otherwise lead an implementer to a wrong result.

## Findings

### R2-F001 — Task 3 makes `assertCurrentCleanupOwnership` async but omits its only production call site, `bin/peer-review-broker.mjs:255`; an un-awaited call would fail open for native owners

Location: Task 3 Files (line 190): "Update every current assertCurrentCleanupOwnership test/call to await its result, including test/unit/collateral-compatibility.test.mjs." Boundary (line 226): "All existing consumers/call sites are awaited before effects".

The baseline has exactly one production caller, the native broker's cleanup guard:

```js
// bin/peer-review-broker.mjs:253-260
cleanupGuard: async () => {
  const current = await assertSelectedRuntime({ previousObservation: runtimeObservation });
  assertCurrentCleanupOwnership({ owner, protocol: …, runtime: current.inventory });
},
```

The Task 3 Files list does not name this file. The #141 decomposition assigns `bin/peer-review-broker.mjs` to child C6 (#141 line 316), so a Task 3 implementer following the explicit file inventory could reasonably leave it alone.

Failure scenario: Task 3 converts the gate to `async`. This call stays un-awaited, so a refusal becomes a rejected Promise that nobody awaits, and `cleanupGuard` resolves `undefined`. `runBroker` then proceeds with cleanup for a native owner whose `verify()` is `false`, or whose protocol or package version mismatches. The test at `test/unit/collateral-compatibility.test.mjs:187–239` checks that refused cleanup ownership terminates no worker (`closes === 0`, `releases === 0`). That property would now hold only in the test fixture, which Task 3 does update, and not in the shipped broker entrypoint. This regresses the existing native #102 cleanup gate that R1-F002 was meant to protect, and it does so silently, because Task 3's verifier command does not run any test that exercises `bin/peer-review-broker.mjs`.

### R2-F002 — Task 4's production-refusal example expects a returned `{kind:'indeterminate'}`, contradicting the Owner-or-throw `acquirePortableOwner` contract

Location: Task 4 snippet (lines 268–278):

```js
const production = await acquirePortableOwner({ … });
assert.equal(production.kind, 'indeterminate');
assert.equal(production.reason, 'source-class-unavailable');
```

The plan states a different contract in three places:

- Shared Interfaces (line 66): `acquirePortableOwner` "returns Owner or joined BrokerClient".
- Line 285: "boundedOwnershipError returns APR_BROKER_STALE with exact bounded blocker/withdrawal obligations".
- The accepted C4 source (#141 lines 241–244): `if (election.kind !== 'won') throw boundedOwnershipError(election);`

Under that contract, an `indeterminate` election (here `source-class-unavailable`, from `ownership-election.mjs:536–540`) must throw `APR_BROKER_STALE`, with the reason and obligations in `details`. It must not return an election-shaped object.

Failure scenario: an implementer makes this executable example pass by returning the raw election outcome. Callers that expect an Owner or BrokerClient then receive a non-owner object with no `publish`/`verify`/`release`. They either crash or, worse, treat a truthy return value as acquisition. The other choice is to follow line 66 and throw, in which case the plan's own named GREEN example fails. Either way, the plan's contract and its verification evidence disagree on a production refusal path.

## Required changes

1. **R2-F001.** Add `bin/peer-review-broker.mjs` to the Task 3 Files list. Require `await assertCurrentCleanupOwnership(...)` inside its `cleanupGuard`. Note that this one-line Task 3 change precedes C6's broader migration of that file and does not perform it. Add a Task 3 RED/GREEN control proving that the shipped cleanup-guard composition awaits the gate. For example, extract or statically assert the guard and show that a refusing owner makes `cleanupGuard` reject, with no worker close or release. Include that test in the Task 3 verification command. If the file is under a runtime source-contract or protected-inventory constraint, state how that constraint is satisfied.

2. **R2-F002.** Pick one of these and use it consistently:
   - (a) change the Task 4 production assertion to `await assert.rejects(acquirePortableOwner({…}), { code: 'APR_BROKER_STALE' })` and assert `details.reason === 'source-class-unavailable'` plus the bounded obligations; or
   - (b) if a returned refusal is intended, redefine the `acquirePortableOwner` return union in Shared Interfaces (line 66) and in the `boundedOwnershipError` text (line 285), and explain the departure from the accepted C4 throw contract.

   Option (a) matches the accepted source.

## Optional suggestions

1. Task 1 step 1 (line 87) repeats a phrase ("copied/wrong-resource leases and copied/wrong-resource lease"). It also classifies old-generation, symlink, hardlink, parent and ACL replacement under production-refusal. Before #170, production refuses at the lease check, so those tests would pass for the lease reason and prove nothing about substitution. Move the substitution cases under core-on-real-substrate, as line 121 already implies, and assert the specific refusal reason in each test.

2. The Task 3 snippet (lines 203–214) omits the newly added `runtime` input of `createPortableOwnerLifecycle`. Add `runtime: {}` so that the copied-input refusal example covers every producer input.

## Decision

revisions-requested
