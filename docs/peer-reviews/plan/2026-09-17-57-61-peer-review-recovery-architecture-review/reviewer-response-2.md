# Reviewer response 2 — revisions requested

- **Artifact under review:** `docs/superpowers/plans/2026-09-17-57-61-peer-review-recovery-architecture.md` @ `0982993`
- **Author response:** `docs/peer-reviews/plan/2026-09-17-57-61-peer-review-recovery-architecture-review/author-response-1.md`
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay
- **Decision:** revisions-requested

---

## Summary

All twelve round-one findings are resolved, and several go further than I asked —
the dormancy and release-upgrade tests, the collision-only probe scoping with canonical
absolute probe paths, and the parity-ledger discipline in Task 10 are better answers
than the ones I proposed.

Two blocking items remain. **Q1 I verified by running the test**: the parity suite fails
on this branch right now, and the plan's new per-story gates make that failure land at
every story boundary. **Q2** is a latent collision between Task 2's own RED test and the
v1 participant validator, which would break the dormancy guarantee Task 1 establishes.

Two significant items and three clarifications follow.

---

## 1. Closed

| Finding | Closed because |
| ------- | -------------- |
| **P1** | Global Constraint line 20 states the dormancy rule; Tasks 1-8 export v2 only through `test/helpers/internal-api.mjs`; Task 9 switches public writers and finalizes the sealed schema list. The new `v2-dormancy.test.mjs` (asserting a real public `start`→`join`→`submit` cycle emits only event-v1) and `release-upgrade-compatibility.test.mjs` (record created at release N, upgraded at N+1) are the right two tests, and they run at every intermediate gate. This is the strongest of the three options I offered. |
| **P2** | Tasks 4, 7, and 8 no longer touch `parse.mjs`/`help-data.mjs`/routing — I checked each file list. Task 9 owns all eight commands atomically. Delivery-order steps 4-5 now say "add no public grammar" and "all new command grammar and public v2 writing remain absent." The `recover-record` spend-before-enforcement window is gone. |
| **P3** | All eleven files are placed: both Claude permission suites, `reviewer-boundary`, `reviewer-guard`, and `test/live/claude-live-conformance.mjs` (marked "Modify, do not run") in Task 5; `test/integration/recovery.test.mjs` and `test/helpers/intervention-fixture.mjs` in Task 7; both source templates, all six template goldens, and `test/golden/templates.test.mjs` in Task 9; the four manifest goldens and `test/golden/manifests.test.mjs` in Task 3; the parity suite in Tasks 1, 2, 3, 5, 6, 7, and 10. |
| **P4** | The full gate now closes Tasks 2, 3, 5, 8, and 10, with focused runs kept as the inner loop. |
| **P5** | The allowlist gains `SystemRoot`, `SYSTEMROOT`, `COMSPEC`, `PATHEXT`, `WINDIR`, both proxy cases, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, and `CLAUDE_CODE_API_KEY_HELPER_TTL_MS`. The negative test is specified as "prove an arbitrary injected variable is absent rather than copying `process.env` and deleting known keys" — that phrasing rules out the wrong implementation, which is exactly right. The `PATH` distinction is stated. |
| **P6** | `lineage_receipt` is optional and explicitly not added to `required`; pre-#58 terminal manifests are valid legacy data with stated behavior after scratch loss. See Q3 for the one policy question this leaves. |
| **P7** | The Activation/rollback/abort section is clear, and naming #61 as the format point of no return follows correctly from the dormancy choice. |
| **P8** | Probes run only after `EEXIST`; Linux reads `/proc` without spawning; macOS and Windows use fixed canonical paths with regular-file/non-symlink/non-reparse checks and `shell: false`; nonstandard installs degrade; no probe searches `PATH`. |
| **P9-P12** | #60's row now includes sequence-only execution authority; Task 7 names both protected actions and `protectedParametersMatchEvent` with a RED test for the unmatched-action fallthrough; Task 4 defines optional `lock-reclaimed` with the receipt as authority; the AC matrix replaces the asserted mapping and correctly routes AC 10 to the decomposition section. |

---

## 2. Blocking

### Q1 — The parity suite fails on this branch now, and the plan states the wrong predicate for keeping it green

**Plan line 61 (Activation, rollback, and abort); story gates in Tasks 2, 3, 5, 8, 10.**

I ran it:

```
✖ publishable HEAD contains no parity-gated legacy path
  AssertionError: docs/superpowers
  + [ Dirent { name: '2026-09-17-57-61-peer-review-recovery-architecture.md',
  +            parentPath: '.../docs/superpowers/plans' } ]
  - []
```

`test/integration/ported-behavior-parity.test.mjs:84-99` asserts that four directories —
`scripts/review`, `scripts/providers`, `scripts/tests`, and `docs/superpowers` — contain
zero files. It uses `readdirSync(target, { recursive: true })` against the **working
tree**, not the git index.

Two consequences:

1. **The stated rule is the wrong check.** Line 61 says "Before every story gate,
   `git ls-files docs/superpowers` must be empty." An untracked plan file, a file
   restored from a stash, or a file present but gitignored still fails the test. The
   predicate is "no files on disk under `docs/superpowers`," and the plan should say so.
2. **The rule is now load-bearing at five points instead of one.** P4 added
   `npm run test:slow` to Tasks 2, 3, 5, 8, and 10, and `test:slow` runs
   `test:integration`, which runs this suite. So every story gate now fails if the plan
   file is in the worktree — which is the default situation for anyone reading the plan
   while implementing it. Right now, on `0982993`, `npm run test:slow` does not pass.

The Activation section's hydration instruction (hydrate into #57-#61, then branch
implementation worktrees from the approved code baseline rather than merging the planning
branch) is the correct mitigation. But it is stated once, in prose, in a section an
implementer reads before starting and not again at any gate, and it states the wrong
predicate.

**Requested.**

1. Correct line 61 to the filesystem predicate, and name the test and its assertion so an
   implementer who hits the failure recognizes it immediately rather than assuming they
   broke something.
2. Add a precondition line to each story-gate block: the implementation worktree contains
   no files under `docs/superpowers`, `scripts/review`, `scripts/providers`, or
   `scripts/tests`.
3. Say explicitly whether the review artifacts under
   `docs/peer-reviews/plan/...` are also off-trunk. They are not in the parity list, so
   they currently pass — but the plan calls "its review commits" off-trunk planning
   evidence alongside the plan itself, and the two are governed differently by the test.
   State which tree each lives in.

---

### Q2 — Task 2's own RED test adds a ninth field to the identity object that v1 participant events reject

**Plan Task 2, Interfaces and first step; Global Constraint line 20.**

Task 2's failing test asserts on the value returned by `resolveIdentity`:

```js
const identity = resolveIdentity({ adapter: 'codex', role: 'author', ... });
assert.equal(identity.evidence.model.assurance, 'declared');
```

So `resolveIdentity` gains an `evidence` property. That return value is the participant
object written straight into event payloads today — `resolveIdentity` calls
`participantIdentity` (`src/identity/registry.mjs:152-178`), which returns exactly the
eight fields `role`, `host`, `provider`, `model_id`, `model_display`,
`session_fingerprint`, `identity_source`, `joined_at`.

`validateParticipant` (`src/protocol/events.mjs:292-306`) applies `exactKeys` to exactly
those eight. A ninth key fails with `APR_EVENT_INVALID`.

The write sites that pass the identity object through unchanged are enumerable:

- `review-created.author` — `startReview`
- `reviewer-joined.reviewer` — `joinReview`
- `identity-changed.identity`
- `participant-replaced.incoming_participant` — `src/cli/run.mjs:1801` passes
  `input.identity` directly

Task 2 says "Validate v1's exact eight fields unchanged" but never says how the
evidence-bearing object is projected down at those sites. That matters more than usual
here because there is an attractive wrong fix: loosening `validateParticipant`'s
`exactKeys`, or adding `evidence` to `optionalFields`. Either silently breaks the
"event-v1 bytes remain unchanged" Global Constraint and the dormancy guarantee Task 1
just established, and neither would fail any test the plan currently specifies —
`v2-dormancy.test.mjs` checks envelope schema strings, not payload shape.

**Requested.**

1. Name the projection explicitly in Task 2: a `v1Participant(identity)` (or equivalent)
   applied at each of the four write sites, with the evidence carried alongside rather
   than inside the participant payload.
2. Add a RED test asserting a v1 participant payload built from an evidence-bearing
   identity contains exactly the eight fields — so the wrong fix fails rather than
   passes.
3. State in Task 2 that `validateParticipant`'s v1 branch is not modified at all, only
   the new v2 branch is added. The plan already says the eight fields are unchanged; say
   that the validator itself is untouched.

---

## 3. Significant

### Q3 — Adding an optional property to a shipped `additionalProperties: false` schema needs a stated versioning policy

**Plan Task 3, step 5.**

`schemas/manifest-v1.json` has `"additionalProperties": false`, a fixed 20-entry
`required` array, and `"schema": { "const": "ai-peer-review.manifest/v1" }`. `schemas/`
is a published artifact — it is in `package.json`'s `files` array and
`test/packaging/package.test.mjs:32` asserts it ships.

Adding optional `lineage_receipt` keeps *old* manifests valid, which is what I asked for
and what you did. But the reverse direction is now broken: a manifest produced by #58
**fails validation against the manifest-v1 schema as published today**, because
`additionalProperties: false` rejects the new key. A consumer pinned to the 0.2.x schema
file sees every new manifest as invalid.

This is the same forward-compatibility question the spec answered carefully for events
and left unaddressed for manifests. The plan should not leave it to the implementer.

**Requested.** State the policy. Either:

1. **Living v1 schema** — `manifest-v1.json` evolves additively within the package, and
   consumers are expected to validate against the schema shipped with the package version
   that produced the manifest. Say so, and add a note to the docs step in Task 10.
2. **`manifest-v2.json`** — new `$id`, `schema` const bumped, v1 frozen byte-stable like
   the event schemas. More work, and it ripples into `src/manifest/render.mjs` and the
   four goldens, but it is consistent with how this design treats every other versioned
   artifact.

I lean toward (1) given the receipt is optional and the manifest is terminal collateral
rather than protocol authority — but it should be a decision in the plan, not an
inference.

### Q4 — Task 9 changes generated templates but omits the closed template-variable catalog

**Plan Task 9, file list and step 5.**

`hydrateTemplate` (`src/templates/index.mjs:85-107`) validates variables against
`TEMPLATE_VARIABLES`, a closed per-template catalog, with an exact-key comparison that
fails with "Template variables do not match the closed catalog."

Task 9 must "Pin generated participant commands in both source templates to the creator
package version." Today that pin exists in two different forms:

- `templates/author-startup.md:37` — a **literal** in the template text:
  `` `npx --yes ai-peer-review@0.2.2 status --help` ``
- `src/cli/run.mjs:600` — a **rendered command** passed in as a variable
  (`zero_install_join_display`)

Turning the literal into a version-derived value requires a new catalog entry, which
means modifying `src/templates/index.mjs`. Task 9's file list does not include it. The
same applies if the workspace-first `launch-reviewer` command is surfaced in either
template.

**Requested.** Add `src/templates/index.mjs` to Task 9's file list, and state which
variables are added or renamed so the golden regeneration has a defined input. Also
confirm whether `src/cli/run.mjs`'s hardcoded `ai-peer-review@0.2.2` becomes a read of
`package.json` version or a build-time constant — the plan says "creator package version"
without saying where it comes from.

---

## 4. Clarifications

### Q5 — Task 9 regenerates six template goldens but modifies two source templates

The file list marks `templates/{author-startup,reviewer-invitation}.md` as Modify and all
six files under `test/golden/templates/` as Modify. If only two source templates change,
four goldens should be byte-identical after regeneration. Regenerating all six is harmless
but makes the diff review in step 5 ambiguous. Either narrow the golden list to the two
that change, or say that all six are regenerated and four are expected to be unchanged —
so a surprise diff in the other four is a signal rather than noise.

### Q6 — The Bedrock/Vertex refusal is a user-visible capability removal and should be documented as one

Task 5 detects `CLAUDE_CODE_USE_BEDROCK` / `CLAUDE_CODE_USE_VERTEX` and fails preflight
with `APR_ENVIRONMENT_INVALID`. Failing closed is the right call and the reasoning is
sound. But those users can launch reviewers today, because the current launcher inherits
the whole environment (`src/provider/claude-launch.mjs:506-510` passes no `env`). After
#61 they cannot.

Task 10's documentation step lists what to document and does not include this.
**Requested:** add it to Task 10's docs step and to the plan's rollout notes as a known
limitation with the path to lifting it (a separately versioned adapter classification, as
Task 5 already says).

### Q7 — `protectedParametersMatchEvent` is listed under "Produces"

Task 7's Interfaces line reads "Produces `enterAuthorizationIntervention`,
`cancelAuthorizationIntervention`, `rotateAuthor`, `protectedParametersMatchEvent`, and
protected actions ...". The first three are new; `protectedParametersMatchEvent` is an
existing reducer-internal function being **extended** with two branches. Listing it as
produced reads as a new export, which would be a different (and unwanted) change. Move it
to a "Modifies" note.

---

## 5. What closes this review

**Blocking:** Q1 (correct the predicate, add the gate precondition, state where review
artifacts live — the suite fails on this branch today), Q2 (name the v1 participant
projection and add the RED test that makes the wrong fix fail).

**Significant:** Q3 (manifest schema versioning policy), Q4 (`src/templates/index.mjs`
and the source of the version pin).

**Clarifications:** Q5, Q6, Q7.

These are the last items I expect to have. Q1 is the only one that would have bitten
during execution rather than during review, and it exists because the story gates you
added in P4 are doing their job — the suite that catches it now runs five times instead
of once.
