// @story #102
import { globSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const suite = process.argv[2];
if (!['unit', 'golden', 'integration', 'packaging', 'smoke', 'mcp'].includes(suite))
  throw new Error('Expected a test suite name');
// Temporary delivery pause requested for #102/#107; #107 owns native removal.
const discovered = globSync(`test/${suite}/**/*.test.mjs`)
  .map((file) => file.replaceAll('\\', '/'))
  .sort();
const excluded = discovered.filter(
  (file) =>
    /[\\/]broker-[^\\/]+\.test\.mjs$/.test(file) ||
    file === 'test/smoke/cli.test.mjs' ||
    file === 'test/unit/source-test-preparation.test.mjs'
);
const files = discovered.filter((file) => !excluded.includes(file));
console.log('Broker verification paused for #102/#107: ' + excluded.join(', '));
if (!files.length) throw new Error(`No tests found for ${suite}`);
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-skip-pattern=/broker|native helper|native exclusive|standalone production worker/i',
    ...(suite === 'integration' ? ['--test-concurrency=2'] : []),
    ...files,
  ],
  { stdio: 'inherit' }
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
