# Broker Build Dependency Audit

<!-- cspell:words nodedir gypi BlueOak minipass chownr minizlib isexe picomatch undici yallist tinyglobby gyp next pyproject -->

Date: 2026-09-14. Issue #43, Task 4. Baseline commit:
`f8e97d39f540eaf3ba384b28a1910f7a9a096180`.

## Decision and scope

Approve exact `node-gyp@12.4.0` as the production-installed, explicit-build-only
tool. The resolved candidate graph passed the checks below before the project
manifest or lockfile changed. The package-local entrypoint must spawn it using
`process.execPath` and `shell: false`, with a validated absolute local
`--nodedir` and optional absolute `--python`. Help and existing manual review
operations must neither import nor launch the builder. New broker startup must
never build the helper or download development files. This is an implementation
prerequisite decision, not evidence of a working helper or supported platform.

## Package identity

| Field                          | Value                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| Version                        | `node-gyp@12.4.0`                                                                                 |
| License                        | MIT, verified against installed LICENSE                                                           |
| Node engine                    | `^20.17.0 \|\| >=22.9.0`                                                                          |
| Registry modified              | `2026-08-26T14:03:12.460Z`                                                                        |
| Integrity                      | `sha512-OMcPNvqTCFUnNaBlmdgq+lfNqY7gTiSmNRDjY3uAXRyudeKZEZxu3CLtjMQrx4zZxCX2b/mpNqTtwuCJgXhHkw==` |
| Tarball                        | `https://registry.npmjs.org/node-gyp/-/node-gyp-12.4.0.tgz`                                       |
| Registry unpacked size / files | 1,876,531 bytes / 108                                                                             |

The engine admits the project's Node >=24 floor. The registry modified date is
package metadata, not the publication date of this version.

Primary sources: [npm registry metadata](https://registry.npmjs.org/node-gyp/12.4.0),
[upstream build and prerequisite documentation](https://github.com/nodejs/node-gyp/blob/v12.4.0/README.md),
[upstream license](https://github.com/nodejs/node-gyp/blob/v12.4.0/LICENSE),
[vendored GYP license](https://github.com/nodejs/node-gyp/blob/v12.4.0/gyp/LICENSE),
and [vendored Python packaging](https://github.com/nodejs/node-gyp/tree/v12.4.0/gyp/pylib/packaging).

## Resolved production closure

Two independent project-local scratch copies of the baseline package manifest,
lockfile and vendor archive were created using `git archive HEAD`. Baseline ran
`npm ci --omit=dev --ignore-scripts`; candidate ran
`npm install --omit=dev --ignore-scripts --save-exact node-gyp@12.4.0`.
`npm ls --omit=dev --all --json` exited zero for both. No lifecycle scripts were
run. Measurements inspect the actual installed manifests and files, excluding
symbolic-link bytes, including the generated installed lockfile.

| Measure                                           |   Baseline |  Candidate |      Delta |
| ------------------------------------------------- | ---------: | ---------: | ---------: |
| Production install entries                        |         96 |        116 |        +20 |
| Unique package/version pairs                      |         92 |        112 |        +20 |
| Installed regular-file bytes                      | 18,137,449 | 24,708,310 | +6,570,861 |
| Installed regular files                           |      4,108 |      4,912 |       +804 |
| Packages declaring preinstall/install/postinstall |          0 |          0 |          0 |
| npm production audit findings                     |          0 |          0 |          0 |

License counts by install entry: baseline MIT 86, ISC 7, BSD-3-Clause 2,
BSD-2-Clause 1; candidate MIT 93, ISC 14, BlueOak-1.0.0 5, Apache-2.0 1,
BSD-3-Clause 2, BSD-2-Clause 1. Deltas: MIT +7, ISC +7, BlueOak +5, Apache +1,
BSD unchanged. All observed package declarations use permissive licenses;
no missing license was observed. This inventory is not legal advice.

The twenty added resolutions are `@isaacs/fs-minipass@4.0.1`, `abbrev@4.0.0`,
`chownr@3.0.0`, `exponential-backoff@3.1.3`, `fdir@6.5.0`, `graceful-fs@4.2.11`,
`minipass@7.1.3`, `minizlib@3.1.0`, `node-gyp@12.4.0`, `env-paths@2.2.1`,
`isexe@4.0.0`, `which@6.0.1`, `nopt@9.0.0`, `picomatch@4.0.7`, `proc-log@6.1.0`,
`semver@7.8.5`, `tar@7.5.22`, `tinyglobby@0.2.17`, `undici@6.28.1`, and
`yallist@5.0.0`. No existing production resolution changed.

The installed node-gyp package also vendors Python GYP under BSD-3-Clause and
Python packaging (reported `23.3.dev0`) under BSD-2-Clause OR Apache-2.0. Their
actual license files were inspected, including both packaging license choices.
They are not npm dependency nodes and are not included in the package counts.
The upstream distributions retain their notices. The package is not bundled
into this project's tarball; consumers receive the original dependency files.

## Security findings and limits

Both exact graphs returned zero info, low, moderate, high and critical findings
from `npm audit --omit=dev --json`. This does not establish absence of defects,
and npm audit does not cover vendored Python code. The local build handles only
the package-owned binding definition and operator-provisioned development tree;
no untrusted package definition or downloaded headers enter that boundary.
Upstream node-gyp includes download functionality, so an explicit local header
argument and sanitized invocation are required even though ordinary runtime
commands never reach the builder. Dependency updates require a fresh audit.

## Alternatives

`devDependency` plus an operator-provided builder would reduce consumer install
size, but `--omit=dev` removes the reproducible package-local pin. The operator's
global or PATH-selected builder could differ in version, configuration and
behavior; installing it separately would undermine the package-owned offline
build contract. Rejected for this task.

An optional dependency preserves a package declaration but permits npm to omit
or fail that installation, including explicit `--omit=optional`. Doctor would
then advertise a build command without its pinned builder. Making it mandatory
gives consumers a deterministic prerequisite failure at install and preserves
the requested explicit opt-in build. Rejected for this task.

Prebuilt binaries would avoid local compiler prerequisites but need a separate
artifact provenance, distribution and platform coverage decision. A handwritten
compiler driver would transfer cross-platform build maintenance into this
package. Neither is a substitution authorized by the pinned Task 4 plan.

## Reproduction and lock-file authority

Scratch evidence lives in `.scratch/inspect/broker-build-audit/`: baseline and
candidate lock files, complete production trees, audit results, installed package
manifests/scripts/licenses and byte/count metrics. The measurement script hashes
the ordered production lock entries with SHA-256. Candidate digest:
`652479e1bd6df9183e6dbdfb0bd2ee34a7d356bb460730271ff687915f5c6739`.

The final project lock file must match those candidate production entries before
the dependency change is committed. The tracked lock file is the exact
transitive authority; this prose does not authorize a newly resolved graph.
