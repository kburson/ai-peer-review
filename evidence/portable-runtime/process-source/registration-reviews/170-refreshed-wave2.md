# #170 refreshed source registrations, final absence wave

<!-- cspell:words ioreg sysctl -->

Review the exact two immutable absence-only registrations below for authenticated hosted run 37741411472 attempt 1 and tested source Q d50e64f9f778f70d4346d00d2e63d645c9e0edc3. They are the queued Windows Node 26 and Darwin Node 26 workers, which have now completed actual candidate pack/bind and public registration publication. Their keys remain in C1-protected disposable-worker storage; private keys and bindings were not uploaded. Run/attempt/Q/Node/package/scope equality was checked against their downloaded public artifacts. Both are waiting for this independent approval and neither is admitted by a caller flag.

All source contracts are sha256:524b96e3e80bc4f448713ffaa1ea2a2f3f0ae8ec50722cb9072926b981690ae8. Earlier 9a9c7b records are historical. This wave replaces the mutable index with two records while the first wave remains bound to its own immutable index revision and accepted review. Source bytes remain unchanged from Q. Mechanically compare the complete repository tree Q through approval and actual captureProducerCommit, excluding only evidence/portable-runtime/process-source and docs/superpowers/peer-reviews; the author repeats that comparison after finalization and publication. The worker's narrower PRODUCERS check is not represented as covering the entire transitive import closure.

Windows scope is exact 10.0.26100/x64/Node 26 with fixed System32 PowerShell local CIM hash and completed-query error contract. Darwin scope is exact 25.6.0/arm64/Node 26 with the combined stock ps/ioreg/sysctl probe digest 62c342e1 and exact ps selection/error/visibility contract. Darwin host identity now combines hardware UUID with direct kernel boot-session UUID: this worker's host digest differs from the first-wave Darwin Node 24 worker, addressing the earlier cloned hardware-only collision. Windows remains hardware UUID based; no collision was observed. Protected per-capture keys bind each worker, and no Windows creation/reboot claim is requested.

The producer reproducibly narrows the binder candidate to kinds absence and no transitions while preserving captureId, hostId, publicKey, keyId, package and scope. This review permits only real unchanged nonce child live/clean-owned-exit/absence/error controls without clock, timezone or DST changes. It admits no source class, PID-reuse creation assurance, provider/descendant discharge or portable runtime activation. Exact original finite deadlines, key generation, installed package bytes, current host/scope/probe and immutable approved index are revalidated before signing and locally verifying the receipt.

Subject references hash raw immutable files, index entries hash canonical registration records, and receipts carry the raw committed index digest with the sha256 prefix. Normal reviewer-consensus collateral and all immutable references are mechanically rechecked. Actual captures, separate finite class review and fresh installed source/complete reviewed-ledger validation follow. Fixtures, proposals and environment assertions alone cannot admit classes. The worker approval poll remains bounded to 40 minutes inside a 60-minute job; expired workers cannot be reused.

The first wave's authenticated Windows/macOS/Linux jobs succeeded, including real Linux clock transitions and final restoration. Those signed controls are preserved as separate evidence and do not substitute for these two workers' capture or approval. Reviewer: inspect the exact public index/registrations, finite no-clock scope and immutable source/package/host/provenance gates, and state verification limits. Ordinary normal-mode acceptance binds only these exact two records.

```json
{
  "schema": "ai-peer-review.process-source-registration-review/v1",
  "index": {
    "revision": "2d65f04a30620b77ac9eaedbc84f810fed97ca4f",
    "path": "evidence/portable-runtime/process-source/registration-index.json",
    "blob": "bd2c3854075de3402082fd72e31e8dd9ff179b15",
    "sha256": "ff2d9fa0affe611477964f1e639dd909de64b47a5aad762c028006896ce2650b"
  },
  "captures": [
    {
      "revision": "2d65f04a30620b77ac9eaedbc84f810fed97ca4f",
      "path": "evidence/portable-runtime/process-source/registrations/source-bbefe02f02b90507dfc8ecfbe839df53.json",
      "blob": "bfe4ec31ea1472fc9a3efcd46e52dec88249e5bd",
      "sha256": "44b83120cd7391929d580c2386cbd8a8c7dc5b289ea5bc12c6bb983eeec4a3e5"
    },
    {
      "revision": "2d65f04a30620b77ac9eaedbc84f810fed97ca4f",
      "path": "evidence/portable-runtime/process-source/registrations/source-c2e5961b1f350a86823d596448ca6f3e.json",
      "blob": "46447a77b193ae79d647e022f2cbe257bfa0a4d2",
      "sha256": "f1a0bdbda192caf8fce112c5ce168394c5ddb012793af9f1ba8459967556ff1e"
    }
  ]
}
```
