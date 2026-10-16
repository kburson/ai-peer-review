// @story #190
// Ordinary installed filesystem/protocol evidence; no live provider claim.
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const output = path.join(root, '.scratch', '190-local-public');
mkdirSync(output, { recursive: true });
const started = Date.now();
const result = spawnSync(
  process.execPath,
  [
    '--test',
    'test/integration/submission.test.mjs',
    'test/integration/finalization.test.mjs',
    'test/integration/review-record.test.mjs',
  ],
  { cwd: root, encoding: 'utf8', timeout: 800000, maxBuffer: 16 * 1024 * 1024 }
);
writeFileSync(
  path.join(output, 'installed-controls.log'),
  `${result.stdout ?? ''}\n${result.stderr ?? ''}`
);
const report = {
  schema: 'ai-peer-review.local-installed-controls/v1',
  source_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  platform: process.platform,
  node: process.versions.node,
  scope:
    'ordinary installed filesystem/protocol with declared sessions; override uses explicit test-only human authority',
  actual_provider_proof: false,
  linux_manual_input: 'excluded; no live Linux manual-input claim',
  budgets_ms: { operation: 30000, windows_query: 15000, portable: 5000, total_test: 800000 },
  portable_cap: 4,
  elapsed_ms: Date.now() - started,
  status: result.status === 0 ? 'passed' : 'incomplete',
  exit_code: result.status,
  error_code: result.error?.code ?? null,
};
writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
process.exitCode = result.status === 0 ? 0 : 1;
