[13:45:43]
## Verdict

changes-required

This is a fresh full critique of the round-5 plan bytes. PXPR-007, PXPR-017 and PXPR-018 are resolved, but two new findings are open: PXPR-019 (Medium) and PXPR-020 (High). I re-read the complete plan, the round-4 author disposition and the dependency refresh against the unchanged accepted spec. I relied on the earlier reads of `package.json` (`files` includes `docs/` and `provenance/` but not `evidence/`), `.github/workflows/release.yml` and `.github/workflows/ci.yml` (branch-only push trigger, `upload-artifact@v7` already in use). I verified no hash and executed nothing.

## Disposition of previously open findings

| ID | Disposition | Reason |
|---|---|---|
| PXPR-007 | **Resolved** | The CI path now runs, in order: `validate-producer-context` → `pack-bind` → `publish-registration` upload → `ci-anchor` → `register-key` with `ci-anchors.json` → capture → export → upload → `close-binding`. The manual path now runs: `pack-bind` → reviewed commit R → `pin-manual-registration` → `register-key` with `manual-anchors.json` → capture. The consumer runs `validate-consumer-inputs` → `build-anchors` → process-source verify → `ingest-manual` / `assemble` / `verify-portable-release`, all on the merged `anchors.json`. Archive-versus-payload digest confusion, self-registration and hidden-path upload are each handled. |
| PXPR-017 | **Resolved** | Evidence and adoption authority move to `evidence/portable-runtime/`, which is not in `files`. A packaging test asserts the exclusion, including a red fixture that adds the path to `files`. The ordering C/T/D → R → E → consumer → release is stated, with no tag move and no repack at E. How `release.yml` is bound to those inputs is filed as PXPR-019. |
| PXPR-018 | **Resolved as ownership** | Task 2 now owns `process-source-conformance.mjs`, its schemas, the registered manual procedure and the production loader. Task 4 consumes the receipts and Task 18 reuses them. The scope semantics this creates for user installations are filed as PXPR-020. |

All earlier resolved IDs stay resolved. PXPR-020 is filed as a new ID rather than reopening PXPR-001/016, because the regression comes from the new assurance-scope rule, not the original design.

## Open findings

### PXPR-020 — High (new) — Task 2 / Task 4: proof of a dead broker is unavailable on every real user host, and the parity predicate cannot see it

**Failure:** Task 2 now accepts death only from an "installed-conformance-verified" source. Every user installation will lack that verification:

- **Both proof kinds need a receipt.** This covers a no-such-PID result as well as a creation-stamp mismatch.
- **Receipts are tied to one host.** The runtime loader returns `source-assurance-unknown` for "missing, changed, malformed, unreviewed, foreign-host or stale-scope receipts". Coverage beyond one host is deferred ("if proposed later, needs explicit reviewed conformance scope").
- **Receipts are tied to one package.** Each receipt binds the exact tarball/module hashes, so every release invalidates prior receipts.
- **Only registered hosts can produce them.** Producing one needs the registered manual procedure, with authorized clock, timezone and DST changes and a reviewed registration commit.

**Consequence:** On any machine that has not run that procedure, which is every ordinary user installation on Linux, macOS and Windows, a crashed broker's PID can never be classified dead. With no age takeover and no operator assertion allowed, the worktree is wedged permanently after the first broker crash. That is exactly the regression PXPR-001 closed, now reintroduced through assurance scope.

The Task 4 parity predicate is assessed only on registered conformance hosts that hold receipts, so it would pass while every user installation has stale recovery disabled. That makes the "honest parity predicate" dishonest about user-visible behaviour, and it undercuts the urgent native-removal goal, because the native kernel lock never wedged.

**Required correction:**
1. Define the distribution scope for source assurance now, not "later":
   - a reviewed conformance class keyed by OS family/build range, stock probe path/version and source semantics/precision, not individual host or exact package bytes;
   - the runtime checks the user's host against the class and verifies that the shipped probe/adapter code matches the conformed source contract.
2. Separate the two proof kinds by what they need:
   - **No-such-PID** from a code-validated stock probe result needs no clock-step conformance and should rest on the class-scoped probe contract, not a host receipt. Examples: Linux `/proc/<pid>` returning `ENOENT` with a verified `boot_id`; Windows CIM null from a fixed System32 path; a macOS explicit exit/empty-output contract.
   - **Creation-stamp** proof keeps the clock-step class conformance.
3. Add a parity fixture on a fresh, unregistered install with no receipts. A crash with the broker's PID absent must reclaim; PID reuse must reclaim where the class is conformed, or report the stated limitation. Parity is measured there. Anything still class-unconformed is reported as a user-visible limitation in doctor/help and in the Task 4 acceptance, not hidden behind registered-host passes.

### PXPR-019 — Medium (new) — Task 18: workflow triggers and the release-side bindings to P, E and the report are not executable

**Failure:** The plan's ordering assumes connections between workflows that no workflow definition provides:

1. **No producer is triggered at T.**
   - The CI producer steps live "in `ci.yml`", but `ci.yml` triggers only on `push: branches` and `pull_request`, not tags (`ci.yml:3-7`).
   - No workflow or trigger is named for the "upstream pack job" that packs P once at C/T, nor for the nine producers' run against that P.
2. **The consumer has no defined trigger or inputs.** `portable-release-evidence.yml` lacks:
   - a trigger;
   - inputs for T, E and the producer run ID;
   - the permissions for cross-run artifact access (current workflows have only `contents: read`).
3. **`release.yml` cannot find P, E or the report.**
   - `release.yml` currently packs its own tarball (`release.yml:44-51`), and its `workflow_dispatch` takes only `tag`.
   - The plan says release "consumes the same P/D", the approved E and the consumer report. No input, artifact source or step says how `release.yml` identifies the exact consumer run, report and E. It doesn't say whether `release.yml` downloads P or repacks with a digest comparison.
   - npm/Node version differences between jobs can change tarball bytes, so a repack is not automatically D.

As written, the five-step ordering is prose. `release.yml` could consume a stale or foreign report, or publish a different tarball than the evidence covers.

**Required correction:**
- Name the producer workflow and its trigger (for example, a tag push or dispatch with T), with the upstream pack job and the nine producer jobs.
- Name the consumer's trigger and inputs (`tag`, `evidence_ref` E, `producer_run_id`) and the permissions it needs (`actions: read`).
- Add `release.yml` inputs and steps that:
  - download P and the consumer report from the named run;
  - verify the report binds C/T/D/E;
  - publish P itself, or repack and refuse on any digest ≠ D;
  - run `check-release-activation` against the same E.
- Add red fixtures for a stale report, a foreign run and a repack digest mismatch.

## Gates and ownership re-check

- **Gates 1–15:** mapping is unchanged and complete. Process-source evidence feeds gates 5/7 through Task 2/Task 4 ownership and is reused by Task 18. Gates 2/8/15 carry the Task 5 dependency, and gates 3/10/11/12 carry #30/#34 adoption.
- **Dependency ownership:** #102 runtime/policy goes through Task 5 and `resolvePolicySources`; #30 owns Task 12, #109 owns Tasks 13/14 and #34 owns analytics. No duplicate ownership found.

## Complete open finding set

PXPR-019, PXPR-020.

## Nonblocking advice

1. Task 2's `bind --package .scratch/peer-review/portable-candidate.tgz` command consumes a file that Task 4's test produces. Add an explicit Task 2 pack command for its own candidate, so the Task 2 verifier runs before Task 4 exists.
2. `ci-anchor` and the consumer query the artifact service with `GITHUB_TOKEN`. State `permissions: actions: read` on those jobs, or a missing permission will block every run.
3. The process-source receipt recorded before native removal binds a candidate whose bytes change when Task 4 removes native sources. State that Task 4's parity check recaptures against the native-free candidate, or uses class-scoped assurance per PXPR-020.

## Limits

- This verdict reviews the document only. No workflow, artifact query, clock/timezone change, process probe, pack or release was performed or is implied.
- Whether GitHub Actions supports the cross-run artifact access and `upload-artifact@v7` outputs as described needs confirmation during implementation.
- The digests the author cites are not independently verified here.
