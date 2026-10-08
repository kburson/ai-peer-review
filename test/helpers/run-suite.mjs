// @story #102
import { globSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { classifySuiteFiles, suiteCommandArguments } from './suite-plan.mjs';

const [suite, ...extra] = process.argv.slice(2);
const excludeOwners = extra.includes('--exclude-owner-publication');
const excludeComposition = extra.includes('--exclude-portable-ownership');
const knownSelectors =
  extra.length === new Set(extra).size &&
  extra.every((value) =>
    ['--exclude-owner-publication', '--exclude-portable-ownership'].includes(value)
  );
if (
  extra.length &&
  !(
    knownSelectors &&
    excludeOwners &&
    suite === 'integration' &&
    process.env.CI === 'true' &&
    process.env.GITHUB_ACTIONS === 'true'
  )
)
  throw new Error('Unexpected test selector');
if (!['unit', 'golden', 'integration', 'packaging', 'smoke', 'mcp'].includes(suite))
  throw new Error('Expected a test suite name');
// Temporary delivery pause requested for #102/#107; #107 owns native removal.
const discovered = globSync(`test/${suite}/**/*.test.mjs`)
  .map((file) => file.replaceAll('\\', '/'))
  .sort()
  .filter((file) => !(excludeOwners && file === 'test/integration/owner-publication.test.mjs'))
  .filter(
    (file) => !(excludeComposition && file === 'test/integration/portable-ownership.test.mjs')
  );
// The same complete file partition feeds execution and its scheduling controls.
const { groups, excluded } = classifySuiteFiles(discovered);
console.log('Broker verification paused for #102/#107: ' + excluded.join(', '));
if (!groups.length) throw new Error('No tests found for ' + suite);
function argumentsFor(group) {
  return suiteCommandArguments(group, {
    suite,
    platform: process.platform,
    hosted: process.env.CI === 'true' && process.env.GITHUB_ACTIONS === 'true',
  });
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
