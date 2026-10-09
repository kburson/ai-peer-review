# Issue 102 Primary Runtime Authority: Single Agent Review

## Scope and provenance

- Issue: [#102](https://github.com/kburson/ai-peer-review/issues/102).
- Artifact: [draft replacement design](../specs/2026-09-29-102-primary-runtime-authority-design.md).
- Method: same-session Codex GPT-6 Astra single-agent review (SAR). No subagent or external provider participated. This is self-review, not independent XPR or user approval.
- Baseline: commit `55f58d52cf09f1532635d7e2c5d77e2b0673ee1f`, design SHA-256 `faf42a62d579d34b3bd298ca632f76dae116f7c4dd66c6420ccbb2efd6ef1aaf`.
- Evidence checked: current setup and config loader, CLI grammar/help, startup reservation, collateral lineage and supersession paths, plus the user's decisions in this task. Pre-existing staged XPR collateral, the legacy project config edit, untracked superseded plan, and native build output were left untouched.

## Round 1: adversarial source and contract review

| ID     | Severity | Finding                                                                                                                                                                                                    | Design revision                                                                                                                                                                                                                                      |
| ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAR-01 | Medium   | `setup --update` was named as an existing form, but the CLI currently exposes `setup` with `--remove`, not `--update`.                                                                                     | Removed the unsupported form. Ordinary repeat `setup` regenerates owned bytes and remains an idempotent no-op when they match.                                                                                                                       |
| SAR-02 | High     | “Replace config on every setup” could overwrite user-authored authority, host identity, and review policy. The current config mixes those fields with AIPR-owned setup metadata.                           | Limited regeneration to AIPR-owned fields and integrations; user-authored config and foreign provider settings are validated and preserved.                                                                                                          |
| SAR-03 | High     | A primary-checkout wrapper may not be discovered when the host starts in a linked worktree. A relative reference may select stale branch content.                                                          | Made one user-scope wrapper the preferred linked-worktree discovery route, with registered-primary resolution through the global tool; a proven pointer is required where user-scope discovery fails. Missing or ambiguous discovery refuses review. |
| SAR-04 | High     | Starting a replacement review after collateral incompatibility could collide with the old review's output, scratch reservation, or lineage, while the new runtime cannot safely supersede the old journal. | Required independent review IDs and paths, preservation of old reservations, a predecessor reference outside old collateral, and ordinary start gates. An incompatible old attempt is diagnosed, not falsely declared terminal.                      |
| SAR-05 | Medium   | Temporary-file lint checks could pass under a different config or ignore scope than the eventual tracked destination.                                                                                      | Required destination-effective host formatter/linter configuration and ignore behavior; an unprovable check refuses setup without partial tracked-file writes.                                                                                       |
| SAR-06 | Medium   | The machine-local primary registration has a schema but no safe bootstrap when a later package cannot read it.                                                                                             | Required an explicit repair path that inspects and preserves the old registration before current-schema replacement; review commands fail closed on an unknown record.                                                                               |

Result: six actionable design findings, all revised in the draft. No application implementation or production tests were performed.

## Round 2: counterexample pass

Re-read the revised design against these cases:

- A user-edited `authority`, `hosts`, or `review` section survives repeated setup while AIPR-owned setup fields and skill/hook bytes refresh.
- A linked worktree has an older tracked skill or no project-local wrapper; host discovery must resolve through the current user-scope wrapper or a proven primary pointer, never that stale copy.
- The global package upgrades while a review is active; supported collateral continues only after current-installation and existing authority checks. Unknown collateral remains read-only.
- The old review has an active collateral reservation or unsupported journal. A new review uses independent paths and does not release or overwrite old state to make progress.
- The primary checkout or global installation moves, the registration schema is unknown, or user-scope setup is missing. Normal mutations refuse and the relevant explicit repair route is exposed.
- A host linter ignores temporary files or has path-dependent rules. AIPR cannot claim a clean result from an inapplicable check or rewrite foreign settings.
- Consumer CI has no AIPR installation; its normal build remains independent of the planning-time tool. The AIPR source CI still validates the installed artifact and package boundary.

No further design-level finding was identified in this pass. Host-specific skill discovery and path-effective lint execution remain implementation proofs required by the design; the SAR does not assert those mechanisms work today.

## Outcome and limits

- Reviewed design SHA-256: `8855d3af82e66a2c901f952d071f5ee2addeaf945a65662adf305fa51043d60b`.
- The replacement design remains a draft pending user review. This SAR does not reapprove the prior XPR, approve an implementation plan, or authorize source-code implementation.
- Document validation: Prettier, Markdown lint, spelling, and Git whitespace checks are run for the two changed Markdown files before commit. No source tests are claimed.

## Erratum recorded after the reviewed snapshot

SAR-01 was factually incorrect: the current source CLI and globally installed AIPR support `setup --update`. Its proposed removal of that command is withdrawn. The other SAR findings retain their original historical record. The replacement spec was subsequently revised to preserve `setup --update` and reconcile work completed after the SAR; its current bytes are outside the reviewed SHA-256 above and require the planned XPR before implementation planning.
