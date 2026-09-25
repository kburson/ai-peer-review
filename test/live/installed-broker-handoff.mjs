#!/usr/bin/env node
import { withoutProviderIdentity } from '../../src/provider/preflight.mjs';
// Opt-in release gate. Provider output stays in a private disposable directory.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { spawnProviderProcess } from '../../src/providers/process-lifetime.mjs';
import {
  inspectInstalledHandoff,
  inspectInstalledHandoffWorkspaces,
} from '../helpers/installed-handoff-evidence.mjs';
import {
  spawnOwnedHandoffBroker,
  createInstalledHandoffScratch,
  cleanupHandoffBroker,
} from '../helpers/installed-handoff-lifecycle.mjs';

let head = null;
let stage = 'preflight';
let scratch;
const ownedProviders = [];
const ownedBrokers = [];
let deadline = Date.now();
let host;
let brokerClient;
let requestBroker;
let activeWorkspace;

async function run() {
  const args = process.argv.slice(2);
  const selected = args[args.indexOf('--provider') + 1];
  if (args.length !== 2 || args[0] !== '--provider' || selected !== 'claude') {
    throw Object.assign(new Error('Select the proved installed Claude surface.'), {
      code: 'APR_LIVE_PROVIDER_UNAVAILABLE',
    });
  }
  const root = realpathSync(fileURLToPath(new URL('../..', import.meta.url)));
  execFileSync('git', ['diff', '--exit-code', '--quiet', 'HEAD', '--'], { cwd: root });
  head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const surface = execFileSync('claude', ['--version'], {
    encoding: 'utf8',
    timeout: 30_000,
    killSignal: 'SIGKILL',
  }).trim();
  if (!surface.startsWith('2.1.278 '))
    throw Object.assign(new Error('Installed Claude surface changed.'), {
      code: 'APR_LIVE_PROVIDER_UNAVAILABLE',
    });
  scratch = createInstalledHandoffScratch({
    root,
    evidenceRoot: process.env.APR_LIVE_EVIDENCE_ROOT,
  });
  stage = 'package-install';
  host = path.join(scratch, 'host');
  mkdirSync(host);
  writeFileSync(path.join(host, 'package.json'), '{"private":true}\n');
  const npm = (argv, cwd = host) =>
    execFileSync('npm', argv, { cwd, encoding: 'utf8', timeout: 120_000 });
  const packed = JSON.parse(
    npm(['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], root)
  );
  const tarball = (Array.isArray(packed) ? packed[0] : Object.values(packed)[0])?.filename;
  if (!tarball)
    throw Object.assign(new Error('npm pack returned no tarball.'), {
      code: 'APR_LIVE_PACKAGE_INVALID',
    });
  npm([
    'install',
    '--offline',
    '--omit=dev',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    path.join(scratch, tarball),
  ]);
  const installed = path.join(host, 'node_modules', '@kburson', 'ai-peer-review');
  const headers = [
    process.env.APR_NODEDIR_BASE && path.join(process.env.APR_NODEDIR_BASE, process.versions.node),
    path.dirname(process.execPath),
    path.dirname(path.dirname(process.execPath)),
  ].find((candidate) => candidate && existsSync(path.join(candidate, 'include/node/node_api.h')));
  if (!headers)
    throw Object.assign(new Error('Matching Node development headers unavailable.'), {
      code: 'APR_LIVE_PACKAGE_INVALID',
    });
  npm(['--prefix', installed, 'run', 'build:broker-security', '--', '--nodedir', headers]);

  const git = (...argv) => execFileSync('git', argv, { cwd: host, encoding: 'utf8' });
  git('init', '-b', 'trunk');
  git('config', 'user.name', 'APR release fixture');
  git('config', 'user.email', 'apr-release@example.invalid');
  mkdirSync(path.join(host, 'docs'));
  mkdirSync(path.join(host, '.claude'));
  writeFileSync(
    path.join(host, 'docs', 'spec.md'),
    '# Tiny cache specification\n\nA missing key returns zero.\n\nAcceptance criteria:\n- A missing key returns zero.\n- A missing key returns one.\n'
  );
  writeFileSync(path.join(host, '.gitignore'), 'node_modules/\n.scratch/\n');
  writeFileSync(
    path.join(host, '.claude', 'settings.json'),
    `${JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              {
                type: 'command',
                command:
                  'node node_modules/@kburson/ai-peer-review/bin/peer-review-claude-hook.mjs',
              },
            ],
          },
        ],
      },
    })}\n`
  );
  git('add', '.gitignore', '.claude/settings.json', 'docs/spec.md');
  git('commit', '-m', 'test: pin tiny broker handoff spec');

  stage = 'broker-startup';
  deadline = Date.now() + 12 * 60_000;
  const env = {
    ...withoutProviderIdentity(process.env),
    APR_PROVIDER_DEADLINE_MS: String(deadline),
  };
  for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX'])
    delete env[key];
  const load = (file) => import(pathToFileURL(path.join(installed, file)));
  const { platformSecurity } = await load('src/broker/platform.mjs');
  const { canonicalProjectIdentity } = await load('src/broker/identity.mjs');
  const { ensureBroker, requestBroker: installedRequestBroker } =
    await load('src/broker/client.mjs');
  requestBroker = installedRequestBroker;
  const { createGitRepository } = await load('src/git/repository.mjs');
  const { pinRuntimeImage } = await load('src/broker/runtime-image.mjs');
  const runtimeImage = pinRuntimeImage({
    packageRoot: realpathSync(installed),
    nodeExecutable: realpathSync(process.execPath),
    destination: path.join(scratch, 'runtime-image'),
  });
  const platform = {
    ...platformSecurity(),
    repository: createGitRepository(),
    spawn(file, argv, options) {
      const owned = spawnOwnedHandoffBroker(file, argv, {
        ...options,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      ownedBrokers.push(owned);
      // Attach a rejection handler immediately; evidence remains private.
      owned.wait().catch(() => {});
      let bytes = 0;
      for (const stream of [owned.child.stdout, owned.child.stderr])
        stream.on('data', (data) => {
          bytes += data.length;
          if (bytes <= 4 * 1024 * 1024)
            writeFileSync(path.join(scratch, 'broker.log'), data, { flag: 'a', mode: 0o600 });
          // Retain the broker even if its private log reaches the size bound;
          // it still owns the detached providers and their deadline timers.
        });
      return owned.child;
    },
  };
  const project = canonicalProjectIdentity({ cwd: host, platform });
  brokerClient = await ensureBroker({
    project,
    platform,
    runtimeImage,
    versions: {
      package_version: '0.3.0',
      broker_protocol_version: 1,
      node_major: Number(process.versions.node.split('.')[0]),
    },
  });
  if (ownedBrokers.length !== 1)
    throw Object.assign(new Error('Disposable broker was not launched by this harness.'), {
      code: 'APR_LIVE_BROKER_OWNERSHIP',
    });
  await requestBroker(brokerClient, 'status');
  stage = 'author-start';
  const command =
    'npx peer-review start docs/spec.md --artifact-kind spec --reviewer-provider claude --reviewer-model claude-opus-5 --reviewer-effort low --transport-mode automatic-required --max-turns 2';
  const prompt = `Run exactly this command once: ${command}. Then stop. This is a bounded review of a disposable tiny specification. Do not retry a provider or broker error.`;
  const providerLog = path.join(scratch, 'author-stream.jsonl');
  const lifetime = spawnProviderProcess(
    'claude',
    [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--permission-mode',
      'dontAsk',
      '--model',
      'claude-opus-5',
      '--effort',
      'low',
      '--allowedTools',
      'Bash',
      'Read',
      'Write',
      'Edit',
    ],
    { cwd: host, env, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  ownedProviders.push(lifetime);
  const { child } = lifetime;
  let providerBytes = 0;
  let providerErrorBytes = 0;
  child.stdout.on('data', (data) => {
    providerBytes += data.length;
    if (providerBytes <= 4 * 1024 * 1024)
      writeFileSync(providerLog, data, { flag: 'a', mode: 0o600 });
    else void lifetime.stop();
  });
  child.stderr.on('data', (data) => {
    providerErrorBytes += data.length;
    if (providerErrorBytes <= 1024 * 1024)
      writeFileSync(path.join(scratch, 'author-stderr.log'), data, { flag: 'a', mode: 0o600 });
  });
  let authorSettled = false;
  let authorFailure;
  lifetime.wait().then(
    (exit) => {
      authorSettled = true;
      if (exit !== 0)
        authorFailure = Object.assign(new Error('Initial author turn failed.'), {
          code: 'APR_LIVE_AUTHOR_FAILED',
          stage: 'author-start',
        });
    },
    (error) => {
      authorSettled = true;
      authorFailure = error;
    }
  );

  stage = 'automatic-handoff';
  let receipt = null;
  while (Date.now() < deadline) {
    if (authorFailure) throw authorFailure;
    const workspaces = inspectInstalledHandoffWorkspaces({ host, authorSettled });
    if (workspaces.length > 1)
      throw Object.assign(new Error('More than one review exists.'), {
        code: 'APR_LIVE_REVIEW_AMBIGUOUS',
      });
    if (workspaces.length === 1) {
      const workspace = workspaces[0];
      activeWorkspace = workspace;
      receipt = await inspectInstalledHandoff({ installed, workspace, head });
      if (authorFailure) throw authorFailure;
      if (receipt && authorSettled) break;
    }
    if (ownedBrokers[0].child.exitCode !== null || ownedBrokers[0].child.signalCode !== null)
      throw Object.assign(new Error('Owned broker exited before handoff.'), {
        code: 'APR_LIVE_BROKER_EXITED',
      });
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(500, Math.max(0, deadline - Date.now())))
    );
  }
  if (!receipt || !authorSettled)
    throw Object.assign(new Error('Absolute provider deadline exhausted.'), {
      code: 'APR_LIVE_HANDOFF_UNPROVEN',
      reason: 'absolute-deadline-exhausted',
    });
  return receipt;
}

let receipt;
try {
  receipt = await run();
} catch (error) {
  // Keep raw diagnostic text private; emit only closed stage/reason values.
  if (scratch)
    writeFileSync(path.join(scratch, 'failure.log'), String(error.stack ?? error), { mode: 0o600 });
  receipt = {
    schema: 'ai-peer-review.installed-broker-handoff/v1',
    package_head: head,
    outcome: 'unproven',
    stage: error.stage ?? stage,
    reason:
      error.reason ?? (/^APR_[A-Z_]+$/.test(error.code ?? '') ? error.code : 'harness-failed'),
  };
  process.exitCode = 1;
} finally {
  // Stop the initial owned author first, so it cannot create another review
  // while cleanup is establishing the exact set of disposable workspaces.
  for (const owned of ownedProviders) owned.child.ref();
  await Promise.all(ownedProviders.map((owned) => owned.stop()));
  const cleanup = [];
  for (const broker of ownedBrokers) {
    broker.child.ref();
    cleanup.push(
      await cleanupHandoffBroker({
        broker,
        deadline,
        settle: async () => {
          if (!brokerClient) throw new Error('Broker settlement is unavailable.');
          const workspaces = host ? inspectInstalledHandoffWorkspaces({ host }) : [];
          if (workspaces.length > 1) throw new Error('Disposable review is ambiguous.');
          const workspace = workspaces[0] ?? activeWorkspace;
          if (workspace) {
            const result = await requestBroker(brokerClient, 'suspend', workspace);
            if (
              !['recovery-only', 'terminal'].includes(result.status) ||
              result.launch_status === 'pending'
            )
              throw new Error('Provider settlement is unproven.');
          } else {
            // Authenticated stop is the evidence that this empty broker owns no
            // launch or runnable review; filesystem absence alone is insufficient.
            const result = await requestBroker(brokerClient, 'stop');
            if (result.status !== 'stopping') throw new Error('Empty broker stop is unproven.');
          }
        },
      })
    );
  }
  brokerClient?.connection?.close();
  if (scratch)
    writeFileSync(
      path.join(scratch, 'cleanup.json'),
      JSON.stringify({
        cleanup,
        deadline,
        workspace: activeWorkspace,
        brokers: ownedBrokers.map(({ child }) => ({
          pid: child.pid,
          exitCode: child.exitCode,
          signal: child.signalCode,
        })),
      }),
      { mode: 0o600 }
    );
  receipt.cleanup_status = cleanup.every((result) => result.status === 'settled')
    ? 'settled'
    : 'unproven';
  if (receipt.cleanup_status === 'unproven') {
    if (receipt.outcome !== 'unproven') {
      receipt.outcome = 'unproven';
      receipt.stage = 'cleanup';
      receipt.reason = 'provider-settlement-unproven';
    }
    process.exitCode = 1;
  }
}
const digest = createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
process.stdout.write(
  `${JSON.stringify({ ...receipt, receipt_digest: `sha256:${digest}` }, null, 2)}\n`
);
