<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-500bb9bbfb9dce0969d6a8ec51cc55c1"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "docs/superpowers/specs/2026-10-12-190-posix-read-pair-design.md"
artifact_commit: "c46a980c5d6a4514cd99f2a788cf53e50e1e6f2f"
artifact_blob: "578c5cb836069f1418f890ed38551d6fcb4338dc"
artifact_digest: "sha256:ecef3c9d8f1cf440f5f36ba2fec78ba0f730afc10cd1a9d35eaf7005545a48f9"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:a48574a4ad8db94264d52a93564e42e2b4f9f9dc02767b20331305ff31c524de"
  identity_source: "runtime"
started_at: "2026-10-12T14:36:52.496Z"
submitted_at: "2026-10-12T14:39:38.146Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the design at artifact commit `c46a980` against
`src/broker/storage-protection.mjs`: `inspect`, `inspectAncestors`,
`macAclBatch`/`parseMacAclBatchCore`, `inspectWindowsReadPair`,
`openProtectedRoot.verify`, `readObserved` and `matchFile`. I also checked the
callers of `readObserved` (`read`, `readSnapshot`, `remove`, `replace`,
`quarantine` and retained-publication readback) and the diagnostic helpers that
name these functions (`test/helpers/registration-cost-coverage.mjs`,
`test/helpers/selection-scope-operation-report.mjs`).

The direction is sound and bounded. On the POSIX path, `readObserved`
currently runs four complete observations per read: `verify()` before,
`inspect(file)` before, `verify()` after and `matchFile` after. Each one walks
the full ancestry. On macOS, each one also starts its own `/bin/ls -ldne`
(`inspect(root)` puts chain+root in one batch; `inspect(file)` puts
chain+root+file in another). Merging each phase into one walk and, on macOS, one
batch cuts this to two observations and two stock commands per read. Every
existing check is kept. The Windows helper already shows this shape works with
the existing fingerprint, ENOENT and descriptor semantics. Nothing would be
retained between phases, and no public surface changes.

Three things need tightening before adoption:

1. The macOS root ACL policy role inside the single batch is not specified, and
   the parser forces a specific choice.
2. The Linux branch has no stated adoption verification.
3. The design does not say how much of the failing journey's cost this removes,
   or what happens if the journeys still expire.

## Findings

1. **macOS root policy role in the combined batch is underspecified (correctness/precision).**
   Today the root is classified two different ways. `inspect(root, 'directory')`
   passes the root with `ancestor: false`, so it gets the private-leaf policy:
   any positive grant with real rights is refused. `inspect(file, 'file')`
   passes the same root with `ancestor: true`, so it gets the ancestor policy:
   only mutation rights are refused. `parseMacAclBatchCore` refuses duplicate
   paths (`new Set(...).size !== targets.length`), so a single batch must list
   the root exactly once with one flag. The flag must be `ancestor: false`.
   Because the leaf policy is strictly stronger than the ancestor policy, it
   also covers the root's role as the file's ancestor.

   The design says "applying the existing ancestor and private-leaf ACL
   policies". That does not say which policy the root gets, or that the root's
   one parsed rule list feeds both the root observation's `acl` and the file
   ancestry's root `acl`. If the root were passed as `ancestor: true`, the
   pair would still produce identical rule arrays. Fresh foreign `allow read`
   drift would then be caught only indirectly, by the fingerprint comparison
   against the binding. The direct leaf-policy refusal would be lost. Current
   behaviour enforces both.

2. **The Linux branch has no stated adoption verification (test coverage).**
   The adoption check is "actual affected C1 tests on the local macOS host", and
   full suites stay hosted. The Linux pair branch has platform-specific
   behaviour that macOS cannot exercise:
   - `statfs` with the supported-type list, for both the root and the file;
   - `acl = []`;
   - ancestry entries with no `acl` key, which the root fingerprint depends on
     byte-for-byte via `JSON.stringify` key order and key presence.

   A Linux fingerprint mismatch would fail closed by refusing every read. That
   is safe, but it would surface only in hosted runs after adoption. The design
   should make the affected Linux C1 tests (hosted) an explicit adoption gate.
   They should include a direct control that the pair's root fingerprint equals
   the `observeStorageProtection`/`inspect(root)` binding fingerprint, and the
   same substitution and drift cases as macOS.

3. **No baseline, expected saving or decision rule ties the change to the 30000 ms failure (scope/evidence).**
   The design is motivated by installed journeys expiring before broker
   readiness and by the heavy submission regression expiring before its
   generation refusal. However, `readObserved` is only part of the repeated
   POSIX observation cost. `verify()` + `matchFile` remain unchanged in:
   - `createFile` (about four observations, including `effectCheck` repeats);
   - `mutate` lease checks and release;
   - `remove`/`replace` post-read checks;
   - retained-publication `current`/`publish`/`withdraw`;
   - `listOwnedPublications`.

   The design requires before/after diagnostics and stock command counts, but
   only for a local "twenty reads" fixture. It does not state:
   - the expected per-read reduction (4 → 2 complete observations on both POSIX
     platforms, and 4 → 2 `/bin/ls` starts on macOS);
   - how much of the failing journeys' elapsed time, or stock command count,
     comes from `readObserved` today;
   - what the outcome is if the installed journeys still expire after adoption
     (stop and re-scope, versus extending the pair to `verify`+`matchFile`
     sites).

   Without these, the bounded change may be approved and adopted and still
   leave the original failure, with no rule saying which gate comes next.

4. **Diagnostic name sets reference the helper by name (minor maintenance).**
   `registration-cost-coverage.mjs` and `selection-scope-operation-report.mjs`
   have closed sets that include `inspectWindowsReadPair`. If the helper is
   renamed to something platform-neutral (reasonable once it serves POSIX), the
   rows for the new name fall outside the closed `known` set and the projection
   fails. Its `inspect`/`verify` counts also shift on POSIX. Expected deltas are
   computed scoped-vs-unscoped and should still cancel, but that should be
   rechecked, not assumed.

## Required changes

1. State that the macOS combined batch lists each ancestor once with
   `ancestor: true`, the root once with `ancestor: false` (private-leaf policy),
   and the file once with `ancestor: false`. State that the root's single parsed
   rule list is reused unchanged as both the root observation `acl` and the file
   ancestry root-entry `acl`. Add a control where a root-only foreign
   non-mutating allow ACE (e.g. `group:everyone allow read,list,search`) is
   refused by the leaf policy itself, not only by fingerprint mismatch.
2. Add the affected Linux C1 tests on the hosted runner as an explicit adoption
   gate. Include a direct root-fingerprint equality control (pair root
   fingerprint === `inspect(root, 'directory')` fingerprint) on both Linux and
   macOS. Also state that Linux runs `statfs` and `access` for both the root
   (R/W/X) and the file (R/W) in each phase. That is what "both existing stock
   filesystem checks" should say explicitly.
3. Record the expected per-read reduction (4 → 2 complete observations; 4 → 2
   `/bin/ls -ldne` starts on macOS). Commit to measuring the share of the
   failing installed journey's and heavy regression's elapsed time and stock
   command count that comes from `readObserved` before adoption. State the
   decision rule if the journeys still expire after adoption: either stop and
   re-scope under a new design, or name the follow-up scope. Do not leave it to
   be inferred.

## Optional suggestions

1. If the helper is renamed for POSIX use, update the closed name sets in
   `test/helpers/registration-cost-coverage.mjs` and
   `test/helpers/selection-scope-operation-report.mjs` in the same change. Then
   re-run their unit tests so the scoped/unscoped delta expectations
   (`inspect` 30, `inspectAncestors` 30) are confirmed rather than assumed.
2. Say explicitly that the pair calls `inspectAncestors(root, false, budget,
   true)` with the deferral flag set. On macOS that flag also suppresses the
   ancestor-only `ls` batch, which is what makes "one stock command" per phase
   true.
3. Say that the target `lstat`/canonical check runs before the stock query, as
   in the Windows helper. That way a missing file still produces `ENOENT` (after
   a fresh `verify()`), not a nonzero `/bin/ls` exit that would surface as
   `private-file-unproved`.

## Decision

revisions-requested
