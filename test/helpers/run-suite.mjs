// @story #102
import { globSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

const suite = process.argv[2];
if (!['unit', 'golden', 'integration', 'packaging', 'smoke', 'mcp'].includes(suite))
  throw new Error('Expected a test suite name');
// Temporary delivery pause requested for #102/#107; #107 owns native removal.
const discovered = globSync(`test/${suite}/**/*.test.mjs`)
  .map((file) => file.replaceAll('\\', '/'))
  .sort();
// #107 portable tests do not load/build the retired native broker. Run these
// without the legacy name filter, which would otherwise hide their broker cases.
const portable = discovered.filter(
  (file) =>
    file === 'test/unit/ci-native-build-policy.test.mjs' ||
    /[\/]broker-http(?:-concurrency)?\.test\.mjs$/.test(file) ||
    /[\/](?:portable-[^\/]+|windows-portable-bootstrap|storage-protection|ownership-election|process-source-[^\/]+)\.test\.mjs$/.test(
      file
    )
);
const excluded = discovered.filter(
  (file) =>
    !portable.includes(file) &&
    (/[\\/]broker-[^\\/]+\.test\.mjs$/.test(file) ||
      file === 'test/smoke/cli.test.mjs' ||
      file === 'test/unit/source-test-preparation.test.mjs')
);
const files = discovered.filter((file) => !excluded.includes(file) && !portable.includes(file));
console.log('Broker verification paused for #102/#107: ' + excluded.join(', '));
if (!files.length && !portable.length) throw new Error(`No tests found for ${suite}`);

const groups = [
  [files, true],
  [portable, false],
].filter(([selected]) => selected.length);
function argumentsFor([selected, filtered]) {
  return [
    '--test',
    ...(filtered
      ? [
          '--test-skip-pattern=/broker|native helper|native exclusive|standalone production worker/i',
        ]
      : []),
    ...(suite === 'integration' ? ['--test-concurrency=2'] : []),
    ...selected,
  ];
}
// Both disjoint groups execute every discovered active test. Hosted integration
// runs two independent Node processes; each keeps its existing two-file limit.
if (suite === 'integration' && process.env.CI === 'true' && process.env.GITHUB_ACTIONS === 'true') {
  const results = await Promise.all(
    groups.map(
      (group) =>
        new Promise((resolve) => {
          const child = spawn(process.execPath, argumentsFor(group), { stdio: 'inherit' });
          let error;
          child.on('error', (value) => {
            error = value;
          });
          child.on('close', (status, signal) => resolve({ status, signal, error }));
        })
    )
  );
  for (const result of results) {
    if (result.error) throw result.error;
    if (result.status !== 0 || result.signal !== null) process.exitCode = result.status || 1;
  }
} else {
  for (const group of groups) {
    const result = spawnSync(process.execPath, argumentsFor(group), { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      break;
    }
  }
}
