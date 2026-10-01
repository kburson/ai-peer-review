# Primary authority and configuration APIs

`resolvePrimaryAuthority({ cwd })` resolves the caller's physical worktree and
reads its clone-local primary activation record. It returns the registered main
checkout `root`, `commonDir`, `configPath`, `skillPath`, `activationDigest`,
`ownedBlobs`, `integrationContract`, `activeWorktreeRoot`, and the validated
primary `config` snapshot. It never registers or activates files. Missing,
uninitialized, unknown or physically invalid registration refuses with
`APR_PRIMARY_AUTHORITY_UNAVAILABLE`.

The resolver checks canonical on-disk Git membership with caller `GIT_*`
overrides removed. Config and shared skill must be ordinary non-symlink files.
Their HEAD blobs, all index stages, and working bytes must match the activated
receipt. Unrelated edits and merge/rebase metadata do not invalidate clean owned
files. A different committed policy reports its activated and current blob IDs
without changing the receipt. Paths containing spaces are supported.

`configPaths` and `loadConfig` remain synchronous. For registered clones,
`project` identifies the primary `.ai-peer-review/config.json`; `primaryRoot`
and `activeWorktreeRoot` distinguish policy authority from active review state.
Outside Git these three fields are `null` and only user configuration is read.
A linked legacy `.ai-peer-review.json` is ignored and diagnosed, never merged
into an activated primary policy. The loader uses the validated config snapshot
from the authority observation rather than rereading unverified project bytes.

`resolveConfigFields({ primary, user, explicitIdentity })` validates closed
partial stores before assembling a closed `ai-peer-review.config/v2` result.
Primary stores declare `ai-peer-review.primary-config/v2`; user stores declare
`ai-peer-review.user-config/v2`. Primary owns authority, review, portable setup,
guard enabled and automatic protocol/capability. User owns identity hints,
resume/guard commands and automatic command/timings. Explicit identities are a
host-keyed map and take precedence over hints; this API provides no participant
identity proof. Commands are copied so later preference mutations do not rewrite
the resolved snapshot. The complete automatic object must satisfy protocol and
duration constraints after assembly. Selected-runtime command validation occurs
in the dependent runtime and operation-boundary components.

Primary setup metadata uses format 3 and contains owner, agents, and optional
skill digest/integration contract. It contains no executable locator or exact
package version. A user's separate setup ownership is never merged into primary
setup. Published schemas cover both partial stores and the assembled result;
legacy v1 validation remains available for explicit migration.

This first implementation slice preserves legacy unregistered setup loading
until the dependent setup migration and universal operation fences land. That
transitional path does not provide registered primary authority. Normal project
mutation must use the strict resolver; the epic is not ready for release until
all dependent slices enforce it. Registration writes, active-review inventory,
activation receipts, integration checks and global runtime selection are owned
by those dependent slices.
