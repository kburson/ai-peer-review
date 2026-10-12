// @story #190
// Independent metadata observer of the immutable failing candidate. Fixed
// scripts, arguments, signals and deadlines remain untouched.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startSelectionAttribution } from './selection-attribution.mjs';
import { userInfo } from 'node:os';
import { realpathSync } from 'node:fs';
const selectionDirectory = path.join(realpathSync(userInfo().homedir), '.config/ai-peer-review');
let selectionGuardOpens = 0;
export function recordSelectionGuardOpen(file, handle) {
  if (file === selectionDirectory && handle?.constructor?.name === 'FileHandle' && handle.fd >= 0)
    selectionGuardOpens++;
}
if (
  process.platform !== 'linux' ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.GITHUB_WORKFLOW !== 'Registration cost observations' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.NODE_OPTIONS ||
  !['register', 'activate'].includes(process.env.APR_SELECTION_COST_OPERATION)
)
  throw Error('selection-attribution-host-unavailable');
const root = path.dirname(path.dirname(process.argv[1]));
const targets = [];
for (const [file, expected, marker, variable, kind] of [
  [
    'src/config/runtime-selection-core.mjs',
    '17adc45484be789624ea079e63c8bad38bf97797bb69654d47a2cf6a0b5c0078',
    'const context = budget(input);',
    'context',
    'selection',
  ],
  [
    'src/config/primary-maintenance.mjs',
    'f2a3abd4fbe7e73e39d9d3beb767ba090ebfa408f1c31f92c4b9cb58b1b6a590',
    'await admit(original);',
    'original',
    'original',
  ],
]) {
  const absolute = path.join(root, file),
    text = readFileSync(absolute, 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== expected)
    throw Error('selection-attribution-source-unavailable');
  const at = kind === 'original' ? text.lastIndexOf(marker) : text.indexOf(marker);
  if (at < 0) throw Error('selection-attribution-marker-unavailable');
  targets.push({
    kind,
    variable,
    url: pathToFileURL(absolute).href,
    lineNumber:
      kind === 'original'
        ? text.slice(0, at).split('\n').length - 1
        : text.slice(0, at).split('\n').length,
  });
}
const observer = await startSelectionAttribution(targets);
observer.unref();
process.once('beforeExit', async () => {
  try {
    const value = await observer.close();
    process.stderr.write(
      JSON.stringify({ diagnostic: 'selection-attribution', ...value, selectionGuardOpens }) + '\n'
    );
  } catch {
    process.stderr.write(
      JSON.stringify({
        diagnostic: 'selection-attribution',
        verified: false,
        operationalAuthority: 'unavailable',
        observerExitObserved: false,
        unavailable: 1,
        observations: [],
      }) + '\n'
    );
    process.exitCode = 1;
  }
});
