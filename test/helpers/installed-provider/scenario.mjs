import assert from 'node:assert/strict';
import { execFileSync, execFile, spawn } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { inspectInstalledHandoff } from '../installed-handoff-evidence.mjs';

const installed = process.env.APR_FIXTURE_PACKAGE;
const packageVersion = JSON.parse(
  readFileSync(path.join(installed, 'package.json'), 'utf8')
).version;
const root = process.cwd();
const load = (file) => import(pathToFileURL(path.join(installed, file)));
const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
git('init', '-b', 'trunk');
git('config', 'user.email', 'test@example.invalid');
git('config', 'user.name', 'Test');
mkdirSync(path.join(root, 'docs'), { recursive: true });
writeFileSync(path.join(root, 'docs/artifact.md'), '# Artifact\n\nA missing key returns zero.\n');
writeFileSync(path.join(root, '.gitignore'), 'node_modules/\npackage*.json\n.scratch/\n');
git('add', 'docs/artifact.md', '.gitignore');
git('commit', '-m', 'fixture');
const { registerRuntimeSelection } = await load('src/config/runtime-selection.mjs');
await registerRuntimeSelection();
const { registerPrimary, activatePrimaryPolicy } = await load('src/config/primary-operations.mjs');
const { setup } = await load('src/config/setup.mjs');
await registerPrimary({ cwd: root });
await setup({
  scope: 'project',
  agents: ['codex', 'claude'],
  cwd: root,
  confirmScratchExclude: true,
});
git('add', '.');
git('commit', '-m', 'activate installed scenario primary');
await activatePrimaryPolicy({ cwd: root });
// Bound this multi-action fixture after maintenance, preserving any shorter
// inherited deadline across all provider launches and simulated restarts.
process.env.APR_PROVIDER_DEADLINE_MS = String(
  Math.min(Number(process.env.APR_PROVIDER_DEADLINE_MS ?? Infinity), Date.now() + 600_000)
);
const { platformSecurity } = await load('src/broker/platform.mjs');
const { canonicalProjectIdentity } = await load('src/broker/identity.mjs');
const { ensureBroker, requestBroker } = await load('src/broker/client.mjs');
const { createGitRepository } = await load('src/git/repository.mjs');
const children = [];
const platform = {
  ...platformSecurity(),
  repository: createGitRepository(),
  spawn(file, args, options) {
    const child = spawn(file, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    const exited = new Promise((resolve) => child.once('close', resolve));
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (data) => appendFileSync(process.env.APR_FIXTURE_BROKER_LOG, data));
    children.push({ child, exited });
    return child;
  },
};
const project = canonicalProjectIdentity({ cwd: root, platform });
let client;
let stage = 'broker-startup';
let progress = {};
try {
  client = await ensureBroker({
    project,
    platform,
    runtimeImage: JSON.parse(process.env.APR_FIXTURE_IMAGE),
    versions: {
      package_version: packageVersion,
      broker_protocol_version: 1,
      node_major: Number(process.versions.node.split('.')[0]),
    },
  });
  await requestBroker(client, 'status');
  stage = 'author-start';
  const { withoutProviderIdentity } = await load('src/provider/preflight.mjs');
  await promisify(execFile)('claude', ['--fixture-start'], {
    cwd: root,
    env: withoutProviderIdentity(process.env),
    timeout: 240_000,
    encoding: 'utf8',
  });
  if (process.env.APR_FIXTURE_RESTART_SIMULATION === '1') {
    stage = 'simulated-launch-restart';
    const { verifyInstalledLaunchRestart } = await import('./restart-scenario.mjs');
    client = await verifyInstalledLaunchRestart({
      load,
      root,
      project,
      platform,
      children,
      client,
    });
  }
  const { inspectReviewAuthority } = await load('src/protocol/service.mjs');
  stage = 'automatic-handoff';
  const { readWakeOperation } = await load('src/coordinator/ledger.mjs');
  let receipt;
  let finalized = false;
  const deadline = Date.now() + 180_000;
  const handoffStarted = Date.now();
  while ((!receipt || !finalized) && Date.now() < deadline) {
    const directory = path.join(root, '.scratch/peer-review');
    const ws = readdirSync(directory)
      .map((name) => path.join(directory, name))
      .filter((file) => existsSync(path.join(file, 'events.jsonl')));
    assert.equal(ws.length, 1);
    receipt = await inspectInstalledHandoff({
      installed,
      workspace: ws[0],
      head: 'hermetic-fixture',
    });
    const authority = inspectReviewAuthority(ws[0]);
    const operations = path.join(ws[0], 'wake/operations');
    const wakes = existsSync(operations)
      ? readdirSync(operations)
          .filter((name) => /^[a-f0-9]{64}\.json$/.test(name))
          .map((name) => readWakeOperation(ws[0], `sha256:${name.slice(0, -5)}`))
      : [];
    progress = {
      elapsed_ms: Date.now() - handoffStarted,
      remaining_provider_ms: Number(process.env.APR_PROVIDER_DEADLINE_MS) - Date.now(),
      protocol: authority.state.protocol.state,
      events: authority.events.map((event) => event.type),
      wakes: wakes.map((wake) => ({
        role: wake.target_role,
        status: wake.status,
        outcomes: wake.outcomes,
      })),
    };
    const startup = path.join(ws[0], 'startup-request.json');
    if (existsSync(startup)) progress.startup = JSON.parse(readFileSync(startup)).stage;
    finalized =
      authority.state.protocol.state === 'accepted' &&
      wakes.filter((wake) => wake.target_role === 'author' && wake.status === 'acknowledged')
        .length === 2;
    if (!receipt || !finalized) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(receipt, 'actual installed automatic broker must acknowledge both role wakes');
  assert.ok(finalized, 'the returning author must finalize acceptance automatically');
  assert.deepEqual(readFileSync(process.env.APR_FIXTURE_CALLS, 'utf8').trim().split('\n'), [
    'start',
    'launch',
    'author-wake',
    'reviewer-wake',
    'author-wake',
  ]);

  const directory = path.join(root, '.scratch/peer-review');
  const ws = readdirSync(directory)
    .map((name) => path.join(directory, name))
    .find((file) => existsSync(path.join(file, 'events.jsonl')));
  const authority = inspectReviewAuthority(ws);
  assert.ok(authority.events.some((event) => event.type === 'reviewer-accepted'));
  assert.ok(!authority.events.some((event) => /manual.*suspend/.test(event.type)));
  await requestBroker(client, 'stop');
  for (const { child } of children) child.ref();
  await Promise.all(children.map(({ exited }) => exited));
  console.log(
    'Installed automatic handoff: one launch, one author wake, one reviewer return wake, and author finalization; normal commits.'
  );
} catch (error) {
  console.error(
    'Synthetic installed fixture diagnostics:',
    JSON.stringify({
      stage,
      ...progress,
      calls: existsSync(process.env.APR_FIXTURE_CALLS)
        ? readFileSync(process.env.APR_FIXTURE_CALLS, 'utf8').trim().split('\n')
        : [],
      brokers: children.map(({ child }) => ({
        exitCode: child.exitCode,
        signal: child.signalCode,
      })),
    })
  );
  const reviewDirectory = path.join(root, '.scratch/peer-review');
  if (existsSync(reviewDirectory)) {
    for (const name of readdirSync(reviewDirectory)) {
      const workspace = path.join(reviewDirectory, name);
      for (const relative of ['startup-request.json', 'provider/claude/launch-state.json']) {
        const file = path.join(workspace, relative);
        if (existsSync(file)) {
          const value = JSON.parse(readFileSync(file, 'utf8'));
          console.error(
            relative,
            JSON.stringify({
              stage: value.stage,
              status: value.status,
              provider_operation: value.provider_operation,
              diagnostic: value.diagnostic,
            })
          );
        }
      }
    }
  }
  console.error(error);
  if (existsSync(process.env.APR_FIXTURE_BROKER_LOG))
    console.error(readFileSync(process.env.APR_FIXTURE_BROKER_LOG, 'utf8'));
  throw error;
} finally {
  client?.connection?.close();
  for (const { child } of children)
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  for (const { child } of children) child.ref();
  await Promise.all(children.map(({ exited }) => exited));
}
