<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-ff812d33b79e68421444081ae37aed02"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/plans/2026-10-06-141-protected-storage-ownership-decomposition.md"
artifact_commit: "1cc113f867108d4b5132d1468c9ffa2d37348e90"
artifact_blob: "ce94d89a7219cfef87464fee3a905d55ecd0e7bb"
artifact_digest: "sha256:8368455f095cd552029021b9b8ad82447b78b20e92576ed6274d95a0cf14ce25"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:db094b09316e5c19e7a52a769b9731a6d2a4a2cec440393187c13b4a8ec89c4a"
  identity_source: "runtime"
started_at: "2026-10-07T03:35:58.711Z"
submitted_at: "2026-10-07T03:38:30.123Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004","R1-F005"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the full decomposition plan (`docs/superpowers/plans/2026-10-06-141-protected-storage-ownership-decomposition.md`, 329 lines). This session may run only the join and submit commands, so I could not hash the working-tree bytes against the bound digest `sha256:8368455f…ce25` or use Git. I rely on the runtime's artifact binding for that.

I checked the plan against these sources:

- the normative source section, `### Task 2: Protected Storage and Exclusive Ownership` (lines 175–269), in `docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md`;
- the `Native Production Consumer Migration Map` (lines 271–286) in the same plan;
- the shared `ElectionOutcome`/`ProtectionReceipt`/`Owner` typedefs (line 100) and the Task ordering paragraph (line 88) in that plan;
- the current `src/` and `bin/` tree, searched for remaining native-platform callers (`platformSecurity`, `inspectPlatformSecurity`, `openPrivateDirectory`, `acquireExclusive`, `peerUser`, `loadBinding`).

The decomposition is mostly faithful:

- It keeps the original named APIs, typedef shapes, global numeric bounds (30000 ms, at most 3 sharing attempts, 32-byte credentials) and refusal semantics unchanged.
- It splits along defensible seams: protection, then source assurance, then election, then owner, then class capture, then consumer composition.
- Each child has its own RED/GREEN command, and the cumulative #141 boundary keeps whole-Task2 acceptance, real per-target evidence and class adoption at the root. A child cannot claim them from fixtures.
- The Task2/Task5/Task6 source-contract freeze rule (line 300) correctly closes the "integration edit silently invalidates an accepted class" gap.
- Review focus items 1–4 each map to a concrete RED bullet in their owning child.

Two problems block acceptance. First, the consumer migration inventory in Task 6 is stale against the current tree. Several native callers delivered by #102, and the peer-UID path in the service core, are not owned by any child (R1-F001). This goes directly to review focus 5 and to Acceptance Criterion 1. Second, the plan reuses bare "TaskN" labels for both its own children and #107's numbered tasks, and several sentences become ambiguous or wrong as a result (R1-F002).

There are also three smaller problems:

- The plan gives no per-child size or estimate, so it never shows that the split resolves the must-split classification (R1-F003).
- Task 3's election interface is not designed for the provider-resource and manual-fence reuse that Task 6 depends on (R1-F004).
- A few specific source obligations were dropped or left without an owner (R1-F005).

## Findings

### R1-F001 — Task 6's consumer inventory omits current native-platform callers delivered by #102 and the service/IPC peer-UID path

Location: Task 6 `Implementation Scope` Files (line 298) and Interfaces (line 300); the `Requirement coverage` row "Every original native consumer migration row | Task6 using Tasks1–4" (line 91); Acceptance Criterion 1 (line 19); Review focus 5 (line 71).

The source map (line 273) says: "Task4 statically audits the complete src/bin import graph … any new consumer must be added here before native removal." The decomposition limits Task 6 to "every original native consumer". Its Files list covers `platform`, `ownership`, `paths`, `identity`, `client`/`client-core`, `provider-resources`, `startup/runtime` and its core, `config/setup` and its core, and `bin/peer-review-broker.mjs`.

The current tree has further native callers that are in neither the original map nor any child's file list:

- `src/startup/authority-fence.mjs:109` calls `platformSecurity().openPrivateDirectory(parent)`.
- `src/config/runtime-selection-core.mjs:15,64,127,162,280,293` injects `platformSecurity` and calls `ctx.native.openPrivateDirectory`.
- `src/config/primary-admission.mjs:37,50` calls `openPrivateDirectory(directory)` and `openPrivateDirectory(lock, { exclusive: true })`, which is an exclusive native lock.
- `src/config/primary-maintenance.mjs:86,107,226` and `src/config/primary-authority.mjs:128` call `openPrivateDirectory`.
- `src/cli/run-core.mjs:41,72,4739,5001` calls `platformSecurity(...)` and `inspectPlatformSecurity()`. The map names `cli/run.mjs`, but the code is now in `run-core.mjs`.
- `src/broker/service-core.mjs:101` and `src/broker/ipc.mjs:147,187` still call `platform.peerUser(connection)` and `openPrivateDirectory`. The map assigns "no fabricated peerUser" to the #107 Task1/Task2 pair. #140 (Task1) is complete, but `service-core.mjs`, `service.mjs` and `ipc.mjs` do not appear in any child of this plan.

All of these are synchronous calls into the native handle API. Task 6 converts `platform.mjs` to an async portable factory and forbids "a renamed sync method backed by the native loader" (line 303). These #102 authority paths would then do one of three things:

- keep calling a native compatibility method, which violates line 57 ("New portable code must not call a native compatibility method");
- break when the factory changes shape;
- fall back to the native or old runtime, which is exactly what review focus 5 requires to fail closed.

`primary-admission.mjs` also takes its own exclusive lock outside the bounded election. That is a second mutual-exclusion primitive the plan does not reconcile with "there is no second stale-reclaim lock" (line 178). It may be a different resource, but the plan has to say so.

Root #141 is also told to "verify every original checklist/migration-map obligation" (line 328). A root that does only that would pass while these callers remain native. #107 Task4's later static audit would then fail native removal for consumers that no #141 child owned.

### R1-F002 — Bare "TaskN" labels collide between this plan's children and #107's numbered tasks

Location: Global Constraints (lines 57–58); Task 6 (line 307); Task 5 Interfaces (line 255); Shared interfaces (line 75); Requirement coverage (lines 85–94).

Inside this plan, Tasks 1–6 are the six #141 children: Task 3 is the election and Task 4 is portable owners. Several sentences instead use #107's numbering:

- Line 58: "Task2 owns basic broker death/reclaim and source classes; Task3 owns genuine epoch/descendant conformance; Task17 owns …". Here Task2 means #107 Task2, which is #141 itself. Task3 means #107 Task3 (epoch/descendant). Locally, though, child Task2 is source assurance and child Task3 is election. Read locally, the sentence says the election child owns descendant conformance.
- Line 307: "No final native-free package claim before Task4 closure". This means #107 Task4 (binary-free package). Locally it reads as child Task 4 (portable owners), which would make the gate fire after the wrong unit.
- Line 255: "driver remains independent of #107 Tasks3/18" is correctly prefixed. Line 57 ("#107 Task4") is also correctly prefixed. The plan is inconsistent within itself.

Line 75 and the coverage table use local numbering throughout. Child issues inherit these sentences, so an implementer or reviewer of a child can misread which unit owns an obligation or gate.

### R1-F003 — No per-child size or estimate shows that the split resolves the must-split classification

Location: Context (line 26); Plan Metadata (lines 30–32); each child's `Implementation Scope`.

The plan exists because native decompose-check classified #141 as must-split: 33 hours is over the 24-hour threshold, and detailed estimation gives 46 hours. The plan correctly refuses to cut the estimate. However, it gives no size or estimate for any of the six children, and no allocation of the 46 hours across them.

A reviewer therefore cannot check that each child is under the threshold, or that the parts add up to the whole. Child Task 5 (registered captures, authorized clock/timezone/DST transitions on manual hosts, ordinary class review, ledger promotion) and child Task 6 (complete consumer migration, worse once R1-F001 is fixed, plus real multi-OS and fresh-install journeys) both look large enough that they could each exceed 24 hours on their own. If one does, the decomposition fails its own purpose, and the next refine step will hit the same must-split classification.

### R1-F004 — The election interface in Task 3 is not specified for provider-resource and manual-fence reuse that Task 6 requires

Location: Task 3 Interfaces (line 178) and RED bullet (line 180); Task 6 bullet 3 (line 304); migration map rows for `provider-resources.mjs` and `fenceManualRecovery` (source lines 280–281).

Task 6 requires two things:

- a "resource-specific bounded election through the same algorithm" for provider-exclusive resources, using exact session/nonce identity;
- a manual fence that "retains the election across registry/wake/manual-launch reconciliation and durable suspension".

Task 3 produces only `acquireOwnerElection({paths,…})`, and every RED schedule it lists concerns the broker owner. The plan does not say whether:

- elections can be keyed per protected resource directory, so a provider-resource election and the owner election do not contend on the same slot set;
- a held owner lease can be lent to a manual-fence transaction, or whether the fence opens a nested election (nesting would conflict with "Pass the original signal/absolute monotonic deadline through every nested operation", and possibly with the single-lease rule).

Under strict sequential execution, Task 3 will be reviewed and closed before Task 6 finds that its API cannot express these cases. That would force a reopen, or an ad hoc second primitive in Task 6, which is what line 178 forbids.

### R1-F005 — Several specific source obligations were dropped or left without an owner

Location: Task 1 (lines 113–117); Task 5 capture bullet (line 259); Global Constraints (line 56); Task 4 (line 224).

Compared line by line against source Task2, these items have no explicit owner:

1. **Windows elevated vs non-elevated creation.** The source says (line 212): "Elevated-created owner may be Administrators when current user membership and effective rights are verified; owner-SID equality alone is insufficient … Test real elevated/non-elevated Windows creation". Child Task 1 says only "recorded SYSTEM/Administrators allowances only under the accepted membership rule". The coverage table assigns this to "Tasks1 and6", but neither child has a RED or real-OS bullet for an Administrators-owned descriptor created while elevated, or for the owner-SID-only false positive.
2. **Windows probe hardening for ACL reads.** The source says (line 212): "fixed System32 WindowsPowerShell and structured Get-Acl -LiteralPath arguments, no PATH lookup/interpolation". Task 1's phrase "fixed stock probes with data-only path inputs" is close, but it does not pin `-LiteralPath`, which is the concrete wildcard and injection control.
3. **Linux boot_id during capture.** The source says (line 218): "Linux records kernel boot_id before/after without asserting Task3 reboot/descendant proof". This is missing from child Task 5's capture bullet.
4. **Credential and endpoint layout.** The source says (line 222): "Random32-byte credential in `.scratch/peer-review/private/`; endpoint `runtime/endpoint.json` includes fingerprint/instance/port/digest/heartbeat, never secret." Global Constraints and Task 4 keep the secrecy property. No child owns creating the credential, the private path, or the exact endpoint record fields. The current `ownership.mjs:42–43` generates `instance_id`/`nonce` but has no portable credential file.
5. **The `classes/<class_id>.json` evidence path.** The source names it, but Task 5's Files list collapses it to "bounded registrations/classes/capture receipts". This is minor, but the exact path is what the shipped-ledger promotion and the Task4 inventory audit check.

## Required changes

1. (R1-F001) Replace "every original native consumer" in Task 6 with an inventory taken from the current tree at Plan time, re-derived at child Develop entry, and list every current caller:
   - `startup/authority-fence.mjs`;
   - `config/runtime-selection-core.mjs`, `primary-admission.mjs`, `primary-maintenance.mjs` and `primary-authority.mjs`;
   - `cli/run-core.mjs`;
   - `broker/service-core.mjs`/`service.mjs`/`ipc.mjs` (peerUser).

   For each caller, either add it to a named child's Files list with its portable replacement, or record an explicit owner disposition outside #141 that names the issue that owns it and the gate it blocks. Say explicitly how `primary-admission.mjs`'s exclusive lock relates to the bounded election: it is either migrated onto it or documented as a separate, non-broker resource.

   Add a Task 6 RED step that statically walks the `src`/`bin` import graph and fails when any module still reaches `platformSecurity`, `inspectPlatformSecurity` or `peerUser` through a portable path. Have root #141 check that inventory, not only the original map rows.
2. (R1-F002) Give every task reference an explicit namespace, for example "child C1–C6" for this plan's units and "#107 TaskN" for the source plan. At minimum, fix lines 58 and 307, and add a single sentence stating the convention.
3. (R1-F003) Add a size and hour estimate for each child, allocated from the 46-hour detailed estimate without reducing it. Show that each child fits under the decomposition threshold. If child Task 5 or Task 6 does not fit, split it further, for example Task 6 into consumer migration and installed/multi-OS journeys.
4. (R1-F004) Extend Task 3's Interfaces and RED list:
   - the election is parameterized by protected election root/resource key, so owner and per-resource elections are independent;
   - a won lease can scope a manual-fence transaction without a nested election or a renewed deadline;
   - a RED case shows that a provider-resource election and an owner election in the same worktree neither block nor steal from each other.
5. (R1-F005) Make these additions:
   - In Task 1, add RED and real-Windows bullets for elevated Administrators-owned creation with verified membership/effective rights, and an owner-SID-equality-only refusal. Also pin `System32\WindowsPowerShell` plus `Get-Acl -LiteralPath`, with no PATH lookup.
   - In Task 5's capture bullet, add the Linux before/after boot_id record (with no #107 Task3 claim).
   - Assign the 32-byte credential under `.scratch/peer-review/private/` and the `runtime/endpoint.json` field set (fingerprint/instance/port/digest/heartbeat, no secret, credential digest redacted from tooling) to a named child, presumably Task 4's publish, with a RED check that the endpoint and tooling output contain neither the credential nor its digest.
   - Name `evidence/portable-runtime/process-source/classes/<class_id>.json` in Task 5's Files list.

## Optional suggestions

1. The Task 6 code sample (lines 310–318) puts `assert.equal(assurance.absence.status, 'unavailable')` right after a production `owner.publish()` sequence. The comment says this is a separate negative fixture, but the two run together as one snippet, which suggests that production composition expects unavailable absence. Split it into two labelled snippets: production composition, and the negative unaccepted-class fixture.
2. Child Task 4's own verification already includes `test/unit/ownership-election.test.mjs`. Consider adding `test/unit/storage-protection.test.mjs` to Task 6's focused command as well. Task 6 is where protection is first composed into real bootstrap, so a regression there would otherwise surface only at the root rerun.
3. Child Task 5 depends on human-authorized clock transitions on registered hosts and on ordinary class review. Consider saying explicitly whether Task 6's non-class work (consumer migration, HTTP wiring) may proceed in Develop while Task 5 is blocked waiting for real inputs. Alternatively, confirm that strict sequencing intentionally stalls Task 6 until then, so the schedule risk is visible.

## Decision

revisions-requested
