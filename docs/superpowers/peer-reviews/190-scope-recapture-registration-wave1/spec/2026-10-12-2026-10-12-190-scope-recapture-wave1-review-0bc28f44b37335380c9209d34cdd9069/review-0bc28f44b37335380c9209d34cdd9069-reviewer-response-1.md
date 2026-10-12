<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-0bc28f44b37335380c9209d34cdd9069"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave1.md"
artifact_commit: "15907de4a303353ade044da9da8e4f6bf8f26f14"
artifact_blob: "4b8bc9d8f2d66211a26977b45571451cdc76e164"
artifact_digest: "sha256:3e296d261a8ca09c2af66a00a5febb09dc06ce1188402146aca6cc365ce7680a"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:d8b9dc46f94be5bb1f510b528292153cce045bcf34be0c3d3499d43f59a89600"
  identity_source: "runtime"
started_at: "2026-10-12T06:24:13.446Z"
submitted_at: "2026-10-12T06:27:31.857Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The proposed six registrations are conservative and internally consistent with the table, the index and the workflow. Two statements in the authority prose are inaccurate or not checkable as written. Because accepted text becomes pinned immutable authority for the capture step, I request two small wording corrections before acceptance.

What I checked against the working tree at the reviewed artifact commit (read-only file inspection):

- `registration-index.json` lists exactly the six capture IDs and paths named in the artifact JSON, and no others.
- Each registration's `scope.platform`, `build`, `architecture`, `nodeMajor` and `kinds` match its table row.
- All six bind `sourceCommit` `9fe68172d19ce9f217fed42cf466ba5667368464`, contract `sha256:340ece55…dedb25` and inventory `sha256:dae2c976…6a51a5`.
- Tarball digests are `sha256:21331c1d…cdcf2f` for Linux and macOS and `sha256:785b254e…d2fc62` for Windows. These are byte-identical to the earlier accepted 0783554 registrations: `source-32a383…`, `source-75eb2d…` (Linux) and `source-8069f6…` (Windows). This is consistent with the claim that the production package closure did not change and only the preparation path did.
- The four absence registrations have empty `transitions`. Only the two Linux creation registrations (`source-c24791…` Node 24 and `source-f102f7…` Node 26) carry `clock-forward`, `clock-backward`, `timezone` and `dst`. No Windows or macOS registration has creation or transitions.
- Probes are finite and match the prior accepted shapes:
  - Linux: `/proc`, `full-pid-namespace`, `exact-pid-directory-v1`, `procfs-v1`.
  - macOS: `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1`, hash `62c342e1…`.
  - Windows: stock `powershell.exe`, `local-cim-query`, `completed-cim-query-v1`, hash `54b68d39…`. This is identical to the prior Windows Node 24 registration.
- All six public keys and `keyId`s are distinct. There are four distinct `hostId`s, one per published worker (see R1-F001). The Linux host IDs differ from the earlier `sha256:88b178…` host, which is consistent with a fresh hosted runner.
- No registration contains private keys, bindings, raw host UUIDs, SIDs, user paths, credentials or provider handles. The only path is the stock system PowerShell path.
- `.github/workflows/process-source-capture.yml`:
  - It has a `push` trigger for this branch, filtered to the workflow, `test/helpers/process-source-ci-host.mjs` and `src/protocol/process-identity.mjs`. This is consistent with "event push".
  - `strategy.max-parallel: 4` over a six-entry matrix explains why exactly four workers published.
  - The prepare step writes its log to `.scratch/peer-review/source-prepare-diagnostic.log`. That location is ignored by `.gitignore` (`.scratch/peer-review/`), which is consistent with the run 38211337118 correction.
  - The capture step does not load the timing tap.
- `test/helpers/windows-stock-timing.mjs` and `windows-stock-diagnostic-core.mjs` call the original `execFile` with the caller's arguments. They emit only a closed set of fields to stderr: kind, id, elapsed, outcome, timeout, a closed error-code set, killed, signal, stderr-empty and a host-record shape category. No command text, output bytes, UUIDs or SIDs are emitted. This supports the "input-preserving, safe categories" claim for array-argument calls (see R1-F003 for limits).
- Earlier public registrations (`source-32a383…`, `source-75eb2d…`, `source-7bd5b1…`, `source-7fd352…`, `source-8069f6…`, `source-2ee00e…`, `source-eaef93…`) and their `approved-refs/` files are still present. The prior wave review documents are unchanged in the tree.

Verification limits:

- This session's shell was restricted to the two prescribed peer-review commands, and Git use was prohibited. I could not compute SHA-256 or Git blob hashes. I did **not** verify any `blob` or `sha256` value in the artifact JSON, the index's canonical-record digests, or that revision `91432dd` contains these exact bytes.
- I did not access GitHub run 38211666754. I could not verify:
  - its job, attempt or event metadata;
  - which matrix jobs are queued, failed or running;
  - the published producer-freeze lists or their input count;
  - Linux preflight reports;
  - signatures, host-hash derivations or any private evidence.
- I did not re-verify prior run 38205882840 or 38211337118 outcomes, or C1 feasibility results.
- All of these claims are accepted only as stated by the author. The later ordinary finite class review must verify them mechanically, as the artifact itself requires.

## Findings

### R1-F001 — "Each registration binds its distinct actual host hash" is false for the Linux pairs

Location: prose paragraph 4 (counting the opening paragraph as 1), "Each registration binds its distinct actual host hash and protected public signing key…".

The six registrations carry only four host hashes:

- `source-2311c9…` (Linux Node 26 absence) and `source-f102f7…` (Linux Node 26 creation) both bind `sha256:3dee427a…aee4692`.
- `source-73fd05…` (Linux Node 24 absence) and `source-c24791…` (Linux Node 24 creation) both bind `sha256:33d6db92…0358632`.
- Windows `sha256:d1c0d600…` and macOS `sha256:032d6e1b…` are each unique.

This is the expected shape: one Linux worker produces both its absence and its creation registration. The earlier accepted Linux pairs at 0783554 also share host `sha256:88b178…`. Signing keys, by contrast, are distinct across all six.

The sentence as written becomes pinned authority. A later class reviewer who checks it literally would find a contradiction with the records. Worse, a reviewer who trusts it might fail to notice an *unexpected* host-hash collision between different workers. The prior accepted wording ("Each registration retains its own exact package/host/key/probe tuple") was accurate. The new wording is not.

### R1-F002 — The four included and two excluded workers, and the run's completion state, are not named

Location: paragraph 1 ("This wave covers 4 actual published workers only. Queued, missing and failed workers grant no coverage.") and paragraph 3.

The table implies the included workers: Linux Node 24, Linux Node 26, macOS Node 24 and Windows Node 24. The text never names the excluded ones, macOS Node 26 and Windows Node 26. It also does not say what state they are in for run 38211666754, or that the run is not complete or green.

The earlier selection-scope waves named their exclusions explicitly. For example, wave 1 said "queued/missing Windows Node 26 and macOS workers are excluded, never inferred", and wave 3 said "the complete run is not green".

This matters here specifically:

- The workflow's `max-parallel: 4` means the two remaining matrix entries cannot start until one of the four approval-blocked capture jobs finishes.
- The diagnostic preparation change in paragraph 3 was motivated by the Windows Node 26 preparation failure in run 38205882840. That path has therefore not yet been exercised in this run.

Without naming the excluded workers, a reader could take paragraph 3 as implying that the Windows Node 26 preparation problem is resolved. A later class reviewer also cannot mechanically check the "4 actual published workers" statement against named jobs.

## Required changes

1. (R1-F001) Replace "Each registration binds its distinct actual host hash and protected public signing key" with an accurate statement. For example: "Each registration binds its publishing worker's actual host hash and its own distinct protected public signing key; each Linux worker's absence and creation registrations share that worker's host hash (Node 24 `sha256:33d6db92…`, Node 26 `sha256:3dee427a…`), and no host hash is shared across workers."
2. (R1-F002) In paragraph 1, name the four included workers and the two excluded workers (macOS Node 26, Windows Node 26), and state their actual status in run 38211666754 at the time of writing (for example, queued behind `max-parallel: 4`). State that the run is not complete or green. State that Windows Node 26 preparation under the corrected diagnostic path remains unexercised and unproved by this wave, and that the excluded workers require their own separate registration wave.

## Optional suggestions

### R1-F003 — State the timing tap's actual scope and failure mode

Location: paragraph 3 ("…through an input-preserving stock-exec tap").

The tap file is named `windows-stock-timing.mjs`, but the workflow loads it with `--import` on **all** platforms for the `prepare` step only. Its `traced()` wrapper also reads `args?.indexOf(...)` before delegating. A call shaped `execFile(file, options, cb)` or `execFile(file, cb)`, with no argument array, would therefore throw `TypeError` inside the tap instead of reaching the original. This fails closed: preparation would refuse rather than produce a different registration. All four published workers evidently completed preparation, so it did not trigger here. Even so, "input-preserving" holds only for array-argument calls.

In addition, `stderrEmpty` reports `false` for Buffer-encoded output even when it is empty. That is a diagnostic accuracy limit only.

Consider stating three things:

- the tap is loaded on every OS during preparation only, and never during capture;
- it wraps only callback and promisified `execFile`;
- the diagnostic log is also uploaded in the `source-controls-*` CI artifact, and its content is limited to the closed field set above.

### R1-F004 — Restate the package-equality and freeze-count facts that prior waves recorded

Earlier waves explicitly recorded several facts that this artifact leaves to the reader:

- Windows and Linux tarball hashes differ, while inventory and contract agree.
- The producer-freeze list size (894 tracked inputs at 0783554).

Consider adding the following:

- Tarball, inventory and contract digests are byte-identical to the accepted 0783554 registrations for the same platforms. This directly supports "changes neither production classifier…" in paragraph 3.
- The actual producer-freeze input count at 9fe6817. It should differ from 894 if the preparation helpers were added or changed after 0783554.

This makes the frozen-tree claim in paragraph 5 ("The actual published producer-freeze list is mechanically checked…") checkable by number, not only by assertion.

## Decision

revisions-requested
