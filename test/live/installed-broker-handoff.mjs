#!/usr/bin/env node
// Opt-in release gate. Provider output stays in a private disposable directory.
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const selected = args[args.indexOf('--provider') + 1];
if (args.length !== 2 || args[0] !== '--provider' || selected !== 'claude') {
  throw new Error('APR_LIVE_PROVIDER_UNAVAILABLE: select the proved installed Claude surface.');
}
const root = realpathSync(fileURLToPath(new URL('../..', import.meta.url)));
execFileSync('git', ['diff', '--exit-code', '--quiet', 'HEAD', '--'], { cwd: root });
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const surface = execFileSync('claude', ['--version'], { encoding: 'utf8' }).trim();
if (!surface.startsWith('2.1.278 '))
  throw new Error('APR_LIVE_PROVIDER_UNAVAILABLE: installed Claude surface changed.');
const scratch = mkdtempSync(path.join(os.tmpdir(), 'apr-installed-handoff-'));
const host = path.join(scratch, 'host');
mkdirSync(host);
writeFileSync(path.join(host, 'package.json'), '{"private":true}\n');
const npm = (argv, cwd = host) =>
  execFileSync('npm', argv, { cwd, encoding: 'utf8', timeout: 120_000 });
const packed = JSON.parse(
  npm(['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], root)
);
const tarball = (Array.isArray(packed) ? packed[0] : Object.values(packed)[0])?.filename;
if (!tarball) throw new Error('APR_LIVE_PACKAGE_INVALID: npm pack returned no tarball.');
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
  throw new Error('APR_LIVE_PACKAGE_INVALID: matching Node development headers unavailable.');
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
              command: 'node node_modules/@kburson/ai-peer-review/bin/peer-review-claude-hook.mjs',
            },
          ],
        },
      ],
    },
  })}\n`
);
git('add', '.gitignore', '.claude/settings.json', 'docs/spec.md');
git('commit', '-m', 'test: pin tiny broker handoff spec');

const env = { ...process.env };
for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX'])
  delete env[key];
const command =
  'npx peer-review start docs/spec.md --artifact-kind spec --reviewer-provider claude --reviewer-model claude-opus-5 --reviewer-effort low --transport-mode automatic-required --max-turns 2';
const prompt = `Run exactly this command once: ${command}. Then stop. This is a bounded review of a disposable tiny specification. Do not retry a provider or broker error.`;
const providerLog = path.join(scratch, 'author-stream.jsonl');
const child = spawn(
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
let providerBytes = 0;
let providerErrorBytes = 0;
child.stdout.on('data', (data) => {
  providerBytes += data.length;
  if (providerBytes <= 4 * 1024 * 1024)
    writeFileSync(providerLog, data, { flag: 'a', mode: 0o600 });
  else child.kill();
});
child.stderr.on('data', (data) => {
  providerErrorBytes += data.length;
  if (providerErrorBytes <= 1024 * 1024)
    writeFileSync(path.join(scratch, 'author-stderr.log'), data, { flag: 'a', mode: 0o600 });
});
const deadline = Date.now() + 12 * 60_000;
const timer = setTimeout(() => child.kill(), Math.max(1, deadline - Date.now()));
const exit = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('close', resolve);
});
clearTimeout(timer);
if (exit !== 0)
  throw new Error(`APR_LIVE_AUTHOR_FAILED: exit ${exit}; private evidence ${scratch}`);

const load = (file) => import(pathToFileURL(path.join(installed, file)));
const { inspectReview } = await load('src/protocol/service.mjs');
const { readWakeOperation } = await load('src/coordinator/ledger.mjs');
let receipt = null;
while (Date.now() < deadline) {
  const reviewsRoot = path.join(host, '.scratch', 'peer-review');
  const workspaces = existsSync(reviewsRoot)
    ? readdirSync(reviewsRoot)
        .map((name) => path.join(reviewsRoot, name))
        .filter((candidate) => existsSync(path.join(candidate, 'events.jsonl')))
    : [];
  if (workspaces.length > 1)
    throw new Error('APR_LIVE_REVIEW_AMBIGUOUS: more than one review exists.');
  if (workspaces.length === 1) {
    const workspace = workspaces[0];
    const authority = inspectReview(workspace);
    const directory = path.join(workspace, 'wake', 'operations');
    const wakes = existsSync(directory)
      ? readdirSync(directory).map((name) =>
          readWakeOperation(workspace, `sha256:${name.slice(0, -5)}`)
        )
      : [];
    const acknowledged = wakes.filter((wake) => wake.status === 'acknowledged');
    const authorWake = acknowledged.find((wake) => wake.target_role === 'author');
    const reviewerWake = acknowledged.find((wake) => wake.target_role === 'reviewer');
    const events = authority.events.map((event) => event.type);
    if (authorWake && reviewerWake && events.some((type) => type.startsWith('author-'))) {
      const participants = authority.state.participants;
      if (!participants.author || !participants.reviewer)
        throw new Error('APR_LIVE_BINDING_MISSING: both participants must be bound.');
      const authorBinding = JSON.parse(
        readFileSync(path.join(workspace, 'provider', 'bindings', 'author.json'), 'utf8')
      );
      const reviewerBinding = JSON.parse(
        readFileSync(path.join(workspace, 'provider', 'bindings', 'reviewer.json'), 'utf8')
      );
      if (
        authorBinding.session_fingerprint !== participants.author.session_fingerprint ||
        reviewerBinding.session_fingerprint !== participants.reviewer.session_fingerprint ||
        authorBinding.session_fingerprint === reviewerBinding.session_fingerprint ||
        authorBinding.adapter_version !== '1.0.0' ||
        reviewerBinding.adapter_version !== '1.0.0'
      )
        throw new Error('APR_LIVE_BINDING_CONFLICT: sealed and observed sessions differ.');
      receipt = {
        schema: 'ai-peer-review.installed-broker-handoff/v1',
        package_head: head,
        package_version: '0.3.0',
        provider: 'anthropic',
        host: 'claude-code',
        surface_version: '2.1.278',
        adapter_version: '1.0.0',
        commit_mode: authority.state.protocol.commit_mode,
        author_session_digest: participants.author.session_fingerprint,
        reviewer_session_digest: participants.reviewer.session_fingerprint,
        author_evidence_source: 'official-exact-session',
        reviewer_evidence_source: 'official-exact-session',
        author_evidence_digest: authorBinding.evidence_digest,
        reviewer_evidence_digest: reviewerBinding.evidence_digest,
        author_wake_operation: authorWake.operation_id,
        reviewer_wake_operation: reviewerWake.operation_id,
        outcome: 'two-way-acknowledged',
      };
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 2_000));
}
if (!receipt || receipt.commit_mode !== 'commit')
  throw new Error(
    `APR_LIVE_HANDOFF_UNPROVEN: exact two-way committed handoff unavailable; private evidence ${scratch}`
  );
const digest = createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
process.stdout.write(
  `${JSON.stringify({ ...receipt, receipt_digest: `sha256:${digest}` }, null, 2)}\n`
);
