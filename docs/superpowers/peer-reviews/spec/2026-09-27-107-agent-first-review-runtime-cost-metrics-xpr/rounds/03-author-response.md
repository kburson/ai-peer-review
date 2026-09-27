# XPR Author Response - Round 3

- Issue: #107
- Requested author identity: GPT-6 Astra, high effort
- Reviewer: Claude Opus 5, high effort, as recorded in the supplied review
- FUR: `docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md`
- Review: `docs/superpowers/peer-reviews/spec/2026-09-27-107-agent-first-review-runtime-cost-metrics-xpr/rounds/03-review.md`
- Review SHA-256: `b7e1e37165cbf97ae863691b8fe354ee07e6e270dc018a2b2900e476b22018cb`
- Before FUR SHA-256: `0d28f135e5f640c653a15bd0706c2d3ea077043e3cb958e01f932b494d4c6106`
- After FUR SHA-256: `14f490d3387046280734f8e2bd9d8c9a83f6520ebdb33f371aa6c79c13b3bab8`

## Assessment

I read the complete round-3 review and independently verified both input
digests. The reviewer confirms XPR-029 and XPR-030 resolved with no regression
on earlier findings. Those resolutions remain closed. XPR-031 identifies a valid
scope omission; I accept it without dispute. This response records the author's
resolution for reassessment, not reviewer acceptance.

## Finding Disposition

### XPR-031 - addressed

Review Series and Follow-Ups now makes repository-local discovery an explicit
precondition before any new-series allocation, regardless of requested or
resolved lineage mode. It expressly includes a Markdown FUR with no valid
pointer whose follow-up request omits lineage_mode and therefore defaults to
frontmatter. An absent pointer or local cache cannot establish absent history.

The chosen outcome is automatic reuse of a unique validated prior binding.
A frontmatter-mode start discovering prior sidecar lineage must reuse its
series and predecessor. After reservation, the bounded initialization merge
writes the existing series_id and record pointer, never a new series. Preview
and receipt disclose both reuse and the planned mutation; preview stays read-only.

The reverse direction is explicit too: a prior frontmatter binding is a valid
target for a sidecar-mode follow-up, which does not write the FUR and may leave
a consistent existing pointer intact. Mode controls pointer representation,
not a series namespace. The selected binding is revalidated under artifact and
series locks; the new run/index records its resolved mode without rewriting
historical manifests. Missing or conflicting evidence still requires
APR_LINEAGE_UNRESOLVED and reconciliation; changing modes cannot bypass it.

The edit preserves canonical-tree-only discovery, repository-relative paths,
containment and alias checks, manifest/anchor/chain verification, intervening
delta capture, and the prohibition on deriving runtime authority from path or
content matching. The unresolved-binding sentence now refers to a published
binding rather than only a sidecar binding, keeping that rule mode-independent.

Gate 3 now includes the requested omitted-mode follow-up against a pointerless
Markdown FUR with prior sidecar lineage and no local authority/cache. It asserts
reuse of the series/predecessor, read-only preview, the authorized existing-pointer
merge, no silent allocation and unchanged historical manifests. Additional cases
cover explicit frontmatter, the reverse transition without FUR mutation and
ambiguous cross-mode candidates failing closed.

## Verification and Scope

Focused checks cover Markdown lint/format, whitespace, JSON examples, digest
bindings, the finding disposition, prior-collateral hashes and unchanged FUR
sections outside Review Series and Follow-Ups and Required Verification Themes.
The new fixture is a specified release gate, not an implemented runtime test.

Only the FUR and this round-3 author response were edited. Reviews, earlier
responses and patches, the implementation plan, package authority and source
code were not modified. No commits were created. The supervisor retains patch
and inventory generation. Ready for Claude Opus 5 reassessment.
