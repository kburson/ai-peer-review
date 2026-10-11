# Preserved review history and safe migration

The user authorizes #202 to preserve obsolete attempts as history, remove their migration blockage, and continue #107. Old attempted reviews are evidence, not current work. The September 12 predecessors belong to #29; its archive identifies the third attempt as accepted and finalized. Their unfinished protocol state must remain historically truthful.

## Administrative preservation

Add primary-only maintenance verbs `preserve-history <absolute-path> --reason <text>`, `hold-review <absolute-workspace> --reason <text>`, and `release-review <absolute-workspace>`. They require the current selected installation and the clone admission fence, independently of uninitialized primary registration. Dry-run observes and reports without writing. All targets belong to this clone's actual registered worktree scratch inventory, outside reserved broker/runtime/hook stores. No caller supplies a digest or acceptance decision.

A protected catalog in the Git common directory records a closed schema, exact canonical worktree and target paths, preservation kind, operator rationale, timestamp and freshly measured bounded tree digest. Every regular file is hashed from its actual bytes; symbolic links are measured without following them, and special files refuse. Parent paths must be ordinary canonical directories. The record adds evidence; target paths, journals, private bindings, responses and review decisions remain unchanged.

History is permanent exclusion from execution by the selected tool. It never means accepted, abandoned, provider-settled or safely deleted. A byte change invalidates its inventory exemption. Unknown or unclassified entries retain existing refusal behavior. Plain top-level scratch files are passive evidence hashed into the inventory; they cannot become review authority. A genuinely prunable Git worktree entry with no review scratch is retained diagnostically, never admitted or pruned.

## Current review migration hold

A hold is distinct from history. It requires readable existing review authority identifying the exact worktree and preserves all uncertainty. The protected hold blocks review effects while allowing setup to migrate around the unchanged snapshot. It does not reclaim a participant, dispatch a provider, alter a claim, declare an uncertain launch settled, or accept a response. Release requires activated, current primary integration and unchanged held bytes. A released hold permits existing ordinary guards to decide eligibility; it grants no authority of its own.

The inventory freshly validates history and hold snapshots before maintenance. Effect admission reads the private catalog and rejects a history target or unreleased hold before any effect, including nested protocol/provider effects. Release retains an audit record rather than deleting the original preservation evidence. New reviews and all ordinary effects keep the current selected-runtime, activated-primary, provider identity and protocol checks.

## Verification and limits

Tests reproduce the original obsolete-review refusal and cover preservation without target writes, permanent history exclusion, dry-run, edited snapshots, unsafe records/paths, holds versus history, release admission, passive files and disconnected worktree handling. Actual migration then uses only the delivered installed package and native commands. Full suites run in CI; only affected/TIA tests run on the host. Native CI builds remain disabled, original deadlines remain unchanged, and no receipt or participant authority is fabricated.
