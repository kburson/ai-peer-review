[13:19:53]
## Verdict

changes-required

This is a fresh full critique of the round-4 plan bytes. PXPR-015 and PXPR-016 are resolved. PXPR-007 is narrowed to a mismatch between the described anchor flow and the commands, and there are two new findings. I re-read the complete plan, the round-3 author disposition and the dependency refresh against the unchanged accepted spec. I also used Read to check `package.json` (`files`) and `.github/workflows/release.yml` from earlier reads. I verified no hash and executed nothing.

## Disposition of previously open findings

| ID | Disposition | Reason |
|---|---|---|
| PXPR-007 | **Still open (narrowed)** | Rows now declare `producer_class` (CI vs manual host) and required evidence kinds. Manual-host ingestion, the named consumer job (`assemble-portable-release-evidence`) and a separate registration anchor are specified. What remains is that the described anchor flow and the listed commands disagree in two places (below). |
| PXPR-015 | **Resolved** | Option (a) was chosen. `check-release-activation.mjs` runs in `release.yml` before publish, matching-artifact verification or release creation. It fails closed when the Task 5 checker or record is missing. A red test shows a signed tag alone cannot bypass it. Task 4 lands on the normal governed integration branch, and the consequence that releases are held until adoption is stated. "Controlled candidate" is now defined. |
| PXPR-016 | **Resolved** | Process-creation-time proof no longer needs boot proof, but each source must pass conformance first. Equal-within-precision results and unchanged-process clock-step negatives are classified as live/unknown. Linux start ticks stay tied to the boot. The sealed record keeps source and precision provenance, and a mismatch discharges only the original identity. The Task 4 parity predicate now reports `parity=blocked` rather than claiming native equivalence. Who produces that conformance, and when, is filed as new finding PXPR-018. |

PXPR-001/002/003/004/005/006/008/009/010/011/012/013/014 stay resolved; nothing justifies reopening them.

## Open findings

### PXPR-007 — Medium — Task 3 / Task 18: the anchor commands do not match the described flow

**Failures:**

1. **The CI `register-key` input contradicts the CI anchor design.**
   - Both `register-key` command lines (Task 3 and Task 18) pass `--anchors provenance/portable-runtime/registration-index.json`.
   - For CI rows, the plan says `register-key` validates a "separate local anchor view" built from the upload step's immutable artifact ID and digest receipt. A CI job cannot commit a registration into that committed index mid-run.
   - No listed command or step produces the local CI anchor view or names its path. The registration-artifact publish step (for example, `actions/upload-artifact` outputs) is also not shown.
2. **The consumer verifies against an index without CI registrations.**
   - The consumer job is said to "rebuild" the CI portion of the anchors from authenticated artifact receipts and merge it with the manual portion checked out at the approved commit.
   - But `ingest-manual`, `assemble` and `verify-portable-release` all pass the committed `registration-index.json` directly. No command builds the merged anchor file. As listed, verification would run against an index that contains no CI registrations.
3. **The manual registration review is not a listed step.**
   - For manual hosts, a reviewed commit must pin the registration before `register-key` and capture.
   - The command blocks run `pack-bind` and then `register-key` back to back, with no listed step for submitting and approving the registration candidate. That leaves the governance step implicit.

**Required correction:**
- Give each producer class its own `register-key` invocation:
  - CI uses `--anchors <local CI anchor view>`, produced by a named step from the upload outputs;
  - manual hosts use the committed index at a pinned revision.
- Add an explicit consumer command (for example, `conformance-driver build-anchors --manual-index … --ci-receipts … --output .scratch/peer-review/anchors.json`), and pass its output to `ingest-manual`, `assemble` and `verify-portable-release`.
- List the manual-registration review/commit step between `pack-bind` and `register-key`, with its output: the pinned commit reference.

### PXPR-017 — Medium (new) — Task 18: the packaged `provenance/` directory makes the package digest circular

**Failure:** `package.json` `files` publishes `provenance/` (`package.json:25`). Task 18 commits manual registrations, `registration-index.json` and manual-host bundles under `provenance/portable-runtime/`, all of which bind one expected release tarball digest. That creates a circle:

- packing from any commit that contains that evidence produces a different tarball, so its digest no longer matches the registered one;
- `release.yml` packs from the tagged commit and compares digests (`release.yml:44-62`).

Release can then succeed only if the tag points to a commit earlier than the evidence commits, and that ordering is never stated. Otherwise the activation and evidence gates can never match the published artifact.

**Required correction:** Choose one:
- exclude `provenance/portable-runtime/` from published `files`, and have the packaging inventory test assert it is excluded; or
- store the evidence outside packaged paths.

Then state the ordering: the tag/pack commit, then evidence commits, then the consumer report bound to the tag's tarball digest that `release.yml` consumes.

### PXPR-018 — Medium (new) — Task 2/Task 4: nobody produces the conformance the parity predicate needs, at the time it is needed

**Failure:** Task 2's death classification accepts only "installed-conformance-verified" sources: no-such-PID results and recorded-at-creation stamps, the latter needing a live clock step on an unchanged process. Task 4's parity predicate needs that conformance on Ubuntu, macOS and Windows before native retirement, and says Tasks 1/2/4 are independent of Task 3.

The only named producer of process-creation-source conformance is Task 18's manual-host rows, using the Task 3 driver. Task 2 lists only mocked fixtures for these cases. So either:
- Task 4 silently depends on the Task 3/Task 18 infrastructure, contradicting the stated independence and order; or
- parity is assessed without a defined, executable conformance procedure.

Nothing says whether the clock-step source tests are CI-executable or manual. GitHub macOS and Windows runners have admin and sudo rights, so a stepped-clock check is plausibly executable in CI, but that is unverified.

**Required correction:**
- Give Task 2 (or Task 4) an owned, executable source-conformance procedure: a script plus a CI job, or a registered manual step. It must cover:
  - no-such-PID result validation;
  - a creation-stamp stability check under clock step and timezone/DST change, on a live unchanged process.
- State whether the procedure runs in CI or on a manual host, and its output artifact, which the parity predicate consumes.
- Make the Task 18 manual-host rows reuse it rather than introduce it.

## Gates and ownership re-check

- **Gates 1–15:** mapping is unchanged and complete. Gates 2/8/15 carry the Task 5/Task 7 dependency, and gates 3/10/11/12 carry #30/#34 adoption.
- **Ownership:** #102 adoption goes through the Task 5 `ActivationBinding` and `resolvePolicySources`. #109 owns Tasks 13/14 and #30 owns Task 12 evidence; no duplicate ownership found.

## Complete open finding set

PXPR-007, PXPR-017, PXPR-018.

## Nonblocking advice

1. The release gate consumes the "tagged runtime-contract-adoption record" at `test/fixtures/runtime-contract-adoption.json`. Consider moving the authoritative adopted record out of `test/fixtures/` into a non-test provenance path, also excluded from the package per PXPR-017, so a test fixture never doubles as release authority.
2. A clock step on hosted runners can be reverted by time sync mid-test. Have the source-conformance procedure record the observed offset before and after and treat a reverted step as inconclusive, consistent with the "inconclusive cannot pass" rule in Task 1.
3. While Task 5 is pending, all releases from the integration branch are held, so plan a hotfix path for v0.4 users: tag from a pre-Task 4 commit using that commit's workflow, as the plan implies. Stating it explicitly would help.

## Limits

- This verdict reviews the document only. No workflow, artifact upload, registration, reboot, clock change, provider run or pack was performed or is implied.
- Whether `actions/upload-artifact` exposes artifact ID/digest outputs, and whether hosted runners permit clock steps, is platform knowledge that needs confirmation during implementation.
- I did not verify any digest cited by the author.
