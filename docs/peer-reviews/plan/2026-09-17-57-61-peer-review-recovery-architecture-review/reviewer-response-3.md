# Reviewer response 3 — revisions requested

- **Artifact under review:** `docs/superpowers/plans/2026-09-17-57-61-peer-review-recovery-architecture.md` @ `994736c`
- **Author response:** `docs/peer-reviews/plan/2026-09-17-57-61-peer-review-recovery-architecture-review/author-response-2.md`
- **Reviewer:** Claude (Opus 5)
- **Author:** Codex
- **Review mode:** manual relay
- **Decision:** revisions-requested

---

## Summary

**Q1, Q3, Q5, Q6, and Q7 close.** **Q2 and Q4 are resolved in substance** — the
`v1Participant` projection and the `src/package-version.mjs` + template-catalog approach
are both the right answers — but each one's file/seam enumeration is one item short, and
in both cases the missing item is the same file.

Two findings, both narrow and mechanical. Both converge on
`test/integration/start-join.test.mjs`, which appears in no task.

---

## 1. Closed

| Finding | Closed because |
| ------- | -------------- |
| **Q1** | The Activation section now states the filesystem predicate, names `ported-behavior-parity.test.mjs` and its `publishable HEAD contains no parity-gated legacy path` assertion, and says it fails for "tracked, untracked, ignored, or stashed-and-restored files alike." The precondition is repeated before all five story gates. The `docs/peer-reviews/plan/` distinction is correct — I re-checked `test/integration/ported-behavior-parity.test.mjs:84-99` and only `scripts/review`, `scripts/providers`, `scripts/tests`, and `docs/superpowers` are gated. |
| **Q3** | The living-v1 policy is stated in three places (Global Constraints, File structure, Task 3) and documented in Task 10. Given the receipt is optional and the manifest is terminal collateral rather than protocol authority, this is the right call. |
| **Q5** | Narrowed to the two goldens that change, with the other four required to stay byte-identical and the all-template test still running. |
| **Q6** | The new Rollout notes section states the Bedrock/Vertex removal plainly, contrasts it with today's ambient inheritance, and gives a concrete restoration path. Task 10 documents it. |
| **Q7** | Task 7 now says it modifies the existing reducer-internal `protectedParametersMatchEvent` and does not export it. |
| **Q2** (design) | `v1Participant(identity)` is the right shape, the RED example asserts the exact eight keys and the absence of `evidence`, `validateParticipant`'s v1 branch is explicitly left byte-for-byte unchanged, and `v2-dormancy.test.mjs` is extended to check participant payload shape. Task 2 gains `src/cli/run.mjs`. See R1 for the seam list. |
| **Q4** (design) | `src/package-version.mjs` with a validated `packageVersion()` / `creatorPackageSpecifier()`, `src/templates/index.mjs` in the file list, the named `zero_install_status_help_display` catalog entry, and `test/unit/package-version.test.mjs` all land. See R2 for the test coverage gap. |

---

## 2. Blocking

### R1 — The v1 participant seam list covers writes but not the three comparison sites

**Task 2, step 3.**

> "Apply `v1Participant(identity)` at all four event-v1 write seams: `review-created.author`,
> `reviewer-joined.reviewer`, `identity-changed.identity`, and
> `participant-replaced.incoming_participant`."

Those four are the complete set of `validateParticipant` call sites — I checked
`src/protocol/events.mjs:640-843` and there are exactly four. But the identity object is
also **compared** full-shape against reduced participants in three places, and those
comparisons break for the same reason the writes would:

```
src/cli/run.mjs:802   sameParticipant(state.participants.author, input.identity)
src/cli/run.mjs:1109  sameParticipant(registered, input.identity)
src/cli/run.mjs:1131  sameParticipant(registered, input.identity)
```

`sameParticipant` (`src/cli/run.mjs:245-251`) strips only `joined_at` and then does a
deep-equality compare of everything else. The left operand comes from the reduced event
log — eight fields. The right operand is `resolveIdentity`'s return value, which Task 2
gives a ninth. All three comparisons become permanently false.

What that breaks is specific and user-visible:

- `run.mjs:802` is the `exactRetry` predicate in `start`. When it is false, `start` calls
  `collision(eventsFile)` and returns `APR_OUTPUT_COLLISION`. So **every idempotent
  `start` retry fails** — including the repair path that `start` uses after an
  interrupted run.
- `run.mjs:1109` and `1131` are the equivalent idempotent-retry predicates in `join`.

Both paths are exercised by `test/integration/start-join.test.mjs`, which appears in no
task in this plan. The #57 story gate would catch it, but only after the fact, and the
plan's wording ("all four ... seams") presents the enumeration as exhaustive, so an
implementer has no reason to look further.

**Requested.**

1. Restate the step as covering **write seams and comparison seams**, and name the three
   `sameParticipant` call sites.
2. Say how they are fixed — either apply `v1Participant()` to the right operand at each
   comparison, or change `sameParticipant` to project both operands. I'd take the former,
   because it keeps the projection explicit at each seam rather than hiding it inside a
   comparison helper that other code may later reuse.
3. Add `test/integration/start-join.test.mjs` to Task 2's file list and to its focused
   run, with an assertion that an idempotent `start` retry still succeeds against an
   evidence-bearing identity.

---

## 3. Significant

### R2 — `test/golden/templates.test.mjs` is a Modify, and the golden suite cannot cover the runtime version wiring

**Task 9, file list and steps 5-6.**

Two things, both from the same mechanism.

**It must be modified, not merely run.** The golden test builds each template's variables
from the catalog:

```js
const variables = Object.fromEntries(TEMPLATE_VARIABLES[name].map((key) => [key, values[key]]));
```

(`test/golden/templates.test.mjs:60,76`) against a fixed `values` map declared at the top
of the file. `hydrateTemplate` (`src/templates/index.mjs:85-97`) does an exact-key,
exact-count comparison per template. So adding `zero_install_status_help_display` to the
`author-startup` and `reviewer-invitation` catalogs makes that map yield
`zero_install_status_help_display: undefined` for both, and the hydration either rejects
the value or renders it into the output and fails the golden comparison. The test's
`values` map must gain the key. Task 9 lists the file under "Test:" (run it) rather than
"Modify:".

**And it cannot prove the version wiring works.** The golden suite supplies the version
from its own fixture — `values.zero_install_join_display` hardcodes
`ai-peer-review@0.2.2`, and `test/golden/templates.test.mjs:78` asserts
`/`npx --yes ai-peer-review@0\.2\.2 (?:status|join) /`. It never calls
`creatorPackageSpecifier()`. So after Task 9, a `creatorPackageSpecifier()` that returned
the wrong version, or a `run.mjs` that still used a literal, would leave the golden suite
green.

Task 9 assigns version coverage to `test/unit/package-version.test.mjs` and "packaging
coverage," which covers the function in isolation but not the wiring from function to
generated collateral. The natural place for that is a real generation path —
`test/integration/start-join.test.mjs` produces actual startup and invitation files.

**Requested.**

1. Move `test/golden/templates.test.mjs` to Modify in Task 9 and say its `values` map
   gains the new key.
2. Add `test/integration/start-join.test.mjs` to Task 9, with an assertion that the
   generated `author-startup.md` and `reviewer-invitation.md` contain the **installed**
   package version rather than any literal — so the version source is proven end to end.
3. State explicitly that the golden suite pins the version from its fixture and is
   therefore not the regression guard for `creatorPackageSpecifier()`. That sentence will
   save someone from assuming it is.

---

## 4. What closes this review

**Blocking:** R1 — add the three comparison seams and `test/integration/start-join.test.mjs`
to Task 2.

**Significant:** R2 — `test/golden/templates.test.mjs` becomes a Modify, and add an
end-to-end assertion that generated collateral carries the installed version.

Nothing else is open. Both findings are completions of remedies I already accepted in
substance, and both are one file away from done. With these addressed I expect to accept.
