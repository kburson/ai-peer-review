# #170 refreshed source capture registrations, first wave

<!-- cspell:words ioreg sysctl Chrony -->

Review the exact six immutable registrations and index below for source Q d50e64f9f778f70d4346d00d2e63d645c9e0edc3, authenticated hosted run 37741411472 attempt 1. All carry the changed production source contract sha256:524b96e3e80bc4f448713ffaa1ea2a2f3f0ae8ec50722cb9072926b981690ae8. Earlier 9a9c7b captures and approvals remain historical and cannot approve these bytes.

The first four disposable workers completed actual candidate pack/bind and public registration publication: Linux Node 24 and 26 each produced separate absence and creation candidates; Windows Node 24 and Darwin Node 24 each produced absence only. The other Windows/macOS Node 26 workers are queued behind this bounded four-worker wave and are excluded from this index. Actual artifact worker/run/attempt/Q/Node/package fields were checked; private signing keys and bindings were not uploaded.

For both Linux workers, the actual CI-only prerequisite controller disabled time synchronization and waited for observed service convergence under its original deadline, performed a real two-second UTC adjustment, observed the offset, restored the original UTC, exact configured zone and NTP state, and independently verified restoration before packing or registration. Their public worker metadata reports privilege-and-restoration-observed and restoration verified; it remains unverified data rather than class admission. Only those exact disposable Linux hosts may perform the expressly authorized driver-supervised clock-forward, clock-backward, timezone and DST transitions declared by their creation registrations, retaining the unchanged nonce child, sustained windows, original finite deadlines, direct kernel boot ID and independently verified final system/child cleanup. This approval authorizes no ordinary user-host clock change.

The exact Linux session mutations authorized here are: disable NTP for the session; set the baseline zone to America/New_York; step clock-forward by +90 seconds and clock-backward by -90 seconds relative to the baseline; change timezone from America/New_York to America/Detroit while preserving the current offset and DST state; change DST by jumping wall time to 15 January or 15 July at 12:00 UTC in the baseline year, choosing the opposite DST state; restore the baseline time and zone after every transition; and restore the originally observed UTC, exact configured zone and NTP state at the end. The timezone transition proves zone identity change only. UTC offset/DST change is exercised by the combined seasonal wall-clock jump, not an isolated offset step or a fixed-instant DST boundary.

The signed creation receipt proves transition restoration to its capture baseline (America/New_York with NTP disabled). Final restoration to the original host UTC, zone and NTP state is separately recorded in the public host-control.json after the supervisor finish method verifies it. Class review must validate both artifacts and the authentic successful worker job before admission.

The worker frozen-path check covers only its declared PRODUCERS list. The newly spawned creation process also loads repository-local canonical JSON, inventory, assurance, normal-review verifier/transitive modules and npm-command helpers from the approval revision. For this wave, the author mechanically checked the stronger whole-tree boundary: git diff --exit-code d50e64f9f778f70d4346d00d2e63d645c9e0edc3 HEAD -- . with only evidence/portable-runtime/process-source and docs/superpowers/peer-reviews excluded returned exit 0. Thus the complete transitive repository import closure is unchanged, not merely the worker-listed paths. The exact changed paths as of this revision are listed below. Approval, finalization and approval-publication commits must stay evidence/review-documents-only; the author will repeat this full-tree comparison after finalization and publication, and ordinary class review must recheck Q through the actual worker captureProducerCommit before admitting either creation receipt. This is a mechanical constraint for this wave rather than a claim that the existing worker enforces the larger closure itself.

- evidence/portable-runtime/process-source/registration-index.json
- evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave1.md
- evidence/portable-runtime/process-source/registrations/source-27cb7cbfea1bc197c1b1ef84196c2f4d.json
- evidence/portable-runtime/process-source/registrations/source-4f898ac0e935bac1b12ee22efb670a32.json
- evidence/portable-runtime/process-source/registrations/source-8cfa6f57f65b14d423d0963dc838de20.json
- evidence/portable-runtime/process-source/registrations/source-91a4234506af2993bc176dd5b21df518.json
- evidence/portable-runtime/process-source/registrations/source-c63ac929b6c598ef431f2e4a69034426.json
- evidence/portable-runtime/process-source/registrations/source-dd5736e096e4e4e35ee627f4a90e508e.json

Windows host identity remains hardware UUID based; no collision was observed in its actual workers and these registrations authorize absence only. Per-capture protected keys bind each worker. No Windows creation/reboot claim is made. The CI clock refusal tests demonstrate rejection of missing or inconsistent asserted GitHub-hosted environment and caller override flags; environment variables alone are not cryptographic proof of host isolation. Actual authenticated hosted job provenance and privileged effect/restoration observations are required. The approval poll is bounded to 40 minutes within a 60-minute job; expired workers cannot be reused and fresh runs require new keys and reviewed registrations.

The Linux tuples are exact kernel build 6.17.0-1022-azure/x64/Node 24 or 26 with fixed procfs-v1/full-pid-namespace/exact-pid-directory-v1. Each absence registration has only absence and no transitions; each creation registration has only creation and exactly the four named transitions. All other candidate fields remain unchanged. The producer reproducibly narrows its initial binder candidate, and the worker verifies unchanged producer bytes against Q before capture.

Windows absence is limited to 10.0.26100/x64/Node 24 and its exact fixed System32 PowerShell local CIM probe hash. Darwin absence is limited to 25.6.0/arm64/Node 24 and the new combined stock /bin/ps, /usr/sbin/ioreg and /usr/sbin/sysctl probe digest. Darwin execution-host identity now incorporates the directly observed kernel boot-session UUID as well as hardware identity, avoiding cloned hardware-only identities. No clock-derived boottime is trusted and no reboot or descendant/provider discharge is asserted. Source and probe changes require these fresh captures and separate class review.

Approving the registrations admits no source class or operational runtime. Captures must prove actual live/owned-exit/absence/error controls, exact unchanged protected key generation, matching current host/scope/package/source and the approved immutable revision/index. Creation additionally needs genuine sustained unchanged-child clock/zone/DST observations and restoration. Failed or missing privilege, controls, restoration or cleanup is unavailable and cannot pass. Proposals and fixtures cannot self-admit; normal finite class review and fresh exact installed-source/ledger validation follow separately.

Raw immutable subject references, canonical registration index-entry digests and the raw committed index digest are different conventions and are mechanically rechecked before capture. The root's complete affected Node24 set passed 99 tests at the covered identity fix, including actual candidate pack/bind, host clone separation, genuine historical review/signature verification, source/inventory guards and CI refusal before any ordinary-host effect. Actual current-source conformance still awaits this registration approval and real capture.

Reviewer: independently inspect exact scope, the changed host binding, actual privilege/restoration implementation, producer freezing and immutable registration/index authority. State verification limits and reject any self-approved, mocked, widened or unsupported coverage. Bind ordinary normal-mode acceptance to this exact six-record subject.

```json
{
  "schema": "ai-peer-review.process-source-registration-review/v1",
  "index": {
    "revision": "26ebc56a98702fb07dbe34d00a9abd325cabba12",
    "path": "evidence/portable-runtime/process-source/registration-index.json",
    "blob": "77051f5174a326f725636eb54d293ed6a6057158",
    "sha256": "e3c7d95c5f968f4f903735b0ce6f5bcb6bc8b890165c780864ea18722174a14b"
  },
  "captures": [
    {
      "revision": "26ebc56a98702fb07dbe34d00a9abd325cabba12",
      "path": "evidence/portable-runtime/process-source/registrations/source-27cb7cbfea1bc197c1b1ef84196c2f4d.json",
      "blob": "26476b8bfd612ac22da51f9e2f1c87e8e6a0a820",
      "sha256": "6fb98df9eff078c2e905a03e1ab40089005387c6d5bf09a3d85244f7599aa010"
    },
    {
      "revision": "26ebc56a98702fb07dbe34d00a9abd325cabba12",
      "path": "evidence/portable-runtime/process-source/registrations/source-4f898ac0e935bac1b12ee22efb670a32.json",
      "blob": "cf603ff7a7d623106531bb9d2364d62759ea0895",
      "sha256": "58cd6033cb2f5b4ffd6673e938c466a355c2861f17b1aff307eb676c774e5319"
    },
    {
      "revision": "26ebc56a98702fb07dbe34d00a9abd325cabba12",
      "path": "evidence/portable-runtime/process-source/registrations/source-8cfa6f57f65b14d423d0963dc838de20.json",
      "blob": "6e73714048ab583dbf28c589568a6abfd49ba4a6",
      "sha256": "6f9c187c46a0ef2b1d230486a5bf8a72c3987d82208646cbef87ae16d015ed63"
    },
    {
      "revision": "26ebc56a98702fb07dbe34d00a9abd325cabba12",
      "path": "evidence/portable-runtime/process-source/registrations/source-91a4234506af2993bc176dd5b21df518.json",
      "blob": "cc1b6c4f06822ad0646b880052252f9297d82308",
      "sha256": "1397cc51b9de5a4f2e7cd3ae367e2421858306c2bac0b9f17c746eec064cfed2"
    },
    {
      "revision": "26ebc56a98702fb07dbe34d00a9abd325cabba12",
      "path": "evidence/portable-runtime/process-source/registrations/source-c63ac929b6c598ef431f2e4a69034426.json",
      "blob": "c293d49bdd33fe748891888d5a2e5217c1572b49",
      "sha256": "34fc6f2f77afd62ca7204729c5a80c3f38ef691b5a59d3543f8b9d37d70366bf"
    },
    {
      "revision": "26ebc56a98702fb07dbe34d00a9abd325cabba12",
      "path": "evidence/portable-runtime/process-source/registrations/source-dd5736e096e4e4e35ee627f4a90e508e.json",
      "blob": "e30caef972a5dfd8bdcc9f96b04d79c178be5040",
      "sha256": "9eaba91284c893c560870d0e21bb299746b6b368694b34ce91aaace87ce7b025"
    }
  ]
}
```
