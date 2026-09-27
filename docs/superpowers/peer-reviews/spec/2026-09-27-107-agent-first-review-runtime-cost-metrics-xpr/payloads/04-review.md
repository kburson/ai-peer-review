# XPR Review — Round 4

- **Artifact under review:** `FROZEN_SPEC.md` ("Agent-First Review API and Portable Runtime Design", issue #107, dated 2026-09-27)
- **Expected current SHA-256 (orchestrator-asserted, independently checked by the orchestrator):** `14f490d3387046280734f8e2bd9d8c9a83f6520ebdb33f371aa6c79c13b3bab8`
- **Prior revision digest (orchestrator/author-asserted):** `0d28f135e5f640c653a15bd0706c2d3ea077043e3cb958e01f932b494d4c6106`
- **Reviewer identity:** Claude Opus 5, high effort
- **Author identity:** GPT-6 Astra, high effort
- **Round:** 4
- **Prior evidence read in full:** `ROUND_03_REVIEW.md`, `ROUND_03_AUTHOR_RESPONSE.md`, `ROUND_03.patch`

## Artifact Binding and Digest Limitation

I read `FROZEN_SPEC.md` directly from this review directory in full (1839 lines), and this review is
bound to exactly those bytes as read.

**I could not independently compute SHA-256 over the file.** This role is confined to the read/write
file tools; shell execution, code execution, repository access and parent-directory access are
prohibited. The expected current digest above is therefore recorded as orchestrator-asserted and
orchestrator-verified, not reviewer-verified. This limitation is unchanged from rounds 1–3: direct
reading establishes *content identity*, not *byte identity*.

What I can state positively from direct reading:

- The file is the revised #107 specification, is a single coherent document, and contains no
  truncation, conflict markers, or placeholder gaps.
- The document embeds no self-declared digest, so no in-band contradiction with the asserted digest
  was detectable.
- `ROUND_03_AUTHOR_RESPONSE.md` asserts the before/after pair `0d28f135…` → `14f490d3…`, and
  `ROUND_03_REVIEW.md` asserts `0d28f135…` as its own binding. Those assertions are mutually
  consistent with the orchestrator's. That is corroboration among asserted values, not reviewer
  verification.
- I reconciled `ROUND_03.patch` against the current file hunk by hunk. All three hunks are present at
  the expected locations: the "For either lineage mode" discovery paragraph (current lines 736–741),
  the "Before allocating any new series" paragraph (744–754), the new cross-mode paragraph (756–768),
  the "published binding" rewording (770), and the gate 3 cross-mode fixture block (1722–1728).
- The patch's net line delta is +26 (hunk 1 `-16/+20`, hunk 2 `-7/+21`, hunk 3 `-6/+14`). Round 3 read
  the prior revision at 1813 lines; this revision is 1839. 1813 + 26 = 1839 exactly, and every
  pre-patch context line I checked is still present verbatim. That is consistent with the patch being
  the complete change set, and I found no change in the current text the patch does not account for.

## Method and Scope

Scope of this round, as instructed: reassess XPR-031 against the current spec; verify the revision
resolves the underlying cross-mode lineage issue without introducing contradictions; and inspect the
current spec for any other actionable defect that remains or was introduced. Existing finding IDs are
preserved. The round-1/2/3 limitations still apply and still affect no finding or resolution below: no
repository grounding (the `ai-peer-review` sources are not readable from here, so **Current-State Gap
Assessment** claims are reviewed as written) and no backlog access (issue bodies were not readable, so
ownership statements rest on what the document asserts). No web research was needed; none was
performed. No input file was edited.

## Overall Round-4 Assessment

The round-3 revision is tightly scoped to the section and gate XPR-031 named, and it implements all
three numbered required changes plus the required fixture. The author chose the stronger of the two
outcomes the finding offered — automatic reuse of a unique validated prior binding rather than a
fail-closed error — and then closed the symmetry the finding only asked to be *confirmed*, so the
mode axis is now explicitly orthogonal to the series namespace in both directions.

I found no regression on any previously resolved finding, and no new actionable defect. XPR-031 is
resolved.

## Reassessment of XPR-031 — Resolved

The finding's defect was a scope omission: the discovery rule that closes the silent-new-chain path
was governed by a "For sidecar mode" qualifier, so a frontmatter-mode start against a pointerless
Markdown FUR (the default resolution for a follow-up that omits `lineage_mode`) had no route to prior
sidecar lineage and would allocate a fresh series with no error. Each required change is now met.

**Required change 1 — mode-independent pre-allocation discovery.** The governing qualifier is now
"For either lineage mode, discover candidate bindings from series indexes and retained run manifests
only under the canonical docs/superpowers/peer-reviews/ tree in the current physical repository,"
which removes the antecedent the finding relied on. The dependent paragraph is strengthened from a
descriptive "perform" to a normative "Before allocating any new series, start and preview **must**
perform this discovery regardless of the requested or resolved lineage_mode, including a default
frontmatter-mode start whose Markdown FUR has no valid pointer." The exact inferential gap the finding
identified — an absent pointer being treated as absence of history — is closed by name: "Absence of a
pointer or local authority/cache is never evidence that prior lineage is absent." Every constraint the
finding required to be kept is intact in the same paragraphs: canonical-tree-only lookup,
`artifact_path` resolved repository-relative with normalized separators and the existing physical-path,
alias and containment checks; cached absolute paths from another checkout ignored; linking conditioned
on validating the selected terminal manifest, reconstruction anchor and digest chain; intervening FUR
delta captured under the existing rules; and "Path matching locates a candidate; it does not replace
manifest/chain validation or confer participant or controller authority," with the content-digest
prohibition unchanged. The added sentence "Malformed or conflicting pointers still require
reconciliation; discovery cannot bypass that rule" forecloses the inverse misreading in which
mandatory discovery would be used to route around the pre-existing reconciliation requirement.

**Required change 2 — a stated outcome, with "allocate a new chain" unreachable.** The revision picks
one branch and says which: "A frontmatter-mode start with no pointer and a unique validated prior
binding **must reuse that series and predecessor**; after reservation, its bounded initialization merge
writes the existing series_id and record pointer, never a freshly allocated series." That is the
finding's first option, and it is the stronger one because the user gets automatic linkage rather than
mandatory operator reconciliation. The disclosure defect the finding described as part of the
consequence — a merge disclosed as *new* lineage rather than as the real situation — is addressed
directly: "Preview and receipt disclose both the reused lineage and planned merge," which composes
correctly with the pre-existing rule that authorizing start with the resolved mode "grants only the
bounded initialization merge." Ambiguity is not swept into the reuse branch: "Ambiguity still returns
APR_LINEAGE_UNRESOLVED rather than using a mode change to start another chain," and the
unresolved-binding rule immediately below now reads "its **published** binding" rather than "its
sidecar binding," so that failure path is mode-independent too. Between these, I can find no remaining
reading on which a frontmatter-mode start with discoverable prior lineage reaches a silent new chain.

**Required change 3 — cross-mode link-target validity.** Stated in both directions, in the place the
finding asked for: "A binding recorded with lineage_mode=sidecar is a valid link target for a
frontmatter-mode start, and a frontmatter binding is valid for a sidecar-mode start. The mode selects
the current run's pointer representation, not a separate series namespace." The reverse direction is
then given its own operational rule — "A sidecar-mode follow-up reuses the same lineage without writing
the FUR; a consistent existing frontmatter pointer may remain" — which the finding did not require and
which correctly distinguishes a *consistent* surviving pointer (may remain) from the *conflicting*
pointer that the pre-existing sentence at line 727 still sends to explicit reconciliation.

**Gate coverage.** Gate 3 gains exactly the fixture the finding specified and more: start and preview
with `lineage_mode` omitted against a pointerless Markdown FUR with prior sidecar lineage, in a
checkout with no local authority/cache, asserting reuse of the existing series and predecessor,
read-only preview, that only the authorized initialization merge writes that existing pointer, no
silent allocation, and unchanged historical manifests — plus explicit frontmatter mode, the reverse
frontmatter-to-sidecar follow-up without FUR mutation, and ambiguous cross-mode candidates returning
`APR_LINEAGE_UNRESOLVED`. The gate-3 detection gap the finding named ("its new lineage fixtures are
described as 'Sidecar fixtures'") is therefore closed by added coverage rather than by reinterpreting
the existing sidecar fixtures.

### Contradiction check on the revision

I checked the new text against every surface it could plausibly contradict and found no conflict:

- **Initialization-merge authority.** Writing an *existing* `series_id`/record pointer is within the
  same bounded, reversible, journaled initialization merge already specified ("the supervisor applies
  it once, records its reversible initialization patch and seals the result"; "Round 1 reviews the
  post-merge digest"). Nothing about reuse enlarges that write authority or adds a second FUR write.
- **Preview remaining read-only.** Mandating discovery in preview does not conflict with the
  read-only rule, because discovery reads portable records, and the derived cache is still "rebuilt
  from validated portable records after reservation, never during read-only preview."
- **Lock ordering and concurrency.** "Revalidate the selected binding under the artifact/series locks
  at reservation" is consistent with the pre-existing artifact-scoped write lease and series lock, and
  with publication ordering (terminal record sealed and published first, then the derivative index
  updated atomically under its lock).
- **Historical immutability.** "Retain the prior manifests' original modes and bytes unchanged"
  agrees with the Migration Principles rule to read terminal historical records without rewriting
  them and with "It never rewrites historical records or fabricates missing evidence."
- **The explicit-new-lineage escape survives.** "Must reuse that series and predecessor" does not trap
  a user whose file was genuinely repurposed: `reconcile_review_series` with `action=new-lineage`
  remains the pre-start route, "allocates a fresh ID and records the predecessor when known," and
  `start` errors are required to name that exact recovery operation. "With no discoverable prior
  binding or record, a first review may allocate a new series" is also untouched, so genuine first
  reviews are unaffected.
- **Error contract.** `APR_LINEAGE_UNRESOLVED` and its `repair-pointer`/`repoint`/`new-lineage` action
  set remain consistent with the `reconcile_review_series` request contract, including its
  `(or absent)` expected-pointer-digest allowance, which is what a pointerless cross-mode
  reconciliation requires.
- **Resolved Decisions.** The lineage bullet ("Follow-ups automatically link through FUR frontmatter
  or trackable sidecar bindings and verified digest continuity when the pointer/index and referenced
  evidence are present in the checkout; ignored lookup caches are not required") is now *more*
  accurate than before the revision, since automatic linking no longer depends on the requested mode.

## Independent Sweep for Other Actionable Defects

I re-examined the areas most exposed to the revision and the cross-references most likely to have been
desynchronised by it, and found nothing actionable: the storage-layout non-aliasing invariant and the
authority/private exclusions are untouched; the series-index/`patch-chain` contract ownership declared
for #30 is unchanged, so no second index format or second lineage vocabulary was introduced; the run
state enum, cap/round contract, `fallback_kinds` topology rules, accounting-partition rules, response
dimensions and the config skeleton's key inventory are all unchanged by this patch and internally
consistent as read; and the gate-3 additions introduce no fixture that contradicts another gate.

Two candidates I examined and deliberately did **not** raise, with reasoning recorded so a later round
does not mistake them for missed defects:

- Whether a *frontmatter*-mode run publishes an index binding is now load-bearing, because the
  unresolved-binding rule became mode-independent ("its published binding is missing, malformed or
  inconsistent"). The document answers it imperatively in the new paragraph — "Record the resolved
  mode in the new run and its published index binding" — and presupposes it again in "a frontmatter
  binding is valid for a sidecar-mode start," backed by the general publication rule that for every
  run "only the derivative series index is updated, transactionally, under a series lock." The residual
  "sidecar" wording in **Storage Layout** and in the publication-ordering sentence is therefore stale
  terminology, not a competing rule (see observations). The worst outcome of the narrower reading is an
  explicit `APR_LINEAGE_UNRESOLVED` with a named recovery operation — fail-closed, not silent lineage
  loss — so this does not meet the bar for a blocking contract defect.
- Whether a frontmatter-mode start *with* a valid pointer must also consult the published index
  binding. Mandatory discovery is conditioned on "before allocating any new series," which does not
  fire on the pointer path. But the unresolved-binding rule is conditioned on "before new
  reservation," not on mode or on allocation, so a retained manifest whose published binding is
  inconsistent with the pointer, and conflicting candidate series or predecessor tips, still return
  `APR_LINEAGE_UNRESOLVED` on that path. The case is covered; raising it would be manufacturing a
  finding.

## Non-Actionable Observations

Recorded so they are neither lost nor mistaken for findings. None requires a change and none should be
treated as a finding in a later round.

- **Storage Layout** still frames binding publication in sidecar terms — "Sidecar lineage is published
  in the trackable series index", "Each **sidecar** binding records lineage_mode, series_id, …" — and
  the publication-ordering sentence still reads "Publish a **sidecar** binding only after its
  referenced terminal run record has been sealed and published." After this revision, bindings are
  mode-independent and carry `lineage_mode` precisely because both modes publish them, so "sidecar" in
  those three places is residual wording. It is editorial tidying available at the author's discretion,
  not a contract defect: the new paragraph states the requirement imperatively, and the general
  "published exclusively after seal verification" rule already covers ordering for all publication.
- The wrapped line "retained run manifests only under the canonical docs/superpowers/peer-reviews/
  tree in" exceeds the document's prevailing wrap width, as does the round-2 sidecar sentence noted
  last round. Purely cosmetic; the document already contains several such lines.
- **User-Requested Sequences** still says, unqualified, "A later review of the same FUR is a new
  immutable run linked automatically to the prior terminal run." Recorded as non-actionable in round 3
  and now *better* supported, since automatic linking no longer depends on the requested mode.
- The round-2 and round-3 non-actionable observations (the `--request` example path, the single-valued
  `monitoring.on_missing_surface`, the `max_rounds_limit` validation-not-clamp behaviour, the Summary's
  round-binding sentence, and the near-inert `authority/series-index.json` cache) are unchanged by this
  revision and remain non-actionable.

## Checked and Found Sound (Round 4)

Beyond the round-1, round-2 and round-3 lists, which I do not re-litigate: the cross-mode paragraph
composes correctly with the frontmatter pointer example (a series-root `record` path is exactly what a
reused binding supplies); disclosure of reuse in both preview and receipt closes the
"disclosed-as-new-lineage" half of XPR-031's consequence, not only its allocation half; the
`reconcile_review_series` escape keeps a repurposed-file start expressible without weakening "must
reuse"; mandatory discovery in preview does not turn preview into a reservation, since preview remains
explicitly "optional and read-only, not a reservation"; and gate 3's cross-mode fixtures assert both
directions plus the ambiguous case, so the gate now fails on the exact silent-allocation outcome
XPR-029 and XPR-031 were raised against.

---

# Verdict

**ACCEPTED** — XPR-031 is resolved. The revision makes pre-allocation lineage discovery normatively
mode-independent, states a single definite outcome (reuse of a unique validated prior binding, with the
initialization merge writing the existing `series_id` and record pointer) so that silent new-chain
allocation is unreachable, confirms cross-mode link-target validity in both directions, and adds the
required gate-3 fixtures. It introduces no contradiction with the surrounding design, and XPR-029 and
XPR-030 remain resolved with no regression. No actionable findings remain. Artifact binding rests on
the orchestrator's digest assertion, as stated above.
