# #144 bounded plan and checker preparation — 2026-10-05

Status: reviewable draft preparation, not owner adoption or CODE_COMPLETE.

## Exact review subjects

- Owner addendum: `docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md`, SHA-256 `cfc32c539018e805c59319d47ff7e4de5083048329f8cbdc67a2b49fc752d725`.
- #107 plan amendment: `docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md`, SHA-256 `b36e85e2417cef877480b5f1a0c5c13c745e7bef5f84c8006a0ab8febdf28f19`.
- Accepted design remains at SHA-256 `4e8d38f06fb53b963089cfe5835e2722cc31a3053ac3ba7076467d93e6973405`; normal independent review finalized at `59f9628f30ea3945d92972196d7acda4350592a5`. Its original reviewed bytes are preserved.

## Manual author SAR

This is one author machine review against the two exact draft subjects above. It is not a native SAR session, an independent XPR, a human approval, an owner adoption or an assertion of an observed runtime model. The invoking #144 actor is the genuine author session fingerprint from the accepted design review; its run-scoped model/effort selection was declared rather than observed.

| Review question                                                    | Analysis and disposition                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does the owner addendum preserve current and historical authority? | It preserves #102 accepted spec/plan, #30 pre-revision and current revised plan separately, and #34 umbrella Task 5. The old #30 review is superseded; its round-2 template is not acceptance. No whole-plan or draft acceptance is inferred.                                                             |
| Is owner scope independently reviewable?                           | Four explicit bounded subsections define runtime/policy, canonical evidence, observation-only analytics and attempt telemetry. Each owner still needs its lawful session, exact disposition and normal plan-review reference. #130 remains a missing detailed-schema dependency.                          |
| Do proposed evidence records respect #30 corrections?              | #30 Task 4 Step 18's terminal overlay allowlist is preserved. Contract decisions use separate successor/contract artifacts; activation proof is a separately reviewed immutable sibling with exact contract/release binding. It cannot change accepted decisions.                                         |
| Does the amendment resolve the dependency cycle honestly?          | Task 5 adoption-only VC can prove accepted contracts without a later publishable tag/tarball/live receipt. Default publication, Task 8, quarantine and Task 18 still need real release-specific activation proof and all fifteen gates. Source-plan/issue mapping changes only after exact repeat review. |
| Does policy adoption erase #107 roster/config requirements?        | It dispositions cross-store ownership under one whole bundle while preserving within-owned-policy defaults, profiles, arrays, pointers, caps and fallback requirements. #130 detailed schema acceptance remains necessary for production config completion.                                               |
| Is actual review lineage claimed from an incompatible importer?    | No. The real 0.4.1 producer succeeds; the source 0.4.0 importer refuses startup author grammar. Both results are preserved. Future checker work must verify matching strict producer/source evidence, not strip fields.                                                                                   |
| Are these drafts accepted or executable release authority?         | No. The plan subjects are prepared but have not been externally reviewed. Native owner adoption, final applied canonical plan review, authoritative record review and approved selector are absent.                                                                                                       |

Manual SAR disposition: the two exact draft subjects are suitable for the requested independent review, subject to root's concrete scope review and the normal external payload approval path. This disposition cannot satisfy owner or independent-review acceptance.

## Genuine checker RED/GREEN

The original structural fixture omitted closed normal fields. The complete fixture now includes record ID, residual risk, startup commit, identity changes, claims, recoveries, supplements, authority, human decision, full participants/evidence, artifact snapshots and complete turn objects. It remains explicitly synthetic unit data.

New negative cases omit nine required normal fields or add malformed/unknown nested participant, authority, history/turn or lineage fields. Before implementation, 30 previous unit cases passed and 17 new cases failed for the missing manifest refusal.

- RED: `.scratch/144/checker-closed-red.stdout.txt`; exit 1, 30 passed / 17 failed.
- GREEN: `.scratch/144/checker-closed-green-first.stdout.txt`; exit 0, 47 unit + 3 offline Git integration passed.
- Affected-file lint: `.scratch/144/closed-lint.stdout.txt`; exit 0.
- Changed-file formatting: `.scratch/144/closed-format-check.stdout.txt`; exit 0.
- Exact command/SID/timestamp/exit receipts remain in `.scratch/144/prerequisite1889-commands.jsonl`. The historical runner reason field names the original prerequisite review; actual command arrays/cwd/SID show these authorized #144 preparations.

The document-only checker uses the checked-in closed manifest schema, Task 6's public primitive validator and canonical manifest terminal coherence. No public runtime/source parser is changed. Unknown schema vocabulary and unresolved references refuse.

## Actual producer/importer diagnostic

Root's complete public proof was read from its supplied parent worktree files:

- `.scratch/gh/144-root-xpr-lineage-check.json`: source 0.4.0 inspector returns lineage-invalid/workspace-invalid.
- `.scratch/gh/144-root-xpr-lineage-diagnostic.json`: actual fourteen event types preserved; reduction fails with APR_EVENT_INVALID, startup runtime.
- `.scratch/gh/144-root-current-producer-lineage-check.json`: unmodified producer 0.4.1 canonical inspector returns complete with no reasons/missing attempts and event digest `sha256:67f157fd242c20727907a832c89188990afa35e0f1ffaf5d2ed513a18f3dc592`, matching the accepted manifest.

Producer proof records event-validator source SHA-256 `52659c85759d1b31e666f761800c9c4120d2b4178cf4bc96ef5c8cdf20c2cda1` and canonical inspector SHA-256 `9dc3e0be355b48aecb5414a3959b5f42c2869a7889335ed76f97c60a96cb2776`. These are observed source hashes, not a claim that a version label alone authenticates source.

The old startup closed grammar excludes author; the producer grammar admits the exact declared author selection. The journal and accepted review remain unchanged. No fields are removed or rewritten to force old-parser acceptance, and no raw provider handles are copied into tracked evidence.

## Remaining authority limits

The checker still needs version-bound full persisted event/source identity verification. Its embedded lineage shape and finalization tree/trailers are insufficient alone. The checked-in source schema is not claimed compatible with every newer producer.

Atomic coupled decision enforcement, immutable contract/activation sibling separation and explicit adoption-only mode still need their own RED/GREEN. The default publication gate remains blocking. Detailed implementation schema bytes absent from owner work are not accepted by these drafts.

No actual owner dispositions, accepted owner addendum, accepted applied canonical plan, authoritative adoption JSON, release activation addendum, approved-ref selector, native Test, exact-head CI, PR or CODE_COMPLETE is claimed.
