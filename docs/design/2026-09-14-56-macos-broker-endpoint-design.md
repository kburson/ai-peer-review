# Issue #56: macOS Broker Endpoint Correction

<!-- cspell:words aipr bindat chdir EEXIST nonsymlink sockaddr injective unpadded noninteger nonpositive -->

**Status:** Proposed correction for peer review

**Issue:** [#56](https://github.com/kburson/ai-peer-review/issues/56)

**Supersedes:** Only the Unix socket pathname layout in
`docs/design/2026-09-14-project-local-spr-xpr-broker-design.md` and the matching
Task 3/Task 4 interface and layout instructions at lines 172, 192, and 199 of
`docs/plans/2026-09-14-project-local-spr-xpr-broker.md`. The issue #56
implementation plan is the executable replacement authority for those lines.
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
the ordered protected endpoint directories:

```js
{
  directory,
  endpointDirectories,
  endpoint,
  lock,
  metadata,
}
```

The lock and metadata directory remains:

```text
<user-cache>/ai-peer-review/brokers/<64-lowercase-hex-root-digest>/
  broker.lock
  broker.json
```

On macOS and Linux, the endpoint becomes:

```text
<user-cache>/aipr/v1/<52-character-lowercase-base32-root-digest>
```

There is no suffix. `aipr` is the stable package namespace and `v1` versions the
pathname encoding/layout, not the broker protocol or project identity. Package,
broker-protocol, and Node versions remain excluded from routing.

On macOS and Linux, `endpointDirectories` is the deeply frozen ordered array
`[<user-cache>/aipr, <user-cache>/aipr/v1]`. The path layer owns both
derivations; the security layer must not reconstruct them with
`dirname(endpoint)`. Both directories are per-user and shared by every
project-local broker for that user. Only the token leaf is per-project.

On Windows, the endpoint remains:

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
4. Encode the final one-bit remainder with zero padding in its low four bits.
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
Longer platform inputs are possible and are not redirected: preflight throws
`APR_BROKER_ENDPOINT_TOO_LONG` before any directory, lock, metadata, or endpoint
resource is opened.

The error recovery continues to direct the operator to a shorter supported user
cache path. No test or runtime path may substitute an unrelated short socket
solely to bypass this check.

## Security and ownership

The compact token is routing information, not trust evidence. Authentication
continues to require the live handshake's full canonical root tuple, package
version, broker protocol version, Node major, instance ID, nonce proof, and
kernel-reported peer user.

Task 4 must treat both cache locations as protected resources:

- `openPrivateDirectory(paths.directory)` validates and retains the full-digest
  metadata and lock directory.
- On POSIX, `listenPrivate(paths.endpointDirectories, paths.endpoint, { lock })`
  receives both ordered directories plus the live lock handle returned by
  `acquireExclusive`; a lock pathname is not sufficient. It creates each absent
  directory directly as owner-only (`0700`) and validates every level's owner,
  mode, type, and no-symlink post-conditions before continuing. If concurrent
  brokers for different projects lose `mkdir` with `EEXIST` at either level,
  that race is successful only after the observed level passes those complete
  post-conditions. It creates the socket as owner-only where the platform
  permits and retains the directory and endpoint identity handles through the
  owned lifetime.
- On Windows, `listenPrivate([], paths.endpoint, { lock })` treats the live lock
  handle as ownership authority, creates no endpoint directory, and applies the
  existing owner-only named-pipe DACL and client-token checks.
- Owner verification detects replacement or unlink of either the lock evidence
  or endpoint. Replacement or unlink of the shared endpoint parent fences every
  broker that observes it; each preserves its own lock/metadata evidence and
  refuses further delivery. A per-project broker never removes the shared
  `aipr` or `aipr/v1` directory, including when it appears empty.
- Only the verified holder of the full-digest `broker.lock` may unlink the
  endpoint whose token derives from that same digest. After acquiring that lock
  and reconciling project/provider authority, the holder probes a present socket;
  a failed authenticated connection plus retained lock ownership permits removal
  of that exact stale socket before bind. Without the lock, stale-looking socket
  state is never removed.

`broker.json` remains discovery-only. When Task 4 writes it, it records the full
root tuple and digest. Version 1 does not duplicate the derived endpoint token;
diagnostics derive it through the same canonical path function. Adding the token
later would require an explicit metadata-schema change. It could never replace
live authentication.

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

Before connecting, a POSIX client validates every `endpointDirectories` entry
with the same owner, mode, type, and no-symlink checks. Those checks reduce
redirection risk but do not establish trust; peer credentials, full-tuple
comparison, instance identity, and nonce proof remain mandatory.

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

The full-digest lock directory intentionally remains unversioned. It is the
cross-layout-version mutual-exclusion point: a future `v2` endpoint must contend
for the same project lock before probing, draining, migrating, or binding a
different endpoint. A future design must not version the lock directory and
thereby allow two layout versions to own one project concurrently.

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
5. Task 4 validates both private locations, acquires the full-digest lock, binds
   the compact endpoint, and authenticates the full tuple over live IPC.

## Failure behavior

- Invalid or noncanonical digest: `APR_BROKER_PATH_INVALID`.
- Missing, noninteger, or nonpositive platform limit:
  `APR_BROKER_ENDPOINT_LIMIT_INVALID`.
- UTF-8 pathname or named-pipe label over the observed limit:
  `APR_BROKER_ENDPOINT_TOO_LONG`.
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
- absolute Linux `XDG_CACHE_HOME` values pin the same exact 103-byte acceptance
  and 104-byte refusal boundary;
- Unicode cache roots are measured in UTF-8 bytes;
- distinct root digests derive distinct Unix endpoints;
- package/protocol/Node version inputs do not affect routing;
- overlong paths and invalid limits still fail before resource creation; and
- `directory`, `lock`, and `metadata` remain byte-for-byte at the full 64-hex
  authority paths; and
- Windows output is asserted key-for-key, including an empty deeply frozen
  `endpointDirectories` array and the unchanged directory and named pipe.

Issue #43's ownership tests must additionally prove that two project brokers can
race to create the shared parent safely, a per-project release never removes it,
and a leftover socket is unlinked only while the matching full-digest lock is
held. Those are Task 4 ownership operations, so #56 defines and hands off the
tests rather than creating a dependency cycle by implementing #43's lock layer.

On macOS, an integration test must call production `brokerPaths` with the real
home directory and a unique full digest, create only its derived private endpoint
parent, bind a real `node:net` Unix server at the returned endpoint, exchange one
message with a real client, and remove only the exact unique socket plus empty
test-created directories. It must fail—not substitute another path—if the
production-derived endpoint cannot bind.

## Acceptance

This correction is accepted only after independent peer review of this design
and its implementation plan, focused tests, a real macOS production-derived
bind/connect round trip, the complete fast and slow suites, lint, format, and an
independent implementation review. Issue #43 remains blocked until those gates
pass and the correction is landed on `feature/epic/39` without modifying its
preserved WIP files.
