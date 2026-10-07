# Runtime selection — child 133

This implements Task 2 of the accepted issue 102 plan. Account-wide selection
is separate from clone primary policy. The production wrapper uses the OS
account profile, its own physical module root and the executing Node path;
no caller account or selection-file override is accepted. The internal store
constructor supports source fixtures and exposes no provider launch capability.

## Locator and inventory contract

`register-runtime --dry-run` validates the executing installed package and
previews the account record. Applying registration writes a private closed
schema record atomically and verifies it. Locator relocation requires explicit
`--update`. Version and inventory digests are observations; they are absent from
the selection equality requirements. An in-place package upgrade retains its
selection ID, while a fresh invocation observes its new bytes.

The installation supplies `runtime-inventory.json`, a closed v1 manifest with a
sorted `files` list of relative path and SHA-256 declarations. Verification
rejects links, traversal, duplicate/unsorted declarations, missing or extra
executable assets, digest mismatches and file replacement during observation.
It bounds declarations, file sizes, total bytes and initial directory traversal.
Descriptor reads check file identity before and after a bounded allocation,
refusing links, oversized inputs and replacement during reads.
Unchanged file/directory identities permit reuse only after revalidation.

The store seals the manifest, Node identity and first selection generation
internally. Runtime replacement, Node replacement or generation changes fence
the existing process even when a caller omits previous observations. Selection
is read again after inventory verification, followed by a synchronous image
revalidation before returning admission. Registration revalidates after account
lookup and read back as well. Three observed failing race tests cover replacement
during these internal waits. A newly created store represents a
fresh process; retaining the old store does not become a fresh invocation.

Public interfaces expose selection reads, explicit registration, selected
runtime admission, read-only inspection and inventory verification. Doctor adds
a read-only selection diagnostic. Startup and installation-identity modules
expose admission observations for the later universal effect-fencing slice.

## Evidence and limits

Targeted source tests passed 25/25 after observed failing behavior. They cover
actual process environment overrides, closed CLI grammar/help, account
unavailability, private records, Node floor, unknown schemas, package and Node relocation,
package/Node replacement, mixed bytes, extra/linked modules, generation fences,
Windows verifier unavailability and a verified Windows directory-contract
fixture. The Windows fixture exercises the native interface contract on this
host; it does not claim a live Windows execution result.

A two-file isolated runtime measured initial admission at about 1.54 ms and
25 revalidated admissions at about 8.90 ms in one sample. These measurements are
fixture evidence, not installed-package or production-hook performance claims.
The unrelated clone dependency sentinel remained byte-identical.

Read-only source process samples measured CLI help at 74.89 ms, the Codex hook
at 41.95 ms and the Claude hook at 45.97 ms for unrelated hook events. Each
exited zero without a provider launch. These are process-start baseline samples;
Task 5 and Task 6 still verify installed hook admission and its cost.

Task 3 still owns primary setup and integration migration; Task 4 owns review
compatibility; Task 5 owns universal production effect admission; Task 6 owns
installed artifact inventory generation, publication and complete installed
matrix verification. This child does not claim the entire epic is deployable.

## Decisions recorded during execution

- An internal store core makes account fixtures independent of real user state.
  If its boundary is wrong, its additional private module needs correction;
  production provider APIs must never accept fixture objects.
- Source registration dry-run refuses rather than treating a source checkout as
  an installed global package. This makes source bootstrap diagnostics stricter.
- The offline command catalog and deterministic help digest intentionally add
  the registration command and stable runtime refusal explanations. Existing
  unrelated help contracts remain covered by the golden checks.
