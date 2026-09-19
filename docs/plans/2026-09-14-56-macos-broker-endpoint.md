# Issue #56 macOS Broker Endpoint Implementation Plan

<!-- cspell:words aipr multibyte noninteger nonpositive overlength realpath unpadded -->

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overlong POSIX broker socket layout with a lossless compact
layout that fits realistic macOS cache roots while preserving the full-digest
lock and metadata authority.

**Architecture:** `brokerPaths` remains the only routing derivation. It validates
platform limits and canonical root inputs, encodes the existing 32-byte identity
digest as lowercase unpadded RFC 4648 base32 for POSIX socket routing, and returns
separate frozen authority and endpoint directory chains. Windows keeps its
existing full-digest named pipe and full-digest authority directory. A macOS-only
integration test binds and connects to the production-derived endpoint.

**Tech Stack:** Node.js ESM, `node:path`, `node:net`, `node:test`, strict
assertions, existing `AprError` error vocabulary.

**Spec:** `docs/design/2026-09-14-56-macos-broker-endpoint-design.md`

## Global Constraints

- Preserve all 256 identity bits: decode exactly 64 lowercase hexadecimal
  characters and emit exactly 52 lowercase unpadded base32 characters.
- POSIX endpoint layout is `<endpoint-root>/aipr/v1/<token>` with a 61-byte
  suffix; Darwin allows 103 usable bytes and Linux 107 through the injected
  platform limit.
- POSIX limits below 63 fail with `APR_BROKER_ENDPOINT_LIMIT_INVALID` before
  digest or root validation. A valid return reports
  `maxEndpointRootBytes = platform.maxEndpointLength - 61`.
- Full-digest `directory`, `lock`, and `metadata` paths remain under
  `<cache-root>/ai-peer-review/brokers/<64-hex-digest>`.
- `AI_PEER_REVIEW_ENDPOINT_ROOT` changes only the POSIX socket namespace. It
  never changes identity, lock, or metadata authority. Windows ignores it.
- Root inputs must be absolute canonical platform paths with no trailing
  separator or `.` / `..` component. POSIX `/` is invalid. Do not resolve root
  input symlinks in this path layer.
- POSIX equality is byte-exact. Do not case-fold or Unicode-normalize root
  inputs. Windows retains its existing canonical filesystem spelling contract.
- Measure POSIX endpoint limits in UTF-8 bytes and Windows named-pipe limits in
  JavaScript string units. Refuse overlength endpoints before creating resources.
- Freeze the returned object and deeply freeze both directory arrays. Do not
  add filesystem mutation or Task 4 ownership logic to this issue.
- The accepted issue #56 design supersedes only the named epic clauses. Task 4
  owns root/parent validation, locks, authenticated handshakes, cleanup, and the
  ten new stable ownership errors.

---

### Task 1: Specify the complete path contract with failing unit tests

**Files:**

- Modify: `test/unit/broker-identity.test.mjs`
- Read: `src/broker/paths.mjs`
- Read: `docs/design/2026-09-14-56-macos-broker-endpoint-design.md`

**Interfaces:**

- Consumes: `brokerPaths({ identity, platform, env, home })` and the existing
  platform test double.
- Produces: executable expectations for the expanded frozen return shape, exact
  base32 routing, source enums, limit precedence, and canonical root rejection.

- [ ] **Step 1: Replace legacy POSIX layout assertions with the expanded shape**

  For digest `'0'.repeat(64)`, assert the token is `'a'.repeat(52)` and the
  Darwin result is exactly:

  ```js
  {
    cacheRoot: '/Users/alex/Library/Caches',
    cacheRootSource: 'platform-default',
    endpointRoot: '/Users/alex/Library/Caches',
    endpointRootSource: 'cache-root',
    endpointLayoutVersion: 1,
    maxEndpointRootBytes: 451,
    authorityDirectories: [
      '/Users/alex/Library/Caches/ai-peer-review',
      '/Users/alex/Library/Caches/ai-peer-review/brokers',
      `/Users/alex/Library/Caches/ai-peer-review/brokers/${digest}`,
    ],
    directory: `/Users/alex/Library/Caches/ai-peer-review/brokers/${digest}`,
    endpointDirectories: [
      '/Users/alex/Library/Caches/aipr',
      '/Users/alex/Library/Caches/aipr/v1',
    ],
    endpoint: `/Users/alex/Library/Caches/aipr/v1/${'a'.repeat(52)}`,
    lock: `/Users/alex/Library/Caches/ai-peer-review/brokers/${digest}/broker.lock`,
    metadata: `/Users/alex/Library/Caches/ai-peer-review/brokers/${digest}/broker.json`,
  }
  ```

  Assert `Object.isFrozen` for the result and both arrays. Add corresponding
  Linux source cases for explicit `XDG_CACHE_HOME` (`xdg-configured`) and absent
  `XDG_CACHE_HOME` (`home-default`).

- [ ] **Step 2: Add exact base32 and collision-separation vectors**

  Exercise routing only through `brokerPaths`. Assert:

  ```js
  const zero = brokerPaths({ identity: identityFor('0'.repeat(64)), ...posix });
  const ones = brokerPaths({ identity: identityFor('f'.repeat(64)), ...posix });
  assert.equal(path.basename(zero.endpoint), 'a'.repeat(52));
  assert.equal(path.basename(ones.endpoint), `${'7'.repeat(51)}q`);
  assert.match(path.basename(ones.endpoint), /^[a-z2-7]{52}$/);
  assert.notEqual(zero.endpoint, ones.endpoint);
  ```

  Add a small test-only decoder and round-trip representative digests including
  leading zero bytes. Assert every generated final symbol is `a` or `q`.

- [ ] **Step 3: Pin exact POSIX limit and UTF-8 behavior**

  Add table-driven cases proving:
  - Darwin root byte lengths 42 and 43 yield endpoints of 103 and 104 bytes;
  - Linux root byte lengths 46 and 47 yield endpoints of 107 and 108 bytes;
  - 27-byte and 28-byte Darwin homes yield 103 and 104-byte endpoints;
  - `/Users/<short-name>` accepts 20 short-name bytes and rejects 21;
  - a multibyte Unicode root is decided by `Buffer.byteLength`, not `.length`;
  - limit 62 throws `APR_BROKER_ENDPOINT_LIMIT_INVALID` before an invalid digest
    or invalid root can win, while limit 63 plus root `/a` succeeds with
    `maxEndpointRootBytes: 2`.

  For overlength cases assert `error.details` contains exact `endpoint`,
  `length`, `limit`, and `maxEndpointRootBytes` values.

- [ ] **Step 4: Pin source selection and canonical input rejection**

  Test macOS `home`, Linux `home` / `XDG_CACHE_HOME`, Windows `LOCALAPPDATA`, and
  POSIX `AI_PEER_REVIEW_ENDPOINT_ROOT` independently. For every input the platform
  reads, reject empty, relative, trailing-separator, `.`-component, and
  `..`-component forms with `APR_BROKER_PATH_INVALID` and the exact input label.
  Assert ignored variables remain ignored on other platforms. Assert POSIX `/`
  is invalid and case-only plus NFC/NFD spellings are preserved byte-for-byte.

- [ ] **Step 5: Pin configured endpoint-root isolation and Windows compatibility**

  Assert a configured POSIX endpoint root changes only `endpointRoot`,
  `endpointRootSource`, `endpointDirectories`, and `endpoint`; authority fields
  remain identical. For Windows assert the expanded result has
  `endpointRoot: null`, `endpointRootSource: 'named-pipe'`,
  `endpointLayoutVersion: null`, `maxEndpointRootBytes: null`, a deeply frozen
  empty `endpointDirectories`, unchanged full-digest authority paths, and the
  exact historical named pipe. Set `AI_PEER_REVIEW_ENDPOINT_ROOT` to invalid text
  and prove Windows ignores it.

- [ ] **Step 6: Run the focused test and observe the expected failures**

  Run: `node --test test/unit/broker-identity.test.mjs`

  Expected: FAIL because the legacy implementation lacks the expanded fields,
  compact base32 route, canonical input validation, and limit precedence.

- [ ] **Step 7: Commit the failing contract tests**

  ```bash
  git add test/unit/broker-identity.test.mjs
  git commit -m "[#56] test: specify compact broker endpoint paths"
  ```

### Task 2: Implement compact, source-aware broker path derivation

**Files:**

- Modify: `src/broker/paths.mjs`
- Test: `test/unit/broker-identity.test.mjs`

**Interfaces:**

- Consumes: the existing lowercase 64-hex `identity.digest`, injected
  `platform.kind`, `platform.maxEndpointLength`, `env`, and `home`.
- Produces: `brokerPaths({ identity, platform, env, home })` returning the exact
  frozen shape specified in Task 1 and the accepted design.

- [ ] **Step 1: Add canonical path validation without filesystem resolution**

  Implement an internal helper that rejects non-string, empty, nonabsolute,
  trailing-separator, `.` / `..` component, and POSIX `/` values. Compare the
  caller value with platform normalization only to detect noncanonical lexical
  form; never call `realpath` and never case-fold or Unicode-normalize.

- [ ] **Step 2: Separate cache-root and endpoint-root selection**

  Return `{ path, source }` from cache-root selection using the closed source set
  `platform-default | xdg-configured | home-default`. On POSIX choose an explicit
  canonical `AI_PEER_REVIEW_ENDPOINT_ROOT` as source `configured`, otherwise reuse
  the cache root as source `cache-root`. On Windows return `null` and
  `named-pipe`, ignoring the endpoint-root variable.

- [ ] **Step 3: Implement lossless lowercase unpadded base32**

  Validate the digest before decoding. Convert `Buffer.from(digest, 'hex')` to a
  most-significant-bit-first stream and emit 5-bit groups from
  `abcdefghijklmnopqrstuvwxyz234567`, zero-padding only the final group and never
  emitting `=`. Assert internally or by invariant that 32 bytes produce 52
  characters; do not truncate, rehash, or export a second routing authority.

- [ ] **Step 4: Make POSIX layout validation precede identity and root validation**

  Derive the 61-byte `/aipr/v1/<52-token>` suffix contract from constants. For
  POSIX, reject noninteger, nonpositive, or below-63 limits with
  `APR_BROKER_ENDPOINT_LIMIT_INVALID` before reading the digest or root inputs.
  Return layout version `1` and `maxEndpointRootBytes = limit - 61`. Windows keeps
  its positive-limit validation for the retained named pipe and reports both
  layout fields as `null`.

- [ ] **Step 5: Build and freeze both directory chains and the final shape**

  Build `authorityDirectories` from cache root through the full digest and
  `endpointDirectories` from endpoint root through `aipr/v1`. Freeze copied
  arrays before placing them into the frozen result. Derive POSIX endpoint from
  the endpoint leaf plus token; derive lock and metadata only from the authority
  leaf. Keep the Windows pipe byte-for-byte unchanged.

- [ ] **Step 6: Preserve fail-closed endpoint-length errors**

  Measure POSIX with `Buffer.byteLength(endpoint, 'utf8')` and Windows with
  `endpoint.length`. On overflow throw `APR_BROKER_ENDPOINT_TOO_LONG` before any
  resource creation, include exact length data plus `maxEndpointRootBytes`, and
  use the accepted platform-selected recovery: shorten/provision a conforming
  endpoint root on POSIX without moving authority; retain the existing Windows
  cache-root recovery.

- [ ] **Step 7: Run the focused unit suite**

  Run: `node --test test/unit/broker-identity.test.mjs`

  Expected: PASS.

- [ ] **Step 8: Commit the implementation**

  ```bash
  git add src/broker/paths.mjs test/unit/broker-identity.test.mjs
  git commit -m "[#56] fix: compact POSIX broker endpoints"
  ```

### Task 3: Prove a real production-derived macOS socket round trip

**Files:**

- Create: `test/integration/broker-endpoint.test.mjs`
- Read: `src/broker/paths.mjs`

**Interfaces:**

- Consumes: production `brokerPaths`, `homedir()` and platform limit 103.
- Produces: a Darwin-only real `node:net` bind/connect regression with exact-path
  cleanup and no unrelated short fixture endpoint.

- [ ] **Step 1: Write the Darwin-gated integration test**

  Use `test('production-derived macOS endpoint binds and connects',
{ skip: process.platform !== 'darwin' }, async (t) => { ... })`. Generate a
  unique full digest with `createHash('sha256')` over random bytes and call
  `brokerPaths` with `kind: 'darwin'`, `maxEndpointLength: 103`, the real
  `homedir()`, and process environment.

- [ ] **Step 2: Handle the supported overlong-default branch**

  If the first production call throws `APR_BROKER_ENDPOINT_TOO_LONG`, assert its
  limit and `maxEndpointRootBytes`. Require a pre-provisioned absolute
  `AI_PEER_REVIEW_ENDPOINT_ROOT` from the test environment, call production
  `brokerPaths` again with that configured root, and assert it now fits. Never
  substitute an arbitrary socket path outside `brokerPaths`.

- [ ] **Step 3: Bind, exchange one message, and close cleanly**

  Create only the returned `endpointDirectories` with mode `0700`. Refuse to run
  if the unique endpoint already exists. Bind `createServer`, connect with
  `createConnection(paths.endpoint)`, exchange a fixed `ping` / `pong` payload,
  close client and server, and assert the endpoint is gone or unlink only that
  exact unique socket after the listener closes.

- [ ] **Step 4: Register exact cleanup before binding**

  Use `t.after` to close open handles and remove only `paths.endpoint` if it still
  exists. Leave shared `aipr` and `aipr/v1` directories in place even if this test
  created them, matching the production ownership contract. Never recursively
  delete the cache root or shared namespace.

- [ ] **Step 5: Run the focused integration test**

  Run: `node --test test/integration/broker-endpoint.test.mjs`

  Expected on macOS: PASS with a real bind/connect exchange at the exact
  production-derived endpoint. Expected elsewhere: one explicit platform skip.

- [ ] **Step 6: Commit the integration proof**

  ```bash
  git add test/integration/broker-endpoint.test.mjs
  git commit -m "[#56] test: bind production macOS broker endpoint"
  ```

### Task 4: Run the governed verification matrix and preserve the #43 boundary

**Files:**

- Verify: `src/broker/paths.mjs`
- Verify: `test/unit/broker-identity.test.mjs`
- Verify: `test/integration/broker-endpoint.test.mjs`
- Verify: `docs/design/2026-09-14-56-macos-broker-endpoint-design.md`
- Verify: `docs/plans/2026-09-14-56-macos-broker-endpoint.md`

**Interfaces:**

- Consumes: Tasks 1–3 at one committed issue head.
- Produces: exact-SHA evidence for AITM Test and a closed handoff showing that
  Task 4 ownership/handshake work remains with issue #43.

- [ ] **Step 1: Confirm the changed-path boundary**

  Run:

  ```bash
  git diff --name-only feature/epic/39...HEAD
  ```

  Expected implementation paths are only the issue #56 design/plan/review
  evidence, `src/broker/paths.mjs`, `test/unit/broker-identity.test.mjs`, and
  `test/integration/broker-endpoint.test.mjs`. No #43 native, ownership, IPC,
  schema, dependency, or preserved WIP path may appear.

- [ ] **Step 2: Run focused verification**

  ```bash
  node --test test/unit/broker-identity.test.mjs
  node --test test/integration/broker-endpoint.test.mjs
  ```

  Expected: PASS (with the explicit non-Darwin integration skip where applicable).

- [ ] **Step 3: Run the complete repository verification**

  ```bash
  npm test
  npm run test:slow
  npm run lint
  npm run format:check
  git diff --check feature/epic/39...HEAD
  git log --oneline -1
  ```

  Expected: every command exits 0.

- [ ] **Step 4: Record any implementation-discovered plan adjustment**

  If implementation or testing requires a behavior change, update this plan and
  the issue's governed Deep-Dive Analysis as a Plan Adjustment. Do not mark the
  approved plan disapproved and do not broaden #56 into Task 4 implementation.

- [ ] **Step 5: Hand off to governed Test and Review**

  Run the AITM Develop-to-Test and Test-to-Review gates against the exact issue
  head. Open a PR targeting `feature/epic/39`, wait for hosted CI, and obtain an
  external cross-provider review of the exact PR head before merge. Confirm the
  PR diff has zero path overlap with the preserved #43 WIP before delivery.
