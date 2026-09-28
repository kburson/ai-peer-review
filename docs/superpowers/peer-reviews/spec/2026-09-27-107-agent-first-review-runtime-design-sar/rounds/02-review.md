# SAR Round 02 Review

- Reviewed SHA-256: `87f4b68b89bc8bc79118c29411a42cb916f6d1b16ff01fbbad9b4ea14f4344ce`
- Verdict: Changes required after fresh full-document review.
- Prior findings SAR-001 through SAR-010: core corrections verified; the
  following cross-section gaps remain. No revisions are accepted yet.

## Findings

### SAR-011: Admission ordering and identity binding remain underspecified (high)

Stage Resolution seals the complete roster before launch, but a headless
session fingerprint can only be observed afterward. Start also preflights
capabilities before replay, which can prevent recovery of an existing request
when the provider is now unavailable. `src/broker/participant-binding.mjs` and
the exact launch checks in `worker-factory.mjs` distinguish intended selection
from observed identity. Seal selection first, bind observed identity before work,
and perform replay lookup after syntactic validation but before new capability
resolution. If no stage satisfies the primary class, do not silently choose a
cross-class fallback. Reject attached reviewer/two-attached combinations.

### SAR-012: SAR permission transitions and acceptance sealing conflict (high)

Permissions assigns a reviewer read-only FUR scope, including the SAR worker,
but revision needs write access without losing the same session. Capability
checks must cover this transition or clearly declare SAR's weaker self-review
boundary. Round Contract step 2 accepts without explicitly sealing the clean
response; Evidence later requires it. Bind the clean verdict and FUR digest
before accepting, and declare SAR critique-phase write behavior.

### SAR-013: Evidence anchors need an explicit lifetime (medium)

Reconstruction from current FUR works until a later edit or follow-up changes
it. Evidence calls bundles portable but omits their anchor when exported alone.
`src/collateral/review-record.mjs` verifies publication digests rather than
assuming future working bytes stay fixed. Preserve terminal sealed bytes in
durable storage, include a verified anchor in standalone exports, and distinguish
runtime evidence snapshots from disposable raw logs. Report post-acceptance
working-file drift without retroactively changing the accepted digest.

### SAR-014: Structured API coverage and summary semantics (medium)

Cleanup still only shows flags and has no MCP equivalent, despite the agent-first
identical-JSON goal. Status/wait/intervention shapes lack a common envelope;
reconnection and read-only monitoring need authority scopes. The resolved-cap
summary also contradicts clean acceptance at the cap. Specify structured cleanup
and envelopes, the read/control boundary, and align summaries with normative
rules. These are API requirements, not a request to implement the new API now.
