<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-63524a58958ba43d0773b358b50161ad"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/190-current-wave6.md"
artifact_commit: "d12322a53de877676b3f7094479bd681b9c59cc0"
artifact_blob: "2b12948280ab7d0d6d7334fc2884f8849537d2bf"
artifact_digest: "sha256:953f50236d5e8771a22014699176bfc45643594585c6e4a3d3dfd57e6752b11a"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:ac10bc18f74d831ae576744e4c25b2c0ec26942b7debaeb5dca4fa8da06645b0"
  identity_source: "runtime"
started_at: "2026-10-11T02:58:29.237Z"
submitted_at: "2026-10-11T03:00:19.098Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed `190-current-wave6.md`, a capture-only registration review covering 6 registrations from 4 hosted workers (run 38106108578, attempt 1, source `7d4223f`), together with the registration index it pins at revision `d8ee605`. I read every referenced public registration and the index from the working tree, then checked them against the registration validator in `test/live/process-source/records.mjs` (`validateProcessSourceRegistration`, `validateScope`, `canonicalProcessSourceBytes`), the current ledger at `src/protocol/process-source-contracts.json`, every earlier registration under `evidence/portable-runtime/process-source/registrations/`, and the wave5 registration review used as a template. I also read the two covered source changes, `src/startup/runtime-inventory.mjs` (the membership set and the fast path that re-stats identities) and `src/broker/storage-protection.mjs` (Windows `JavaScriptSerializer`).

What I verified:

- **Table agrees with blobs.** All six registrations match the subject table on captureId, platform, build, architecture, Node major, and capability. The two Linux creation registrations (`5df7c494…` on Node 24 and `d7d98a80…` on Node 26) each list exactly the four transitions `clock-forward`, `clock-backward`, `timezone`, and `dst`. The four absence registrations have empty `transitions`, as the validator requires.
- **Four workers, six captures.** The hostIds form exactly four groups: `c98070aa…` covers Linux Node 24 absence and creation, `c035f6c0…` covers Linux Node 26 absence and creation, `c8685c3c…` is win32, and `e24ae172…` is darwin. That matches "4 genuine GitHub hosted workers". None of these four hostIds appears in any earlier registration. Each capture has its own `publicKey`/`keyId`, so no key is reused.
- **Package pins agree.** All six registrations pin `sourceCommit` `7d4223faf123716406c78b4fa9d0ffa553f4c73c`, contract `sha256:424f35d0…`, and inventory `sha256:262ecbb6…`. The five Linux/darwin captures share tarball `ebfb15c0…`; Windows has a different tarball (`030619…`). That pattern matches every earlier wave, where Windows captures always carried their own tarball digest (`55d4…`, `89bc…`, `d794…`, `52dd…`) while the inventory digest stayed shared. So it is consistent with precedent, not a new inconsistency.
- **Probe scope is fixed, not widened.** The probe path, visibility, and errorContract for each platform equal the fixed triples in `validateScope`. Linux uses `procfs-v1`. The win32 probe version `sha256:54b68d39…` and the darwin probe version `sha256:62c342e1…` equal the versions already pinned for the same build in the accepted ledger classes. Builds `6.17.0-1022-azure`, `10.0.26100`, and `25.6.0`, and the x64/arm64 architectures, match the existing ledger scopes. Nothing is widened.
- **Index covers exactly the subject.** `registration-index.json` lists exactly these six captureIds, in sorted order, with matching paths. Its `digest` values differ from the subject's raw-file `sha256` values. That is expected: the index stores the canonical-record digest (`processSourceRecordDigest`, which sorts keys and emits compact JSON), while the subject pins raw-blob sha256 and git blob ids. The two are different quantities and are not expected to be equal.
- **Contract separation holds.** `424f35d0…` does not appear anywhere in the ledger. All accepted ledger classes are on `505bc7fe…` or `bf401a6e…`, and the `524b…` material exists only in historical receipts. The new bytes cannot be admitted under any existing class, which matches the subject's claim.
- **Provenance chain is coherent.** Revision `d8ee605` is the commit named "Pin six genuine current-contract registrations from four hosted workers". The source `7d4223f` is the commit that reduces stock observation overhead, which matches the covered-change description. The artifact commit `d12322a` follows both.
- **Covered source changes match their description.** In `runtime-inventory.mjs`, `declaredPaths` is a `Set` rebuilt from the authenticated entries on every verification, both in the fast path (L158) and the full path (L223). The fast path still freshly `lstat`s every entry, directory, link, and the manifest, before and after. `assertRuntimeDependencyClosure` still re-reads metadata through `stableBytes`. No permission, principal, or filesystem observation is cached. In `storage-protection.mjs`, Windows ACL inspection loads the stock `System.Web.Extensions` `JavaScriptSerializer` and still queries `GetAccessControl` freshly for each path. I saw no deadline renewal, native build, or policy widening in what I read.
- **Clock-control authorization.** The clock-procedure authorization text is unchanged from the wave5 text and is limited to the declared Linux creation registrations. Windows and macOS remain absence-only.
- **No secrets.** The registrations contain only public SPKI keys, key ids, host-id hashes, and digests. I found no private binding, signing key, credential, or provider handle.

Verification limits, stated plainly: this reviewer session could not run commands other than the two prescribed peer-review commands, so I did not mechanically recompute the git blob ids or raw sha256 values in the JSON block, the canonical index digests, or the keyId derivation from each public key. I also had no access to the hosted run, its worker logs, or the producer freeze lists, so the claims about worker provenance, Linux preflight metadata, and frozen producer inputs rest on the mechanical import checks the subject describes. Those checks, and the final class review, must still enforce them. I found no textual or structural inconsistency that would contradict the pinned values.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The first paragraph says only that "Historical 524b and bf401a6e classes remain preserved and cannot admit these changed bytes". The accepted classes most relevant here are the eight `505bc7fe…` classes now in the ledger, and paragraph 3 does list all three families. Adding `505bc7fe` to the first-paragraph sentence would keep the summary sentence from understating which classes are excluded.
2. This wave registers darwin and win32 only on Node 24. The prior 505bc7fe ledger had Node 26 absence classes for both platforms. Consider stating explicitly that darwin/Node 26 and win32/Node 26 are not covered for contract `424f35d0…` (queued or missing workers), so that a later finite class approval cannot be read as continuing the earlier Node 26 coverage under the new contract.

## Decision

accepted
