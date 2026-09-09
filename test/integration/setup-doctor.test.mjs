import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadConfig } from '../../src/config/load.mjs';
import { planSetup, setup } from '../../src/config/setup.mjs';
import { doctor } from '../../src/doctor.mjs';

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'apr-setup-'));
  const home = path.join(root, 'home');
  const project = path.join(root, 'project');
  const git = path.join(project, '.git');
  mkdirSync(home, { recursive: true });
  mkdirSync(path.join(git, 'info'), { recursive: true });
  writeFileSync(path.join(git, 'info', 'exclude'), '# local excludes\n');
  writeFileSync(path.join(project, '.gitignore'), 'dist/\n');
  return { root, home, project, exclude: path.join(git, 'info', 'exclude') };
}

for (const host of ['codex', 'claude', 'grok', 'generic']) {
  test(`setup preview is idempotent and reversible for ${host}`, () => {
    const files = fixture();
    const adapterFile = path.join(
      files.project,
      `.${host === 'generic' ? 'agents' : host}`,
      'config.json'
    );
    mkdirSync(path.dirname(adapterFile), { recursive: true });
    writeFileSync(adapterFile, `${JSON.stringify({ preserved: { value: host } }, null, 2)}\n`);

    const preview = setup({
      scope: 'project',
      agents: [host],
      cwd: files.project,
      home: files.home,
      dryRun: true,
      confirmScratchExclude: true,
      gitExcludePath: files.exclude,
    });
    assert.equal(preview.changed, true);
    assert.match(preview.diff, /ai_peer_review/);
    assert.equal(readFileSync(adapterFile, 'utf8').includes('ai_peer_review'), false);

    const applied = setup({ ...preview.input, dryRun: false });
    assert.equal(applied.changed, true);
    assert.deepEqual(JSON.parse(readFileSync(adapterFile, 'utf8')).preserved, { value: host });
    assert.match(readFileSync(files.exclude, 'utf8'), /\.scratch\/peer-review\//);
    assert.equal(readFileSync(path.join(files.project, '.gitignore'), 'utf8'), 'dist/\n');
    assert.equal(setup({ ...preview.input, dryRun: false }).changed, false);

    const removed = setup({ ...preview.input, dryRun: false, remove: true });
    assert.equal(removed.changed, true);
    assert.deepEqual(JSON.parse(readFileSync(adapterFile, 'utf8')), {
      preserved: { value: host },
    });
    assert.doesNotMatch(readFileSync(files.exclude, 'utf8'), /\.scratch\/peer-review\//);
  });
}

test('setup requires explicit scratch-exclude confirmation and exposes deterministic plans', () => {
  const files = fixture();
  assert.throws(
    () =>
      setup({
        scope: 'project',
        agents: ['generic'],
        cwd: files.project,
        home: files.home,
        gitExcludePath: files.exclude,
      }),
    { code: 'APR_SETUP_CONFIRMATION_REQUIRED' }
  );
  const first = planSetup({
    scope: 'project',
    host: 'generic',
    current: { preserved: true },
    desired: { enabled: true },
  });
  const second = planSetup({
    scope: 'project',
    host: 'generic',
    current: { preserved: true },
    desired: { enabled: true },
  });
  assert.deepEqual(first, second);
  assert.equal(first.backup_required, true);
});

test('fresh setup removes only its own files and refuses foreign provider ownership', () => {
  const files = fixture();
  const options = {
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  setup(options);
  const adapterFile = path.join(files.project, '.codex', 'config.json');
  const skillFile = path.join(files.project, '.codex', 'skills', 'peer-review', 'SKILL.md');
  assert.equal(JSON.parse(readFileSync(adapterFile, 'utf8')).ai_peer_review.transport, 'manual');
  setup({ ...options, remove: true });
  assert.equal(readFileSync(files.exclude, 'utf8'), '# local excludes\n');
  assert.equal(existsSync(adapterFile), false);
  assert.equal(existsSync(skillFile), false);
  assert.equal(existsSync(path.join(files.project, '.ai-peer-review.json')), false);

  mkdirSync(path.dirname(adapterFile), { recursive: true });
  writeFileSync(adapterFile, '{"ai_peer_review":{"owner":"someone-else"}}\n');
  assert.throws(() => setup(options), { code: 'APR_SETUP_CONFLICT' });
});

test('user and project config merge deeply with project precedence and reject unknown keys', () => {
  const files = fixture();
  const userDir = path.join(files.home, '.config', 'ai-peer-review');
  mkdirSync(userDir, { recursive: true });
  writeFileSync(
    path.join(userDir, 'config.json'),
    `${JSON.stringify({
      schema: 'ai-peer-review.config/v1',
      authority: { authority_policy: 'detection-allowed', challenge_ttl_ms: 900000 },
      hosts: { codex: { identity: { provider: 'openai' } } },
    })}\n`
  );
  writeFileSync(
    path.join(files.project, '.ai-peer-review.json'),
    `${JSON.stringify({
      schema: 'ai-peer-review.config/v1',
      hosts: { codex: { resume: { command: ['codex', 'resume'], scratch_handle: 'codex.json' } } },
    })}\n`
  );
  const loaded = loadConfig({ cwd: files.project, home: files.home, env: {} });
  assert.equal(loaded.config.authority.authority_policy, 'detection-allowed');
  assert.equal(loaded.config.hosts.codex.identity.provider, 'openai');
  assert.deepEqual(loaded.config.hosts.codex.resume.command, ['codex', 'resume']);

  writeFileSync(
    path.join(files.project, '.ai-peer-review.json'),
    '{"schema":"ai-peer-review.config/v1","secret":"nope"}\n'
  );
  assert.throws(() => loadConfig({ cwd: files.project, home: files.home, env: {} }), {
    code: 'APR_CONFIG_INVALID',
  });
});

test('doctor is read-only and Phase 2 rows are informational for Phase 1 modes', () => {
  const files = fixture();
  const before = readFileSync(files.exclude, 'utf8');
  const report = doctor({
    requestedMode: 'manual',
    packageResolved: true,
    skillAvailable: true,
    identity: { identity_source: 'runtime', session_fingerprint: 'sha256:abc' },
    git: { repository: true, worktreeSafe: true, scratchIgnored: true },
    authority: {
      authority_policy: 'detection-allowed',
      verifier: { verifier_fingerprint: 'sha256:def', assurance_grade: 'mutable-local' },
    },
    transport: { mode: 'manual', healthy: true },
  });
  assert.equal(report.healthy, true);
  for (const id of [
    'mcp-connectivity',
    'resident-liveness',
    'long-timeout',
    'automatic-required',
  ]) {
    assert.equal(
      report.rows.find((row) => row.id === id).status,
      'not-installed (Phase 2 optional)'
    );
  }
  assert.equal(readFileSync(files.exclude, 'utf8'), before);
  assert.equal(doctor({ ...report.input, requestedMode: 'automatic-required' }).healthy, false);
});
