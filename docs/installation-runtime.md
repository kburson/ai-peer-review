# Installation and migration

Install the scoped package on the developer or agent host:

```bash
npm install --global @kburson/ai-peer-review
peer-review-verify-deployment --json
ai-peer-review build broker-security
peer-review register-runtime --dry-run
peer-review register-runtime
```

Native bootstrap is explicit and offline. Provision matching local Node headers,
Python, a compiler, and the Windows import library beforehand. The build command
derives the matching development tree from the running Node installation.
For an explicit development root:

```bash
npm --prefix /absolute/installed/package run build:broker-security -- --nodedir /absolute/node-development-tree
```

The deployment diagnostic checks package assets without registry access or
project/account writes. A verified status means package integrity passed.
Native requires-build or runtime-inventory requires-bootstrap status requires
the explicit native build before review use. Bootstrap verifies unchanged
shipped assets and exact runtime dependencies inside the installed package root, publishes its native helper and
identity, and atomically extends the inventory to executable dependencies in the
installation. A changed package requires reinstallation; bootstrap never reseals
changed ai-peer-review source bytes.

Run these from the repository's primary checkout:

```bash
peer-review primary register --dry-run
peer-review primary register
peer-review setup --agent codex --scope project --dry-run
peer-review setup --agent codex --scope project --confirm-scratch-exclude
```

Commit the proposed owned primary files, then inspect and activate that policy:

```bash
peer-review primary activate --dry-run
peer-review primary activate
peer-review doctor --mode installation
```

The primary owns portable policy and the shared review skill. Linked worktrees use
that activated policy while retaining their own project dependencies and review
workspaces. Account-level runtime selection is shared by clones and identifies
the actual package path and Node executable. Project-local dependencies and source
checkouts cannot register as the shared runner.

For an in-place global upgrade, rebuild the native helper, run deployment and
doctor diagnostics, and refresh stale owned integrations with setup --update
--dry-run followed by setup --update. Commit and activate changed owned primary
files. The selection records locators, so unchanged paths need no version-pin
edit. A relocated global package or Node executable requires one explicit
register-runtime --update --dry-run, then register-runtime --update. Existing
processes fence changed bytes; use a fresh invocation of the current installation.
Historical runtime images remain evidence. Supported collateral can continue;
unsupported collateral remains intact and read-only.

## Portable candidate inventory bootstrap

The #190 candidate ships an explicit JavaScript inventory bootstrap for fresh
portable installation verification. After installing its exact tarball globally,
run the utility from that installed package, before runtime registration:

```bash
node /absolute/global/node_modules/@kburson/ai-peer-review/scripts/bootstrap-portable-runtime.mjs
peer-review register-runtime --dry-run
peer-review register-runtime
```

Use the actual global package directory reported by `npm root --global` (with the
platform's corresponding absolute path). The utility accepts no options and
operates only on its executing installation. It verifies unchanged shipped
assets and exact installed dependency versions, then atomically seals those
actual dependency bytes. Repeated execution verifies the existing inventory;
changed source or dependencies refuse without resealing.

This operation builds no native broker and initializes no review or capture
registration. Inventory integrity alone does not establish process-source
coverage, primary activation, broker readiness or review identity. Those retain
their independent current-runtime and normally reviewed finite-source gates.
Actual installed/manual OS acceptance and the whole #107 release remain pending.

## Source CI and releases

Source maintainers run tests, lint, formatting and release verification in this
repository. During the #102/#107 verification pause, source unit and integration
commands run the retained suites without building the native helper. Broker tests
and native-dependent installed fixtures are explicitly skipped. Native bootstrap
remains an explicit installation operation until #107 supplies the replacement.

Build the actual publishable artifact with:

```bash
npm run pack:runtime -- --json --pack-destination /absolute/artifact-directory
```

The command stages runtime files and a runtime-only manifest in temporary storage,
then runs actual npm pack on that stage. It leaves source metadata unchanged.
Ordinary packing or publishing of the source root refuses; publish the inspected
tarball. Tests and release CI use this same command. The tarball excludes source
tests, fixtures, local AITM dependencies, planning records, development npm
scripts, and source release/extraction verifiers. Runtime formatting/lint reference
assets remain available for setup validation.

Platform CI exercises actual installed fixtures on Windows, macOS and Linux with
supported Node versions. A local run establishes only its actual host/Node result.
Consumer cloud tests and deployment need no ai-peer-review installation, primary registration,
doctor command or review gate. Source CI owns packaging and release checks.

## Issue 107 boundary

Until #107 delivers its install-ready portable transport, this package retains
the current native broker source and explicit build helper. This delivery adds
runtime inventory and deployment verification; it does not supply a portable
broker or route execution to retained older packages.

Broker startup uses a two-minute elapsed readiness deadline, counting connection work as well as retry delays, while recovery completes; discovery stays unpublished until ownership and restoration are ready. Authenticated native broker command replies have a bounded two-minute read budget for admitted registration and reconciliation work. Unauthenticated handshake and incomplete client frames retain their five-second deadlines. Before command submission, a typed busy native endpoint or frame-prefix handshake timeout may reconnect within a bounded two-minute acquisition window; malformed/truncated handshakes remain terminal and authority is revalidated immediately before an effect command is sent. Retirement reacquisition shares the original command acquisition deadline. An already-started native connection or handshake keeps its existing bounded timeout; a connection completed after the deadline is closed without submitting a command. A timed-out submitted command is never replayed automatically; preserve its evidence and reconcile the operation before retrying.

## Temporary native verification pause

During delivery of #102 and the JavaScript broker replacement in #107, source CI omits native compiler/header provisioning and broker builds. Default source suites omit broker tests and installed fixtures that compile the native helper, and report those exclusions explicitly. Native broker coverage is paused; these skips are not passing broker evidence. The runtime tarball still retains native source assets until #107 replaces the transport. Consumers continue to run their ordinary builds independently of ai-peer-review.

Account selection and protected primary registration readers now use stock portable operations. Their portable controls run independently of the native broker build. Installed journeys that require the completed portable transport remain pending its delivery; native-dependent exclusions continue to be reported explicitly.

## Awaited runtime and primary observations

JavaScript callers must await `configPaths`, `loadConfig`, `resolvePrimaryAuthority`,
runtime registration, and current-operation authority checks. These operations
verify the actual account, installed bytes, protected records, and physical Git
membership before returning. Existing CLI JSON schemas remain unchanged.

Replacing a selected runtime or primary registration revokes its previous physical
generation, including replacement with identical bytes. Copied or serialized
observations cannot authorize effects. Retry through a fresh classified entry point
after completing explicit registration or activation.

The process-source contract binds the generated closure of actual storage, election,
owner, and HTTP dependencies. Changing covered code leaves the previous source
classes unavailable until normal installed recapture and adoption. Ordinary
execution preserves ownership and refuses without a native fallback.
