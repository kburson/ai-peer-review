# ai-peer-review

`ai-peer-review` is a deterministic, provider-neutral peer-review protocol for
AI agents. It keeps review authority in an append-only event ledger, limits the
reviewer to the generated response path, and commits accepted collateral only
through the author role.

## Install and run

Node.js 22 or later is required. For zero-install use, run the package by its
registry name:

```bash
npx --yes ai-peer-review@0.1.0 --help
npx --yes ai-peer-review@0.1.0 setup --scope project --agent codex --dry-run
```

After a confirmed local installation (`npm install --save-dev ai-peer-review`),
the shorter binary name is available:

```bash
npx peer-review --help
```

Create a review from a clean tracked specification or plan:

```bash
npx --yes ai-peer-review@0.1.0 start docs/spec.md --artifact-kind spec
npx --yes ai-peer-review@0.1.0 status .scratch/peer-review/<review-id> --next
```

The generated invitation and status output contain the exact next command and
absolute paths. Do not reconstruct them manually. Phase 1 supports manual and
validated resume-only handoff. If resume delivery fails, the sealed handoff
remains pending and the CLI prints a shell-safe manual recovery command.

## Safety model

- Review state is derived from the append-only event ledger.
- Reviewer code receives read-only repository observations and cannot commit or
  push through the package API.
- Author commits use exact-path transactions and preserve unrelated index
  objects.
- Human Authority is graded as the weaker of signer isolation and verifier
  binding.
- `--no-commit` is explicitly non-durable and never implies Git evidence.
- Phase 1 does not run MCP servers, resident processes, or background polling.

Run `doctor` before relying on configured identity, authority, or resume
capability:

```bash
npx --yes ai-peer-review@0.1.0 doctor --mode manual --json
```

## Public API

The supported programmatic surface is intentionally read-only:

```js
import { explainError, statusReview } from 'ai-peer-review';
```

All workflow mutation is routed through the CLI so every host uses the same
validation and recovery contract.

## Verification

The release runs unit, golden, integration, packaging, installed-host smoke,
format, spelling, and lint gates on Node 22 for Ubuntu, macOS, and Windows. It
also exercises later LTS and current Node releases on Ubuntu. Production
dependencies are intentionally empty.

Run the local release gates with:

```bash
npm test
npm run test:integration
npm run test:packaging
npm run test:smoke
npm run lint
npm run format:check
```

## Provenance and licensing

This repository was extracted from `kburson/ai-task-manager`. Its retained
history ends at filtered tip
`bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d`, derived from AITM source commit
`4b3bcd43cba141a611da4a2b861433b915462806`. The first standalone bootstrap
commit is `fd2e636356b6b8049930d5dc6bddf383c6d56c8d`.

Ancestors through the filtered history tip retain the AGPL-3.0-or-later and
commercial terms that applied in AITM. The standalone bootstrap commit and its
descendants are Apache-2.0 under the independently verified declaration in
`provenance/relicensing-declaration.json`. See `NOTICE`, `LICENSE`, and
`docs/spdx-policy.md` for the exact boundary.

Security reports should use the private vulnerability-reporting surface on the
GitHub repository rather than a public issue.
