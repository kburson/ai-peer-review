import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadConfig, validateConfig } from '../../src/config/load.mjs';
import { planSetup, setup } from '../../src/config/setup.mjs';
import { doctor } from '../../src/doctor.mjs';
import { run, startReview } from '../../src/cli/run.mjs';
import { participantIdentity } from '../../src/identity/registry.mjs';

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
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(files.project, '.ai-peer-review.json'), 'utf8')).hosts.codex
      .resume.command,
    ['codex', 'resume']
  );
  const adapterFile = path.join(files.project, '.codex', 'config.json');
  const skillFile = path.join(files.project, '.codex', 'skills', 'peer-review', 'SKILL.md');
  assert.equal(JSON.parse(readFileSync(adapterFile, 'utf8')).ai_peer_review.transport, 'manual');
  const removal = setup({ ...options, remove: true, dryRun: true });
  assert.ok(
    removal.operations.findIndex((entry) => entry.owner === 'codex-skill') <
      removal.operations.findIndex((entry) => entry.owner === 'codex-adapter'),
    'the owned skill must be removed before its provider ownership record'
  );
  setup({ ...options, remove: true });
  assert.equal(readFileSync(files.exclude, 'utf8'), '# local excludes\n');
  assert.equal(existsSync(adapterFile), false);
  assert.equal(existsSync(skillFile), false);
  assert.equal(existsSync(path.join(files.project, '.ai-peer-review.json')), false);

  mkdirSync(path.dirname(adapterFile), { recursive: true });
  writeFileSync(adapterFile, '{"ai_peer_review":{"owner":"someone-else"}}\n');
  assert.throws(() => setup(options), { code: 'APR_SETUP_CONFLICT' });
});

test('runtime and published schema share authority and setup invariants', () => {
  const duplicateAgents = {
    schema: 'ai-peer-review.config/v1',
    setup: {
      owner: 'ai-peer-review',
      version: 1,
      agents: ['codex', 'codex'],
      config_created: true,
      scratch_exclude_added: true,
      resume_commands_added: ['codex'],
    },
  };
  assert.throws(() => validateConfig(duplicateAgents), { code: 'APR_CONFIG_INVALID' });

  const schema = JSON.parse(
    readFileSync(new URL('../../schemas/config-v1.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(schema.properties.authority.allOf, [
    {
      if: {
        properties: { authority_policy: { const: 'unavailable' } },
        required: ['authority_policy'],
      },
      then: { properties: { verifier: { type: 'null' } } },
      else: { properties: { verifier: { type: 'object' } } },
    },
  ]);
  assert.deepEqual(schema.properties.authority.properties.verifier.oneOf[1].allOf, [
    {
      if: { properties: { kind: { const: 'host' } }, required: ['kind'] },
      then: { properties: { public_key: { type: 'null' } } },
      else: { properties: { public_key: { type: 'string', minLength: 1 } } },
    },
  ]);
});

test('setup composes agents and preserves a pre-existing scratch exclusion', () => {
  const files = fixture();
  writeFileSync(files.exclude, '# local excludes\n.scratch/peer-review/\n');
  const base = {
    scope: 'project',
    cwd: files.project,
    home: files.home,
    gitExcludePath: files.exclude,
  };
  assert.equal(setup({ ...base, agents: ['codex'], dryRun: true }).changed, true);
  setup({ ...base, agents: ['codex'] });
  setup({ ...base, agents: ['claude'] });
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(files.project, '.ai-peer-review.json'), 'utf8')).setup.agents,
    ['claude', 'codex']
  );
  setup({ ...base, agents: ['codex'], remove: true });
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(files.project, '.ai-peer-review.json'), 'utf8')).setup.agents,
    ['claude']
  );
  assert.match(readFileSync(files.exclude, 'utf8'), /\.scratch\/peer-review\//);
  setup({ ...base, agents: ['claude'], remove: true });
  assert.match(readFileSync(files.exclude, 'utf8'), /\.scratch\/peer-review\//);
});

test('user and project config merge deeply with project precedence and reject unknown keys', () => {
  const files = fixture();
  const userDir = path.join(files.home, '.config', 'ai-peer-review');
  mkdirSync(userDir, { recursive: true });
  writeFileSync(
    path.join(userDir, 'config.json'),
    `${JSON.stringify({
      schema: 'ai-peer-review.config/v1',
      authority: {
        authority_policy: 'unavailable',
        challenge_ttl_ms: 900000,
        verifier: null,
      },
      hosts: {
        codex: {
          identity: {
            provider: 'openai',
            host: 'codex',
            model_id: 'gpt-test',
            model_display: 'GPT Test',
          },
        },
      },
      review: { reviews_root: 'docs/user-reviews', max_turns: 6 },
    })}\n`
  );
  writeFileSync(
    path.join(files.project, '.ai-peer-review.json'),
    `${JSON.stringify({
      schema: 'ai-peer-review.config/v1',
      hosts: { codex: { resume: { command: ['codex', 'resume'] } } },
      review: { reviews_root: 'docs/project-reviews' },
    })}\n`
  );
  const loaded = loadConfig({ cwd: files.project, home: files.home, env: {} });
  assert.equal(loaded.config.authority.authority_policy, 'unavailable');
  assert.equal(loaded.config.hosts.codex.identity.provider, 'openai');
  assert.deepEqual(loaded.config.hosts.codex.resume.command, ['codex', 'resume']);
  assert.equal(loaded.config.review.reviews_root, 'docs/project-reviews');
  assert.equal(loaded.config.review.max_turns, 6);

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

test('setup-only project configuration keeps consensus startup and resume diagnostics available', async (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'apr-setup-start-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs', 'plan.md'), '# Plan\n');
  execFileSync('git', ['add', 'docs/plan.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  setup({ scope: 'project', agents: ['codex'], cwd: root, confirmScratchExclude: true });
  let doctorOutput = '';
  let doctorError = '';
  const doctorCode = await run(['doctor', '--mode', 'resume-only', '--json'], {
    cwd: root,
    env: {
      CODEX_THREAD_ID: 'thread-123',
      CODEX_MODEL_ID: 'gpt-test',
      CODEX_MODEL_DISPLAY: 'GPT Test',
    },
    stdout: { write: (value) => (doctorOutput += value) },
    stderr: { write: (value) => (doctorError += value) },
  });
  assert.equal(doctorCode, 0, doctorError);
  assert.equal(JSON.parse(doctorOutput).healthy, true);
  const configFile = path.join(root, '.ai-peer-review.json');
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  config.hosts.codex.resume.command = ['sh', '-c'];
  writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
  const unavailableCode = await run(['doctor', '--mode', 'resume-only', '--json'], {
    cwd: root,
    env: {
      CODEX_THREAD_ID: 'thread-123',
      CODEX_MODEL_ID: 'gpt-test',
      CODEX_MODEL_DISPLAY: 'GPT Test',
    },
    stdout: { write() {} },
    stderr: { write() {} },
  });
  assert.equal(unavailableCode, 1);
  config.hosts.codex.resume.command = ['codex', 'resume'];
  config.review = { reviews_root: 'docs/custom-reviews', max_turns: 4 };
  writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
  const started = await startReview({
    cwd: root,
    artifact: 'docs/plan.md',
    artifactKind: 'plan',
    identity: participantIdentity({
      role: 'author',
      host: 'other',
      provider: 'other',
      modelId: 'test',
      modelDisplay: 'Test',
      sessionId: 'setup-start',
      source: 'declared',
      joinedAt: '2026-09-09T12:00:00.000Z',
    }),
    now: '2026-09-09T12:00:00.000Z',
  });
  assert.equal(started.review.authority.authority_policy, 'unavailable');
  assert.equal(started.review.max_turns, 4);
  assert.match(started.paths.reviewer_invitation, /docs\/custom-reviews/);
});
