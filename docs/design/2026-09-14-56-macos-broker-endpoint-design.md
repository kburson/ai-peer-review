# Issue #56: macOS Broker Endpoint Correction

<!-- cspell:words aipr bindat chdir EEXIST nonsymlink sockaddr injective unpadded noninteger nonpositive -->

**Status:** Proposed correction for peer review

**Issue:** [#56](https://github.com/kburson/ai-peer-review/issues/56)

**Supersedes:** The Unix socket pathname layout at lines 260–265 and extends the
security rule at line 279 plus the stable-error list at lines 335–336 of
`docs/design/2026-09-14-project-local-spr-xpr-broker-design.md`. It also
supersedes the matching Task 3 **Interfaces**, Task 3 layout, and Task 4
**Interfaces** instructions at lines 172, 192, and 199 of
`docs/plans/2026-09-14-project-local-spr-xpr-broker.md`. The issue #56
implementation plan will be the executable replacement authority for those plan
lines once it exists and passes its own peer review. The accepted epic documents
remain sealed and are not edited; this issue-numbered correction has precedence
only for the clauses named here. The new stable errors extend rather than
replace the accepted list.
The canonical root tuple, full SHA-256 digest, metadata and lock authority,
handshake, ownership, compatibility, and recovery requirements remain in force.

## Problem

The accepted project-local broker design places the Unix socket at:

```text
<user-cache>/ai-peer-review/brokers/<64-hex-root-digest>/broker.sock
```

The active macOS SDK declares `sockaddr_un.sun_path[104]`, leaving 103 bytes for
a NUL-terminated pathname. The accepted pathname is 130 UTF-8 bytes under the
real `/Users/kpburson/Library/Caches` root and 117 bytes even when the home
directory is only `/x`. Task 3's byte-accurate preflight therefore rejects every
conforming macOS home path before Task 4 can bind the socket.

The rejection is correct. The pathname contract is not.

## Goals

- Preserve all 256 bits of the existing canonical project-root SHA-256 digest.
- Keep deterministic per-project and per-user routing across package upgrades.
- Fit realistic macOS cache roots within the 103-byte pathname limit.
- Remain injective on case-sensitive and case-insensitive filesystems.
- Keep the full-digest directory as lock and metadata authority.
- Retain fail-closed byte-length validation for unusually long cache roots.
- Leave the Windows named-pipe contract unchanged.
- Give Task 4 every protected parent path and an unambiguous security contract
  for the separated socket parent.

## Non-goals

- TCP fallback, a shared port, Linux abstract sockets, or an endpoint override.
- Digest truncation, reduced collision resistance, or routing by package version.
- Dual-probing or migrating unreleased pre-0.3 broker endpoints.
- Weakening owner, symlink, peer-credential, lock, nonce, or handshake checks.
- A caller-selected endpoint pathname. The supported endpoint-root input selects
  only the protected parent namespace; the digest-derived token remains fixed,
  and lock/metadata authority never moves with that input.

## Considered approaches

### 1. Lowercase, unpadded base32 in a compact cache namespace

Encode the same 32 digest bytes with the lowercase alphabet `a-z2-7`, producing
exactly 52 characters, and place the Unix socket at
`<user-cache>/aipr/v1/<token>`.

This is the selected approach. It is lossless, deterministic, portable across
case-folding filesystems, recognizable as ai-peer-review state, and short enough
for realistic macOS home paths.

### 2. Unpadded base64url

Base64url produces only 43 characters, but its mixed-case alphabet is not an
injective pathname representation on the case-insensitive filesystems commonly
used by macOS. Treating letter case as identity would silently reduce the
filesystem routing space. That contradicts the full-identity requirement.

### 3. Full hexadecimal digest under a system temporary directory

A shorter global prefix could fit the existing 64 hexadecimal characters, but
it would abandon the accepted per-user cache-root contract, complicate ownership
and cleanup semantics, and still require a secure per-user namespace. This adds
risk without improving identity integrity.

## Corrected path contract

`brokerPaths({ identity, platform, env, home })` extends its return shape with
the authority-cache and endpoint trust anchors, their source classifications,
and both ordered protected directory chains:

```js
{
  cacheRoot,
  cacheRootSource,
  endpointRoot,
  endpointRootSource,
  authorityDirectories,
  directory,
  endpointDirectories,
  endpoint,
  lock,
  metadata,
}
```

`cacheRoot` is the stable absolute `<user-cache>` path for lock and metadata
authority. It never changes in response to the endpoint-root input. `endpointRoot`
is the absolute POSIX parent beneath which `aipr/v1` is derived; it equals
`cacheRoot` unless an explicit endpoint root is configured. Windows returns
`endpointRoot: null` because its named-pipe endpoint has no filesystem root.

Input mapping is normative:

| Platform    | Input                                             | Valid mapping                                                  | Invalid defined value                                                             | Creation policy                                             |
| ----------- | ------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| macOS       | `~/Library/Caches`                                | `cacheRootSource: platform-default`                            | N/A                                                                               | Must already exist and pass anchor checks                   |
| Linux       | absolute, nonempty `XDG_CACHE_HOME`               | `cacheRootSource: xdg-configured`                              | Empty or relative fails `APR_BROKER_PATH_INVALID`; this ratifies shipped behavior | Must already exist and pass anchor checks                   |
| Linux       | absent `XDG_CACHE_HOME`, then `~/.cache`          | `cacheRootSource: home-default`                                | N/A                                                                               | May create `.cache` relative to a retained safe home handle |
| Windows     | absolute, nonempty `%LOCALAPPDATA%`               | `cacheRootSource: platform-default`                            | Missing, empty, or nonabsolute fails `APR_BROKER_PATH_INVALID`                    | Must already exist and pass anchor checks                   |
| macOS/Linux | absolute, nonempty `AI_PEER_REVIEW_ENDPOINT_ROOT` | `endpointRootSource: configured`                               | Empty or relative fails `APR_BROKER_PATH_INVALID`                                 | Must already exist and pass anchor checks                   |
| macOS/Linux | absent `AI_PEER_REVIEW_ENDPOINT_ROOT`             | `endpointRootSource: cache-root`; `endpointRoot === cacheRoot` | N/A                                                                               | Reuses the validated cache-root handle                      |
| Windows     | `AI_PEER_REVIEW_ENDPOINT_ROOT`                    | Ignored; `endpointRootSource: named-pipe`                      | All values ignored                                                                | No endpoint directory                                       |

When a configured input fails, the error context names the specific variable;
`APR_BROKER_CACHE_ROOT_UNAVAILABLE` recovery therefore never has to infer
whether `XDG_CACHE_HOME` or `AI_PEER_REVIEW_ENDPOINT_ROOT` selected the observed
path. The explicit endpoint-root setting is the supported recovery for a macOS
home whose default endpoint would be too long. It changes neither project
identity nor the single full-digest lock location.

`authorityDirectories` is the deeply frozen ordered array
`[<user-cache>/ai-peer-review, <user-cache>/ai-peer-review/brokers,
<user-cache>/ai-peer-review/brokers/<digest>]`. The last entry equals
`directory`; neither the authority nor security layers reconstruct this chain
with `dirname`.

The lock and metadata directory remains:

```text
<user-cache>/ai-peer-review/brokers/<64-lowercase-hex-root-digest>/
  broker.lock
  broker.json
```

On macOS and Linux, the endpoint becomes:

```text
<endpoint-root>/aipr/v1/<52-character-lowercase-base32-root-digest>
```

There is no suffix. `aipr` is the stable package namespace and `v1` versions the
pathname encoding/layout, not the broker protocol or project identity. Package,
broker-protocol, and Node versions remain excluded from routing.

On macOS and Linux, `endpointDirectories` is the deeply frozen ordered array
`[<endpoint-root>/aipr, <endpoint-root>/aipr/v1]`. The path layer owns both
derivations; the security layer must not reconstruct them with
`dirname(endpoint)`. Both directories are per-user and shared by every
project-local broker for that user. Only the token leaf is per-project.

On Windows, `cacheRoot`, `authorityDirectories`, `directory`, `lock`, and
`metadata` have the same filesystem contract as on Unix. The endpoint remains:

```text
\\.\pipe\ai-peer-review-brokers-<64-lowercase-hex-root-digest>-broker.sock
```

Windows returns a deeply frozen empty `endpointDirectories` array because a
named pipe has no filesystem parent. Its security implementation receives that
empty array and validates the pipe's owner-only DACL and client token; applying
`dirname` to the logical pipe label is forbidden and tested. The historical
`-broker.sock` suffix is retained deliberately for compatibility.

The socket token is RFC 4648 base32 applied to the 32 bytes represented by the
validated lowercase hexadecimal digest, with the alphabet rendered lowercase
as `abcdefghijklmnopqrstuvwxyz234567` and padding omitted:

1. Decode exactly 64 lowercase hexadecimal characters to 32 bytes.
2. Read the bytes as one ordered bit stream, most-significant bit first.
3. Emit 5-bit groups using `abcdefghijklmnopqrstuvwxyz234567`.
4. Place the final data bit in the most-significant bit of the last 5-bit group
   and zero that group's remaining four bits.
5. Emit no `=` padding and no uppercase characters.

Every valid digest produces exactly 52 characters. Decoding that token recovers
all 32 original bytes. The path derivation never hashes again, truncates, or
normalizes caller-controlled text.

## Length boundary

POSIX endpoint length remains `Buffer.byteLength(endpoint, 'utf8')`; Windows
continues to use JavaScript string units for the injected named-pipe limit.

For the real macOS home in which the defect was reproduced:

```text
/Users/kpburson/Library/Caches/aipr/v1/<52-character-token>
```

is 91 UTF-8 bytes. A 27-byte absolute home path still fits exactly at 103 bytes.
For the default macOS root this means a conventional `/Users/<short-name>` home
fits only when `<short-name>` is at most 20 UTF-8 bytes. A longer default path is
not silently redirected: preflight throws
`APR_BROKER_ENDPOINT_TOO_LONG` before any directory, lock, metadata, or endpoint
resource is opened.

The macOS offline recovery gives one action: configure an existing shorter,
private absolute directory through `AI_PEER_REVIEW_ENDPOINT_ROOT` and rerun. The
chosen root must pass the anchor checks and the recomputed endpoint must fit 103
bytes. Lock and metadata authority remain at `~/Library/Caches`, so a second
broker using the default endpoint root still loses the same project lock. Linux
recovery likewise may select a shorter endpoint root. No test or runtime path may
substitute an unrelated short socket solely to bypass this check.

Darwin's injected maximum is 103 usable bytes because its active SDK declares
`sun_path[104]`. Linux declares `sun_path[108]`, so its injected maximum is 107
usable bytes. Tests exercise the same exact-limit/one-byte-over behavior against
each injected value; they do not imply that Darwin and Linux share a limit.

## Security and ownership

The compact token is routing information, not trust evidence. Authentication
continues to require the live handshake's full canonical root tuple, package
version, broker protocol version, Node major, instance ID, nonce proof, and
kernel-reported peer user.

Task 4 must treat both locations as protected resources. `cacheRoot` is the
authority trust anchor and `endpointRoot` is the POSIX routing trust anchor. Each
must be an absolute, user-owned, non-symlink directory that is not writable by
group or other before a package-private child is created. A platform cache may
be shared by applications and need not be `0700`, but it must satisfy that
non-writable boundary. Selecting absolute `XDG_CACHE_HOME` or
`AI_PEER_REVIEW_ENDPOINT_ROOT` is configuration, not proof of safety.

Configured roots and platform-default roots must already exist; the package
never creates their arbitrary ancestors. The sole creation exception is the
Linux `home-default`: after validating and retaining the absolute home as a
user-owned, non-symlink directory not writable by group or other, Task 4 may
create its direct `.cache` child as `0700` relative to that retained home handle.
It then applies the identical root owner, mode, type, and no-symlink
post-conditions before use. An absent root outside that exception, or any unsafe
authority or endpoint root, fails closed with
`APR_BROKER_CACHE_ROOT_UNAVAILABLE`, identifies its authority/endpoint role and
source variable, and gives one recovery action.

Below that anchor, Task 4 creates and validates every package-owned level:

- `openPrivateDirectory(paths.cacheRoot, paths.authorityDirectories)` creates
  each absent authority-directory level as owner-only (`0700`) and validates and
  retains the full chain through the full-digest metadata and lock directory. It
  returns retained cache-root and leaf-directory handles for subsequent
  ownership operations.
  After the first level is opened relative to the retained cache-root handle,
  every child is created and opened relative to its retained parent handle with
  no-follow semantics. A pre-existing level is accepted only after owner, mode,
  directory type, and no-symlink validation. A per-level `EEXIST` race is
  successful only after those same post-conditions pass.
- On POSIX,
  `listenPrivate(paths.endpointDirectories, paths.endpoint, { lock, endpointRoot })`
  receives both ordered directories, the retained endpoint-root handle, and the
  live lock handle returned by `acquireExclusive`; an endpoint-root or lock pathname
  is not sufficient. Starting from that retained endpoint-root handle, it creates
  and opens the first endpoint directory relative to the handle and every
  subsequent directory relative to the retained handle for its parent, always
  with no-follow semantics. Each absent level is created owner-only (`0700`),
  and every level's owner, mode, directory type, and no-symlink post-conditions
  are validated before continuing. If concurrent brokers for different
  projects lose `mkdir` with `EEXIST` at either level, that race is successful
  only after the observed level passes those complete post-conditions. It
  creates the socket as owner-only where the platform permits and retains the
  directory and endpoint identity handles through the owned lifetime.
- On Windows,
  `listenPrivate(paths.endpointDirectories, paths.endpoint, { lock })` treats
  the live lock handle as ownership authority, consumes the path layer's frozen
  empty directory array, creates no endpoint directory, and applies the existing
  owner-only named-pipe DACL and client-token checks.
- Owner verification detects replacement or unlink of the cache-root anchor,
  any authority-directory level, either endpoint-directory level, the lock
  evidence, or endpoint. Replacement or unlink of a shared authority parent or
  endpoint parent fences every broker that observes it; each preserves its own
  retained evidence and refuses further delivery. A per-project broker never
  removes a shared authority or endpoint directory, including when it appears
  empty.
- Only the verified holder of the full-digest `broker.lock` may unlink the
  endpoint whose token derives from that same digest. After acquiring that lock
  and reconciling project/provider authority, the holder probes a present socket;
  a failed authenticated connection plus retained lock ownership permits removal
  of that exact stale socket before bind. Without the lock, stale-looking socket
  state is never removed.

`broker.json` remains discovery-only. When Task 4 writes metadata schema v1, it
records the full root tuple and digest plus `cache_root`, `cache_root_source`,
`endpoint_root`, `endpoint_root_source`, and `endpoint_layout_version: 1`. It
does not duplicate the derived endpoint token; diagnostics derive that token
through the same canonical path function. A client may use the recorded endpoint
root only as an untrusted routing hint: it revalidates the root, re-derives the
token, and still completes the full live handshake. Adding the token later would
require an explicit metadata-schema change. Neither metadata nor the
layout-version field could ever replace live authentication. The metadata schema
version and the independent pathname-layout version do not move in lockstep.

A pre-existing foreign-owned, non-directory, permissive, or symlinked
`ai-peer-review`, `brokers`, or full-digest authority-directory level fails with
`APR_BROKER_AUTHORITY_PARENT_UNSAFE`. Recovery is non-destructive and identifies
the exact observed condition. Mid-lifetime replacement or loss of any authority
level fails with `APR_BROKER_AUTHORITY_PARENT_LOST`, fences every broker that
observes a shared-level loss (or the affected project at the digest leaf), and
never permits stale-socket reclamation from the compromised lock path.

A pre-existing foreign-owned, non-directory, permissive, or symlinked `aipr` or
`aipr/v1` path fails with `APR_BROKER_ENDPOINT_PARENT_UNSAFE`. Recovery reports
the exact offending path and observed condition, directs the user to inspect and
remove or repair that path outside ai-peer-review only after establishing its
ownership and purpose, and then retry. It never suggests an endpoint override,
recursive deletion, ownership takeover, or automatic replacement.

The owner binds a Unix socket with the absolute `paths.endpoint` pathname—the
same UTF-8 bytes measured by preflight. Darwin and Linux provide no `bindat`
operation. Therefore, the accepted plan's directory-relative no-follow rule
continues to govern regular directory, lock, and metadata operations, while the
socket bind's no-symlink and ownership assurance comes from the retained
identity handles and post-condition checks for every `endpointDirectories`
entry. The implementation must not use `chdir` or a relative bind to shorten the
kernel-visible pathname.

Immediately after `bind()` succeeds, the security layer observes the socket
entry relative to the retained `aipr/v1` handle with no-follow semantics. It
verifies that the owner is the calling user, the type is a socket, and the mode
is within the allowed set, then records the observed device and inode/file
identity as the endpoint baseline. No expected device or inode is derived from
the listening socket descriptor: POSIX does not define those descriptor fields
as the filesystem entry's identity. Failure of an independently checkable
post-condition closes the listener and unlinks neither observed entry.

Before ownership-sensitive cleanup, a second retained-parent observation checks
owner, type, and mode again and compares device and inode/file identity with the
recorded baseline. Any mismatch fails closed and unlinks neither observed entry.
This record-then-compare contract detects later replacement without pretending
that `bindat` exists or comparing unrelated socket identities.

Before connecting, a POSIX client opens and validates the authority cache root,
reads any endpoint-root metadata only as a routing hint, independently opens and
validates that endpoint-root anchor, and then reaches every
`endpointDirectories` entry relative to retained parent handles with the same
owner, mode, type, and no-symlink checks. Those checks reduce redirection risk
but do not establish trust; peer credentials, full-tuple comparison, instance
identity, and nonce proof remain mandatory.

## Compatibility and migration

No published `0.2.x` release contains the project-local broker. Issue #56 lands
before the first `0.3.x` broker release, so there is no supported live endpoint
to migrate. The implementation does not probe, alias, unlink, or adopt the
unreleased long Unix pathname.

The pathname layout version is `v1` from its first supported release. Future
layout changes require a new namespace version and an explicit discovery/drain
design. Broker compatibility at a live corrected endpoint continues to require
exact package, protocol, and Node-major matches as defined by the accepted epic
design.

The full-digest lock directory intentionally remains unversioned and rooted only
at the resolved platform `cacheRoot`. Within one resolved cache root, it is the
mutual-exclusion point across every endpoint-root selection and layout version:
a second broker for the same canonical digest contends for that lock before
probing, draining, migrating, or binding any endpoint. The accepted platform
contract already requires all processes for a project to resolve the same
`XDG_CACHE_HOME`, `%LOCALAPPDATA%`, and home; divergent authority-cache
configuration remains a pre-existing deployment error outside #56. The new
endpoint-root setting cannot create that split because it never relocates the
lock. A future design must not move or version the lock directory and thereby
allow two endpoint roots or layout versions within one resolved cache root to
own one project concurrently.

The short `aipr` cache name carries a residual local name-collision risk. If an
unrelated application has already created an incompatible path there, the
broker refuses it and requires manual inspection; it does not adopt, rename,
repair, or relocate the path automatically. The byte budget does not permit a
longer package name at the exact supported macOS boundary.

The epic design's guarantee that an incompatible broker remains discoverable at
the same endpoint applies to package upgrades within pathname layout `v1`.
Shipping `v2` requires the explicit cross-endpoint discovery and drain design
described here; no future layout may assume the `v1` sentence is unconditional.

## Data flow

1. Canonical project identity computes the existing 64-hex root digest.
2. `brokerPaths` derives the full-digest metadata/lock directory.
3. On Unix, it losslessly base32-encodes the digest bytes and derives both
   compact shared directory levels plus the versioned absolute endpoint; on
   Windows it returns no endpoint directories and derives the existing named
   pipe.
4. Endpoint length preflight runs before any resource is opened.
5. Task 4 validates the cache-root anchor and both protected directory chains,
   acquires the full-digest lock, binds the compact endpoint, and authenticates
   the full tuple over live IPC.

## Failure behavior

- Invalid or noncanonical digest: `APR_BROKER_PATH_INVALID`.
- Missing, noninteger, or nonpositive platform limit:
  `APR_BROKER_ENDPOINT_LIMIT_INVALID`.
- UTF-8 pathname or named-pipe label over the observed limit:
  `APR_BROKER_ENDPOINT_TOO_LONG`.
- Missing, foreign-owned, non-directory, symlinked, or otherwise unusable
  `<user-cache>` trust anchor: `APR_BROKER_CACHE_ROOT_UNAVAILABLE`; no package
  directory or endpoint is created, except that an absent Linux `home-default`
  `.cache` is created and verified under the retained home handle as specified.
- Unsafe, foreign-owned, permissive, non-directory, or symlinked Unix authority
  parent: `APR_BROKER_AUTHORITY_PARENT_UNSAFE` with exact-path inspection and
  manual repair guidance; never automatic removal.
- Mid-lifetime replacement or loss of an authority directory:
  `APR_BROKER_AUTHORITY_PARENT_LOST`; shared-level loss fences every observing
  broker, digest-leaf loss fences that project, and neither case authorizes
  cleanup through the compromised lock path.
- Unsafe, foreign-owned, permissive, non-directory, or symlinked Unix endpoint
  parent: `APR_BROKER_ENDPOINT_PARENT_UNSAFE` with exact-path inspection and
  manual repair guidance; never automatic removal.
- Mid-lifetime replacement or loss of either shared endpoint directory:
  `APR_BROKER_ENDPOINT_PARENT_LOST`. The error states that one shared-path event
  may have fenced every project broker for the user. Each broker retains its own
  lock and metadata evidence and refuses delivery. Recovery inspects and restores
  both shared directories to their owner-only nonsymlink state, then reconciles
  every affected project's lock, metadata, endpoint, review registry, and
  provider state before restarting brokers individually. The package never
  recreates the directory, unlinks sockets, takes ownership, or redirects an
  endpoint automatically after mid-lifetime loss.
- Unsupported platform: `APR_BROKER_ENDPOINT_UNSUPPORTED`.
- Ownership, symlink, peer, tuple, instance, nonce, or version mismatch: the
  existing Task 4 integrity and authentication errors; never endpoint fallback.

## Verification

Unit tests must prove:

- exact base32 vectors, including leading zero bytes and a 32-byte all-`ff`
  digest;
- every valid digest emits 52 lowercase case-fold-safe characters and round
  trips to the same 32 bytes in the test oracle;
- an all-zero digest encodes to 52 `a` characters, an all-`ff` digest encodes to
  51 `7` characters followed by `q`, and every valid token ends in only `a` or
  `q` because its final symbol carries one data bit and four zero pad bits;
- realistic macOS cache roots fit 103 bytes;
- a 27-byte macOS home produces exactly 103 bytes and the neighboring 28-byte
  home is refused at 104 bytes;
- the default `/Users/<short-name>` macOS route accepts a 20-byte short name and
  refuses a 21-byte short name, while the same long-home case succeeds with a
  sufficiently short, safe `AI_PEER_REVIEW_ENDPOINT_ROOT`;
- absolute Linux `XDG_CACHE_HOME` values pin exact acceptance at the injected
  107-byte Linux limit and refusal at 108 bytes, exercising the same off-by-one
  behavior without reusing Darwin's number;
- Unicode cache roots are measured in UTF-8 bytes;
- distinct root digests derive distinct Unix endpoints;
- package/protocol/Node version inputs do not affect routing;
- overlong paths and invalid limits still fail before resource creation; and
- POSIX `endpointDirectories` is exactly
  `[<endpoint-root>/aipr, <endpoint-root>/aipr/v1]` in that order, is deeply frozen,
  and each entry is a UTF-8 byte prefix of `endpoint`;
- every input-table row, invalid-value outcome, source enum, and creation policy
  is asserted per platform; `cacheRoot` remains exact,
  `authorityDirectories` is the exact deeply frozen root-to-digest chain, and
  `directory`, `lock`, and `metadata` remain byte-for-byte at the stable full
  64-hex authority paths under every endpoint-root selection;
- Windows output is asserted key-for-key, including an empty deeply frozen
  `endpointDirectories` array, the exact deeply frozen `authorityDirectories`
  chain, and the unchanged directory and named pipe.

Issue #43's registry and ownership tests must additionally prove:

- each of the five new stable errors exists in the offline registry with one
  exact recovery action;
- an absent Linux `home-default` cache root is created `0700` relative to the
  retained safe home, while an absent configured root is refused;
- every authority-root and endpoint-root source is refused when group- or
  other-writable;
- two brokers for one digest under different endpoint roots still contend for
  one stable full-digest lock, and the loser cannot bind or deliver;
- two project brokers can race to create each shared parent safely, a
  per-project release never removes it, and a leftover socket is unlinked only
  while the matching full-digest lock is held;
- the immediate post-bind observation validates owner/type/mode and records its
  device and inode/file identity without comparing them to the listener
  descriptor;
- the pre-cleanup observation revalidates owner/type/mode and compares device
  and inode/file identity with that baseline, and an injected mismatch closes
  the listener without unlinking either observed entry;
- `listenPrivate` rejects cache-root and lock pathnames where retained live
  handles are required; and
- Windows never applies `dirname` to its logical pipe label; and
- metadata schema v1 records both roots, both source enums, and
  `endpoint_layout_version: 1` without duplicating the endpoint token.

Those are Task 4 registry and ownership operations, so #56 defines and hands off
the tests rather than creating a dependency cycle by implementing #43's native
lock/listener layer.

On macOS, an integration test must call production `brokerPaths` with the real
home directory and a unique full digest, create only its derived private endpoint
parent, bind a real `node:net` Unix server at the returned endpoint, exchange one
message with a real client, and remove only the exact unique socket. Shared
package directories remain even if the test created them, matching production
ownership semantics. The test must fail—not substitute another path—if the
production-derived endpoint cannot bind.

When a shared endpoint parent is lost, attribution proceeds forward rather than
requiring a production base32 decoder: enumerate the full-digest authority
directories, validate each candidate, and re-derive its endpoint token through
the canonical path function. Unknown or unsafe candidates are reported but
never adopted or removed.

A clean broker release and authenticated stale-owner recovery remove the exact
owned socket. A socket whose project is permanently deleted or moved may remain
orphaned because no future broker can safely acquire and reconcile its former
project authority. This small per-user accumulation is accepted for v1;
operator-initiated orphan cleanup is outside #56 and never inferred from age or
an unknown token alone.

## Acceptance

This correction is accepted only after independent peer review of this design
and its implementation plan, focused tests, a real macOS production-derived
bind/connect round trip, the complete fast and slow suites, lint, format, and an
independent implementation review. Issue #43 remains blocked until those gates
pass and the correction is landed on `feature/epic/39` without modifying its
preserved WIP files.
