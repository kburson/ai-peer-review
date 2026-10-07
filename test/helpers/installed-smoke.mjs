// @story #136
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fixtureStartupDeps } from './internal-api.mjs';

const cwd = process.cwd();
const load = (relative) =>
  import(pathToFileURL(path.join(process.env.APR_FIXTURE_PACKAGE, relative)));
const { registerRuntimeSelection } = await load('src/config/runtime-selection.mjs');
const { registerPrimary, activatePrimaryPolicy } = await load('src/config/primary-operations.mjs');
const { setup } = await load('src/config/setup.mjs');
await registerRuntimeSelection();
await registerPrimary({ cwd });
await setup({ cwd, scope: 'project', agents: ['codex'], confirmScratchExclude: true });
execFileSync('git', ['add', '.'], { cwd, stdio: 'pipe' });
execFileSync('git', ['commit', '-m', 'activate smoke primary'], { cwd, stdio: 'pipe' });
await activatePrimaryPolicy({ cwd });
const { run } = await load('src/cli/run.mjs');
process.exitCode = await run(
  [
    'start',
    'docs/spec.md',
    '--artifact-kind',
    'spec',
    '--issue',
    '117',
    '--reviewer-provider',
    'claude',
    '--reviewer-model',
    'claude-opus-5',
    '--reviewer-effort',
    'medium',
    '--transport-mode',
    'manual',
  ],
  {
    ...fixtureStartupDeps,
    cwd,
    stdout: process.stdout,
    stderr: process.stderr,
    env: {
      ...process.env,
      CODEX_THREAD_ID: 'installed-smoke-author',
      CODEX_MODEL_ID: 'gpt-test',
      CODEX_MODEL_DISPLAY: 'GPT Test',
    },
  }
);
