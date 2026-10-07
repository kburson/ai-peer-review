<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-772fc7ffc4fe3d201702aa77f8c2340c"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-07-169-portable-owner-lifecycle-decomposition.md"
artifact_commit: "0f767e818e03ca73de66aa42209974988266a89a"
artifact_blob: "d420ebf9677937e1c105a97cf4cf0e47491b9add"
artifact_digest: "sha256:7c6386f166d0717c49dd6d12c938a1232a338ecf92b6e7e63dd54b715a51f8cc"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:c112d43539fc1880c43963236a67c87185eed9945375905536f44f0f28fa8806"
  identity_source: "runtime"
started_at: "2026-10-07T12:37:21.287Z"
submitted_at: "2026-10-07T12:44:04.249Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005","R1-F006"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read all 265 lines of `docs/superpowers/plans/2026-10-07-169-portable-owner-lifecycle-decomposition.md` in the working tree. I compared it with its accepted source, #141 child C4 ("Task 4: Create and reclaim portable broker owners", `docs/superpowers/plans/2026-10-06-141-protected-storage-ownership-decomposition.md` lines 218–254), and with the baseline producers it must extend:

- `src/broker/ownership-election.mjs` (C3, #168);
- `src/broker/storage-protection.mjs` (C1);
- `src/broker/ownership.mjs`;
- `src/protocol/compatibility.mjs`;
- `src/broker/http-auth.mjs`, `src/broker/http-client.mjs` and `src/broker/http-server.mjs` (#140);
- `test/unit/ownership-election.test.mjs` and `test/unit/storage-protection.test.mjs`.

This session ran only the prescribed `join`/`submit` commands. It did not use Git and ran no tests, so I did not recompute the artifact digest or check the baseline/PR claims in "Current Evidence and Size". I take those as stated.

**What is sound.** The four-way split follows real interface seams: C1 storage, #140 transport, C3 lease lifetime and final composition. The plan keeps the original C4 obligations on the root (lines 243–245) and does not shrink the estimate. Several plan statements match the code:

- The plan says "C1 has no retained owner-file/quarantine operation". In `storage-protection.mjs`, `ownedName` (lines 1037–1042) limits retained publications to `apr-election-*` names, so this is true.
- The plan says requestLoopback sends the bearer immediately. `http-client.mjs:50` does this.
- C3's `observeOwner` (`ownership-election.mjs:683–701`) already dynamically imports `./portable-ownership.mjs` and calls `observeAuthenticatedOwner({paths,signal,deadline})` and `isAuthenticatedOwnerObservation`. Task 4's named exports and argument shape match that existing call site.
- The election's `owner-live` outcome carries `owner`, not `binding` (lines 235–241, 329–335). Task 4 line 259 correctly says to preserve `owner-live.owner` rather than reuse the original snippet's `election.binding`.

**What blocks acceptance.**

- R1-F001: the server possession proof is not bound to the channel, so a process on a stale port can relay it.
- R1-F002: Task 3's widening of `isAuthenticatedBrokerOwner` fails open in an existing synchronous consumer.
- R1-F003: the post-completion operation context has no stated bound, and the plan does not name the concrete C1/C3 invariants that currently tie every lease, guard and withdrawal to the startup deadline.
- R1-F004: several executable examples and GREEN claims need a genuine production producer, and none can exist before #170.
- R1-F005 and R1-F006 are medium-severity gaps in the Task 1 design: reuse of the existing retained publication, and a newer generation displaced into quarantine.

## Findings

### R1-F001 — Nonce-bound server proof is relayable: it does not bind the TCP channel, so a stale-port squatter can obtain a genuine MAC and then receive the bearer

Location: Shared Interfaces Task 2 (line 60); Task 2 step 3 (line 126); "Task2 connection" contract (line 255): "The nonce proof includes domain separation, exact instance/worktree/owner-version facts and fresh client nonce." Review Focus 1 (line 48) names this exact threat.

The proof route is credential-free by design, so any local process can call it. `http-server.mjs:291` listens on `127.0.0.1` and accepts any local connection. The MAC inputs listed are the nonce plus instance/worktree/owner-version facts. Neither side's socket addresses are included.

Failure scenario:

1. Owner generation G1 crashes. `runtime/endpoint.json` still names port P1, and an unrelated local process binds P1.
2. A client calls `observeLoopbackOwner` with endpoint P1. Its `privateBinding`/`expected` facts match a live generation that the attacker can reach on port P2. This can happen if the client reads the credential/instance after a newer owner republishes but reads the endpoint before, or if the attacker learns P2 any other way. `validatePrivateBinding` (`http-auth.mjs:5–9`) carries the instanceId inside the private binding, so the expected instance comes from the private side, not from the endpoint file.
3. The squatter opens its own connection to P2, forwards the client's nonce to the genuine proof route and relays the genuine MAC back.
4. The client verifies the MAC, treats the P1 socket as verified, and sends `Authorization: Bearer <credential>` to the squatter (line 126: "then submits authenticated requests on that same verified socket").

The result is that the credential reaches an unverified peer, which is the exact outcome Review Focus 1 and the Task 2 Story Intent forbid. Checking for the same socket does not help, because the squatter's socket is the one that was "verified".

### R1-F002 — Task 3 widens the synchronous `isAuthenticatedBrokerOwner` to async portable owners, so `assertCurrentCleanupOwnership` fails open on `!owner.verify()`

Location: Shared Interfaces Task 3 (line 63): "The original isAuthenticatedBrokerOwner preserves its existing native producer membership and additionally delegates to this genuine predicate". Task 3 Files (line 162) extend `src/broker/ownership.mjs`.

The only production consumer is `src/protocol/compatibility.mjs:257–266`:

```js
if (!isAuthenticatedBrokerOwner(owner) || !owner.verify() || … ||
    owner.handshake?.versions?.broker_protocol_version !== protocol || …)
```

The native Owner's `verify()` is synchronous and returns a boolean (`ownership.mjs:50–66`). The portable Owner "returns candidate Owner with async publish/verify/release" (plan line 63; C4 line 233). For a genuine portable owner, `owner.verify()` returns a Promise. `!Promise` is `false`, so this check passes whatever the real verification would have found. A fenced, replaced or released portable owner would therefore pass the cleanup ownership gate. If the portable owner has no `handshake.versions`, the cleanup gate instead refuses every portable owner, which is fail-closed but still wrong. Neither outcome is tested.

Today no genuine portable owner can exist before #170, so the hole is latent. It becomes live once #170 admits a source class. Task 3 does not include `compatibility.mjs` in its Files or tests, and C6 (#141 line 316) does not list `src/protocol/compatibility.mjs` among the consumers it migrates. The #102 cleanup predicate that C4 line 231 says to "keep meaningful" would be weakened by this decomposition, and no child owns the fix.

### R1-F003 — The post-completion operation context is unbounded and underspecified, and the plan does not name the existing C1/C3 invariants it must change

Location: Global Constraints (line 32): "their own sealed bounded signal/deadline". Shared Interfaces Task 3 (line 63). Task 1 step 4 (line 90). Task 3 steps 2–4 (lines 167–169) and core contract (line 257).

**Unstated bound and origin.** `acquireOwnerElection` refuses any deadline more than 30000 ms ahead (`ownership-election.mjs:504–509`). The plan never says what bound applies to a later top-level operation context, who mints it, or how "top-level" versus "nested" is decided at run time. As written, `verify(context)`/`release(context)` accept "independently supplied top-level contexts" from the caller. Nothing stops `deadline: Infinity` (C1's `operationBudget` explicitly allows `Infinity`, `storage-protection.mjs:220–228`) or a one-year deadline. A caller could also mint a fresh context inside an existing operation to renew it. That contradicts "Nested work never renews either" (line 30) and the #141 constraint "No … new nested deadline" (#141 line 53).

**Unnamed invariants.** In the baseline, every part of the lease and guard path is tied to the original startup budget:

1. The core lease `assert`/`run`/`release` closures, and `withdraw`, call `check()` against the startup deadline (`ownership-election.mjs:65–76`, `149–184`, `278–316`).
2. The production registry stores that budget. `assertOwnerElectionLease` re-runs `core.assert()` and `revalidateInstalledProcessSourceAssurance(record.assurance, record.budget)` (lines 460–465 and 571–576). `ownerElectionBudget` returns that budget (lines 620–623).
3. The transaction guards are opened with that budget at line 532. Each guard captures the budget in `operationBudget` at `openProtectedRoot` (`storage-protection.mjs:668–669`), and every `verify`/`read`/`createFile`/`mutate` checks it.
4. `withElectionLease` throws `lease-budget-mismatch` for any other signal/deadline (`storage-protection.mjs:1233–1240`). This is a #168-accepted anti-renewal guard.

Concretely, in the baseline an owner whose `release()` runs more than 30 s after startup gets `withdraw()` → `check()` → `operation-deadline` → `status: 'unresolved'` with the slot retained. The owner can never release cleanly.

Task 3 must change all four mechanisms. The plan says only "Extend … at their genuine producer seams". It does not list these invariants, which of them stay in force before completion, or which existing #168 tests must keep passing unchanged. Task 3's RED list covers verify after the deadline (line 167) but has no positive test that release after the startup deadline, under a fresh context, withdraws the slot and descriptor with zero obligations.

### R1-F004 — Executable examples and GREEN steps need genuine production producers that cannot exist before #170

Location: Task 1 snippet (lines 93–99); Task 4 snippet (lines 219–233); Task 1 step 1 (line 87); "Explicit Protocol Test Seams" (line 251).

In the baseline, production `acquireOwnerElection` always returns `indeterminate`/`source-class-unavailable`, because `observeOriginalProcess` has no installed assurance (`ownership-election.mjs:536–540`). The existing test asserts exactly this (`test/unit/ownership-election.test.mjs:284–291`). So no genuine C3 lease exists in any test before #170, and no genuine `HeldPrivatePublication`, lifecycle completion or portable Owner can exist either. The examples conflict with this:

- **Task 4 snippet (lines 220–232).** It calls production `acquirePortableOwner` and expects `publish()` to succeed, `verify() === true`, `released === true` and `outstandingObligations` to equal `[]`. Task 4 step 5 (line 217) says production stays unavailable without admitted source, so this GREEN result cannot be reached honestly. An implementer would either write a test that can never pass or be pushed to add a positive bypass.
- **Task 1 snippet (lines 94–98).** It works on a `publication` passed `originalBudget`, and Task 1 step 1 asks to "Assert actual retained descriptor remains open until exact owned release". A production publication cannot be obtained. If the object is the core, `isHeldPrivatePublication({ ...publication }) === false` is vacuous, because a core handle is false whether or not it is copied.

Line 251 states the general rule (substrate + refusals + unverified schedules). However, each task's RED bullets and snippets do not say which assertions target the production factory (refusal only) and which target the `*-core` module on a real guard. That leaves the GREEN gate ambiguous.

### R1-F005 — Task 1 does not say how HeldPrivatePublication relates to C1's existing retained `createOwnedPublication`, which risks a second, divergent retained-generation engine

Location: Task 1 (lines 56–57, 83–91, 253).

`storage-protection.mjs:1066–1198` already implements a retained, exclusive-created publication with the same operations:

- `snapshot` / `publish(expected, bytes)` (rename-replace with read-back and `publication-unconfirmed` / `alternateName` uncertainty);
- `withdraw(expected)`, `close` and `retainedGeneration`;
- a `busy` mutual-exclusion flag;
- tests at `test/unit/storage-protection.test.mjs:207–420`.

The only differences are the name restriction (`ownedName`) and the lack of a lease/context. Task 1 describes a new producer with near-identical semantics (`replace` instead of `publish`) and a separate `owner-publication-core.mjs`. It never says to generalize, wrap or deliberately not reuse the existing engine.

Failure scenario: two retained-generation implementations drift apart. For example, one closes the old descriptor before rename and the other does not, or their uncertainty-obligation shapes differ. C3's `ownedObligations` (`ownership-election.mjs:644–645`) and Task 4's cleanup then report the two kinds of retained generation inconsistently. A fix to one engine (for example, the Windows sharing path) then misses the other.

### R1-F006 — Quarantine rename can displace a newer generation; the plan forbids overwrite but does not require checking, after the rename, what was actually moved

Location: Shared Interfaces Task 1 (line 57); Task 1 steps 2–3 (lines 88–89); Task 4 step 3 (line 215).

`quarantinePrivateFile` moves `owner.json` to a fresh locator, and the plan correctly says rename is never compare-and-swap. Between the final generation check and the `rename`, a writer that does not cooperate can replace `owner.json`. Such a writer does not hold the election: same-user, not using the lease. The C1 comment at `storage-protection.mjs:854` already says this case "cannot be made safe by lstat alone". The rename then moves the newer generation into quarantine.

The RED list covers "destination collision" and "no new generation is overwritten". It does not cover a newer generation being displaced into quarantine. The plan also does not require Task 4 to check the quarantined file's identity, version and bytes against `expected` before the exclusive create. Without that check, Task 4 can create a new owner while a newer, possibly live, generation sits in quarantine marked as stale evidence. That is the generation theft Task 1's Story Intent forbids.

## Required changes

1. **R1-F001.** Bind the proof to the exact TCP channel. Add to the MAC input:
   - the server-observed `socket.localAddress`/`localPort` and `remoteAddress`/`remotePort`;
   - the expected endpoint port from the observed endpoint record.

   The client compares these with its own socket's `remoteAddress`/`remotePort` and `localAddress`/`localPort` before sending any bearer bytes. State this in the Task 2 contract (line 255) and Shared Interfaces (line 60). Add a Task 2 RED test, `relayed-proof-refused`, with an actual socket: a proxy on a stale port forwards the proof exchange to a genuine server on another port. Assert that the observation is `unknown` and that the proxy receives no bearer bytes.

2. **R1-F002.** Pick one of these and state it in Task 3:
   - (a) do not widen `isAuthenticatedBrokerOwner` in #169; keep `isPortableBrokerOwner` separate, and add `src/protocol/compatibility.mjs` `assertCurrentCleanupOwnership` to the #141 C6 migration map as an async consumer using `(await owner.verify()) === true`; or
   - (b) if delegation stays in Task 3, add `src/protocol/compatibility.mjs` to Task 3 Files. Make the consumer async and await a strict boolean, define the portable owner's `handshake.versions` facts, and add RED tests proving that a genuine portable owner whose `verify()` resolves `false`, or rejects, is refused by the cleanup gate.

3. **R1-F003.** In Global Constraints and in the Task 3 Shared Interface/core contract, state:
   - (i) the maximum bound for a post-completion top-level operation context. For example, the same ≤30000 ms cap per operation, finite deadlines only, and an AbortSignal instance;
   - (ii) how "top-level" is decided at run time. For example, an AsyncLocalStorage marker set by the lifecycle, under which any new context is refused;
   - (iii) the exact baseline invariants Task 3 changes: the C3 core `check()`/`withdraw` closures, production registry budget and assurance revalidation, the guard `operationBudget` captured at `openProtectedRoot`, and `withElectionLease`'s `lease-budget-mismatch`. For each, say that it changes only after genuine completion, and that the existing #168/C1 refusal tests stay unchanged and green before completion.

   Add Task 3 RED tests:
   - release after the original startup deadline, under a fresh top-level context, withdraws the slot and closes the owner descriptor with `outstandingObligations: []`;
   - a context with `deadline: Infinity`, or one beyond the stated bound, is refused;
   - a fresh context minted inside an in-progress operation is refused.

4. **R1-F004.** Retarget positive examples to the explicitly unverified cores:
   - Task 4 snippet: `acquirePortableOwnerCore` with `verified: false`, plus a separate production assertion that `acquirePortableOwner` returns unavailable/indeterminate with `source-class-unavailable` and no owner files created;
   - Task 1 snippet: `createHeldPrivatePublicationCore` on a genuine C1 guard, plus a production assertion that `createHeldPrivatePublication` refuses a non-genuine or copied lease.

   In each task, label every RED bullet as core-on-real-substrate or production-refusal.

5. **R1-F005.** State in Task 1 whether HeldPrivatePublication generalizes C1's `createOwnedPublication` engine (a shared internal retained-generation mechanism parameterized by name class and lease/context) or is deliberately separate. If separate, give the reason, and require one obligation shape for both. Keep the existing `storage-protection.test.mjs` owned-publication tests in Task 1's verification command unchanged.

6. **R1-F006.** Require `quarantinePrivateFile` to re-read the quarantined locator after rename and compare its identity, version and bytes with `expected`, and to return `uncertain` with both locators retained on any mismatch or error. Require Task 4 to refuse owner creation unless the receipt proves the exact expected generation. Add a Task 1 RED test, `displaced-generation-retained`, in which a replacement `owner.json` is swapped in between the final check and the rename.

## Optional suggestions

1. Task 4 drops two explicit details from the original C4 (#141 lines 233 and 238): `boundedOwnershipError` returns `APR_BROKER_STALE`, and the credential lives in `.scratch/peer-review/private/` with the endpoint at `runtime/endpoint.json`. Restate both in Task 4, so the child is complete when read alone. They match `bindOwnerElectionPaths`'s private/runtime sibling rule and the effect-name allowlist (`ownership-election.mjs:393–405`, `473–480`).

2. Task 2 says http-server/http-auth are extended "if required". They must be extended. The route allowlist (`http-server.mjs:147`) admits only `/rpc` and `/wait`, and `authenticateLoopback` requires the bearer and private headers (`http-auth.mjs:33–37`). Say explicitly that the proof route is handled before `authenticate`, that it never reaches `dispatch`, and that it leaves the existing `pending` admission accounting unchanged.

3. A proved socket stays unauthenticated until the first bearer request. #140's 10 s receipt timer, armed at connection, and its 5 s unauthenticated idle timer (`http-server.mjs:124–131`, `264–270`) therefore limit the gap between proof and first RPC. State that a VerifiedOwnerConnection belongs to a single top-level operation, and that a later owner operation re-observes and re-proves rather than reusing a long-lived connection. This fits "connection loss refuses rather than silently reconnecting".

4. The named API `acquirePortableOwner({worktree,paths,reconcile,protection})` (#141 line 79) gains `signal, deadline`. Line 68 says named APIs stay "unchanged" and that added options are producer-owned. State plainly that this is an additive required option and that a missing or invalid signal/deadline refuses with `operation-budget-unproved`, matching `acquireOwnerElection`.

## Decision

revisions-requested
