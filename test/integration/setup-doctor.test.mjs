import { fixtureSelection, fixtureStartupDeps } from '../helpers/internal-api.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { configPaths, loadConfig, validateConfig } from '../../src/config/load.mjs';
import { planSetup, setup, updateSetup } from '../../src/config/setup.mjs';
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

test('Windows configuration falls back to the supplied home when APPDATA is absent', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  assert.equal(
    configPaths({
      cwd: files.project,
      home: files.home,
      env: {},
      platform: 'win32',
    }).user,
    path.join(files.home, '.config', 'ai-peer-review', 'config.json')
  );
});

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
    const configuredAdapter = JSON.parse(readFileSync(adapterFile, 'utf8'));
    assert.deepEqual(configuredAdapter.preserved, { value: host });
    assert.equal(configuredAdapter.ai_peer_review.version, 2);
    assert.equal(configuredAdapter.ai_peer_review.adapter_version, '2.0.0');
    if (['codex', 'claude'].includes(host)) {
      assert.deepEqual(configuredAdapter.ai_peer_review.mcp.server_command, ['peer-review-mcp']);
      assert.equal(configuredAdapter.ai_peer_review.mcp.tool_timeout_ms, 28_800_000);
      assert.equal(configuredAdapter.ai_peer_review.mcp.heartbeat_interval_ms, 15_000);
      assert.equal(configuredAdapter.ai_peer_review.mcp.lease_ttl_ms, 60_000);
      assert.equal(configuredAdapter.ai_peer_review.transport, 'live-wait');
    } else {
      assert.equal(configuredAdapter.ai_peer_review.mcp, null);
      assert.equal(configuredAdapter.ai_peer_review.transport, 'manual');
    }
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

test('Claude setup preview, apply, and removal preserve foreign hooks and status line', () => {
  const files = fixture();
  const settingsFile = path.join(files.project, '.claude', 'settings.json');
  mkdirSync(path.dirname(settingsFile), { recursive: true });
  const foreignSettings = `${JSON.stringify(
    {
      hooks: { SessionStart: [{ command: 'user-owned-session-hook' }] },
      statusLine: { type: 'command', command: 'user-owned-status-line' },
    },
    null,
    2
  )}\n`;
  writeFileSync(settingsFile, foreignSettings);
  const options = {
    scope: 'project',
    agents: ['claude'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };

  setup({ ...options, dryRun: true });
  assert.equal(readFileSync(settingsFile, 'utf8'), foreignSettings);
  setup(options);
  const installed = JSON.parse(readFileSync(settingsFile, 'utf8'));
  assert.deepEqual(installed.hooks.SessionStart, [{ command: 'user-owned-session-hook' }]);
  assert.equal(installed.statusLine.command, 'user-owned-status-line');
  assert.equal(installed.hooks.PreToolUse[0].hooks[0].command, 'peer-review-claude-hook');
  setup({ ...options, remove: true, dryRun: true });
  assert.deepEqual(JSON.parse(readFileSync(settingsFile, 'utf8')), installed);
  setup({ ...options, remove: true });
  assert.equal(readFileSync(settingsFile, 'utf8'), foreignSettings);
});

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
  const installation = setup({ ...options, dryRun: true });
  assert.ok(
    installation.operations.findIndex((entry) => entry.owner === 'codex-adapter') <
      installation.operations.findIndex((entry) => entry.owner === 'codex-skill'),
    'the provider ownership record must be installed before the owned skill'
  );
  setup(options);
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(files.project, '.ai-peer-review.json'), 'utf8')).hosts.codex
      .resume.command,
    ['codex', 'resume']
  );
  const adapterFile = path.join(files.project, '.codex', 'config.json');
  const skillFile = path.join(files.project, '.codex', 'skills', 'peer-review', 'SKILL.md');
  assert.equal(JSON.parse(readFileSync(adapterFile, 'utf8')).ai_peer_review.transport, 'live-wait');
  assert.deepEqual(
    JSON.parse(readFileSync(path.join(files.project, '.ai-peer-review.json'), 'utf8')).hosts.codex
      .automatic,
    {
      adapter_version: '2.0.0',
      capability: 'live-wait',
      server_command: ['peer-review-mcp'],
      tool_timeout_ms: 28_800_000,
      heartbeat_interval_ms: 15_000,
      lease_ttl_ms: 60_000,
    }
  );
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

test('removal preserves a pre-existing exact skill while removing provider ownership', () => {
  const files = fixture();
  const skillFile = path.join(files.project, '.codex', 'skills', 'peer-review', 'SKILL.md');
  mkdirSync(path.dirname(skillFile), { recursive: true });
  writeFileSync(
    skillFile,
    readFileSync(new URL('../../skills/peer-review/SKILL.md', import.meta.url), 'utf8')
  );
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
  assert.equal(JSON.parse(readFileSync(adapterFile, 'utf8')).ai_peer_review.skill_created, false);
  setup({ ...options, remove: true });
  assert.equal(existsSync(skillFile), true);
  assert.equal(existsSync(adapterFile), false);
});

test('setup automatically replaces an older package-owned skill and keeps the previous bytes', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const options = {
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  setup(options);
  const skillFile = path.join(files.project, '.codex', 'skills', 'peer-review', 'SKILL.md');
  const installed = readFileSync(skillFile, 'utf8');
  const previous = `${installed}\n<!-- previous installed package -->\n`;
  writeFileSync(skillFile, previous);
  const preview = setup({ ...options, dryRun: true });
  assert.equal(preview.changed, true);
  assert.ok(
    preview.operations.some((item) => item.owner === 'codex-skill' && item.backup_required)
  );
  assert.equal(readFileSync(skillFile, 'utf8'), previous);
  setup(options);
  assert.equal(readFileSync(skillFile, 'utf8'), installed);
  assert.equal(readFileSync(`${skillFile}.bak`, 'utf8'), previous);
  assert.equal(setup(options).changed, false);
});

test('teardown removes an older package-owned skill idempotently with a backup', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const options = {
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  setup(options);
  const skillFile = path.join(files.project, '.codex', 'skills', 'peer-review', 'SKILL.md');
  const previous = `${readFileSync(skillFile, 'utf8')}\n<!-- previous installed package -->\n`;
  writeFileSync(skillFile, previous);
  const preview = setup({ ...options, remove: true, dryRun: true });
  assert.ok(
    preview.operations.some((item) => item.owner === 'codex-skill' && item.backup_required)
  );
  setup({ ...options, remove: true });
  assert.equal(existsSync(skillFile), false);
  assert.equal(readFileSync(`${skillFile}.bak`, 'utf8'), previous);
  assert.equal(setup({ ...options, remove: true }).changed, false);
});

test('setup refuses a foreign differing skill without ownership evidence', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const skillFile = path.join(files.project, '.codex', 'skills', 'peer-review', 'SKILL.md');
  mkdirSync(path.dirname(skillFile), { recursive: true });
  writeFileSync(skillFile, 'foreign skill\n');
  const options = {
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  assert.throws(() => setup(options), { code: 'APR_SETUP_CONFLICT' });
  assert.equal(readFileSync(skillFile, 'utf8'), 'foreign skill\n');
});

test('setup --update refreshes every recorded project host and is idempotent', async (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const options = {
    scope: 'project',
    agents: ['codex', 'claude'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  setup(options);
  const changed = [];
  for (const host of ['codex', 'claude']) {
    const file = path.join(files.project, `.${host}`, 'skills', 'peer-review', 'SKILL.md');
    const oldBytes = `${readFileSync(file, 'utf8')}\nprevious package\n`;
    writeFileSync(file, oldBytes);
    changed.push({ file, oldBytes });
  }
  const updateOptions = { cwd: files.project, home: files.home, gitExcludePath: files.exclude };
  const preview = updateSetup({ ...updateOptions, dryRun: true });
  assert.equal(preview.schema, 'ai-peer-review.setup-plan/v1');
  assert.equal(preview.changed, true);
  assert.deepEqual(preview.agents, ['claude', 'codex']);
  assert.equal(
    changed.every(({ file, oldBytes }) => readFileSync(file, 'utf8') === oldBytes),
    true
  );
  const applied = updateSetup(updateOptions);
  assert.equal(applied.schema, 'ai-peer-review.setup-result/v1');
  assert.equal(applied.status, 'applied');
  assert.equal(applied.diff, undefined);
  assert.deepEqual(applied.backups.sort(), changed.map(({ file }) => `${file}.bak`).sort());
  for (const { file, oldBytes } of changed) {
    assert.notEqual(readFileSync(file, 'utf8'), oldBytes);
    assert.equal(readFileSync(`${file}.bak`, 'utf8'), oldBytes);
  }
  const unchanged = updateSetup(updateOptions);
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.status, 'no-changes');
  execFileSync('git', ['init', '-q'], { cwd: files.project });
  const codexSkill = changed.find(
    ({ file }) => path.basename(path.dirname(path.dirname(path.dirname(file)))) === '.codex'
  ).file;
  writeFileSync(codexSkill, `${readFileSync(codexSkill, 'utf8')}\nprevious package\n`);
  const cliOutput = [];
  const cliErrors = [];
  assert.equal(
    await run(['setup', '--update'], {
      cwd: files.project,
      env: {},
      stdout: { write: (value) => cliOutput.push(String(value)) },
      stderr: { write: (value) => cliErrors.push(String(value)) },
    }),
    0,
    cliErrors.join('')
  );
  assert.match(cliOutput.join(''), /Setup applied/i);
  assert.match(cliOutput.join(''), /SKILL\.md/);
  assert.match(cliOutput.join(''), /\.bak/);
  assert.doesNotMatch(cliOutput.join(''), /"schema"/);
  const jsonOutput = [];
  assert.equal(
    await run(['setup', '--update', '--json'], {
      cwd: files.project,
      env: {},
      stdout: { write: (value) => jsonOutput.push(String(value)) },
      stderr: { write: (value) => cliErrors.push(String(value)) },
    }),
    0,
    cliErrors.join('')
  );
  const cliResult = JSON.parse(jsonOutput.at(-1));
  assert.equal(cliResult.schema, 'ai-peer-review.setup-result/v1');
  assert.equal(cliResult.status, 'no-changes');
  const noChangesOutput = [];
  await run(['setup', '--update'], {
    cwd: files.project,
    env: {},
    stdout: { write: (value) => noChangesOutput.push(String(value)) },
    stderr: { write: (value) => cliErrors.push(String(value)) },
  });
  assert.match(noChangesOutput.join(''), /already up to date/i);
  writeFileSync(codexSkill, `${readFileSync(codexSkill, 'utf8')}\nprevious package again\n`);
  const appliedJsonOutput = [];
  await run(['setup', '--update', '--json'], {
    cwd: files.project,
    env: {},
    stdout: { write: (value) => appliedJsonOutput.push(String(value)) },
    stderr: { write: (value) => cliErrors.push(String(value)) },
  });
  const appliedJson = JSON.parse(appliedJsonOutput.at(-1));
  assert.equal(appliedJson.status, 'applied');
  assert.deepEqual(appliedJson.backups, [`${codexSkill}.bak`]);
  const previewOutput = [];
  await run(['setup', '--update', '--dry-run'], {
    cwd: files.project,
    env: {},
    stdout: { write: (value) => previewOutput.push(String(value)) },
    stderr: { write: (value) => cliErrors.push(String(value)) },
  });
  assert.match(previewOutput.join(''), /Preview only/i);

  assert.throws(() => updateSetup({ ...updateOptions, remove: true }), {
    code: 'APR_SETUP_INVALID',
  });
  assert.throws(() => updateSetup({ ...updateOptions, agents: ['codex'] }), {
    code: 'APR_SETUP_INVALID',
  });
});

test('setup --update refuses a project with no prior package-owned setup', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  assert.throws(() => updateSetup({ cwd: files.project, home: files.home }), {
    code: 'APR_SETUP_INVALID',
  });
});

test('installed CLI refuses stale setup package identity before review work', async (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const options = {
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  setup(options);
  const configFile = path.join(files.project, '.ai-peer-review.json');
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  assert.match(config.setup.package_version, /^\d+\.\d+\.\d+$/);
  assert.match(config.setup.skill_sha256, /^[0-9a-f]{64}$/);
  const output = { stdout: '', stderr: '' };
  const io = {
    cwd: files.project,
    env: {},
    stdout: {
      write: (value) => {
        output.stdout += value;
      },
    },
    stderr: {
      write: (value) => {
        output.stderr += value;
      },
    },
  };
  config.setup.package_version = '0.0.0';
  writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
  assert.equal(await run(['status', 'missing-review'], io), 1);
  assert.equal(JSON.parse(output.stderr).code, 'APR_SETUP_VERSION_MISMATCH');
  assert.match(JSON.parse(output.stderr).recovery, /setup --update --dry-run/i);
  output.stderr = '';
  assert.equal(await run(['help', 'setup'], io), 0);
  assert.match(output.stdout, /--remove/);
  delete config.setup.package_version;
  writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
  output.stderr = '';
  assert.equal(await run(['doctor'], io), 1);
  assert.equal(JSON.parse(output.stderr).code, 'APR_SETUP_VERSION_MISMATCH');
  setup(options);
  const skillFile = path.join(files.project, '.codex', 'skills', 'peer-review', 'SKILL.md');
  writeFileSync(skillFile, `${readFileSync(skillFile, 'utf8')}\nchanged\n`);
  output.stderr = '';
  assert.equal(await run(['status', 'missing-review'], io), 1);
  assert.equal(JSON.parse(output.stderr).code, 'APR_SETUP_VERSION_MISMATCH');
  setup(options);
  assert.equal(setup(options).changed, false);
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

test('setup migrates an owned v1 installation to reversible Phase 2 adapters', () => {
  const files = fixture();
  writeFileSync(
    path.join(files.project, '.ai-peer-review.json'),
    `${JSON.stringify({
      schema: 'ai-peer-review.config/v1',
      hosts: { codex: { resume: { command: ['codex', 'resume'] } } },
      setup: {
        owner: 'ai-peer-review',
        version: 1,
        agents: ['codex'],
        config_created: false,
        scratch_exclude_added: false,
        resume_commands_added: ['codex'],
      },
    })}\n`
  );
  const options = {
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };

  setup(options);
  const migrated = JSON.parse(
    readFileSync(path.join(files.project, '.ai-peer-review.json'), 'utf8')
  );
  assert.equal(migrated.setup.version, 2);
  assert.deepEqual(migrated.setup.automatic_adapters_added, ['codex']);
  assert.equal(migrated.hosts.codex.automatic.capability, 'live-wait');

  setup({ ...options, remove: true });
  const removed = JSON.parse(
    readFileSync(path.join(files.project, '.ai-peer-review.json'), 'utf8')
  );
  assert.equal(removed.hosts, undefined);
  assert.equal(removed.setup, undefined);
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

test('doctor runs active Phase 2 checks without making them mandatory for permissive modes', () => {
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
  for (const id of ['mcp-connectivity', 'resident-liveness', 'long-timeout'])
    assert.equal(report.rows.find((row) => row.id === id).status, 'unavailable');
  assert.equal(report.rows.find((row) => row.id === 'automatic-required').status, 'unavailable');
  assert.equal(readFileSync(files.exclude, 'utf8'), before);
  assert.equal(doctor({ ...report.input, requestedMode: 'automatic-required' }).healthy, false);

  const automatic = doctor({
    ...report.input,
    requestedMode: 'automatic-required',
    transport: { mode: 'automatic-required', healthy: true },
    phaseTwo: {
      mcp: { healthy: true, adapter_version: '2.0.0' },
      resident: { healthy: true, reason: 'ok' },
      timeout: { healthy: true, milliseconds: 28_800_000 },
      automatic: { healthy: true, reason: 'round-trip-ok' },
    },
  });
  assert.equal(automatic.healthy, true);
  assert.deepEqual(
    automatic.rows.slice(-4).map(({ id, status, required }) => ({ id, status, required })),
    [
      { id: 'mcp-connectivity', status: 'ok', required: true },
      { id: 'resident-liveness', status: 'ok', required: true },
      { id: 'long-timeout', status: 'ok', required: true },
      { id: 'automatic-required', status: 'ok', required: true },
    ]
  );
  assert.equal(
    doctor({
      ...automatic.input,
      phaseTwo: { ...automatic.input.phaseTwo, resident: { healthy: false, reason: 'expired' } },
    }).healthy,
    false
  );
});

test('installation doctor does not require a session model or transport but requires the broker helper', () => {
  const base = {
    requestedMode: 'installation',
    packageResolved: true,
    skillAvailable: true,
    identity: null,
    git: { repository: true, worktreeSafe: true, scratchIgnored: true },
    transport: { mode: 'manual', healthy: true },
    brokerSecurity: { healthy: true, build_command: 'ai-peer-review build broker-security' },
  };
  const report = doctor(base);
  assert.equal(report.healthy, true);
  assert.equal(report.rows.find((row) => row.id === 'identity-source').required, false);
  assert.equal(report.rows.find((row) => row.id === 'session-fingerprint').required, false);
  assert.equal(report.rows.find((row) => row.id === 'broker-security').required, true);
  assert.equal(doctor({ ...base, requestedMode: 'manual' }).healthy, false);
  assert.equal(
    doctor({ ...base, brokerSecurity: { ...base.brokerSecurity, healthy: false } }).healthy,
    false
  );
});

test('setup installs and removes only its exact start hook beside foreign host hooks', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const codexHooks = path.join(files.project, '.codex', 'hooks.json');
  mkdirSync(path.dirname(codexHooks), { recursive: true });
  writeFileSync(
    codexHooks,
    `${JSON.stringify({ hooks: { SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: 'foreign-hook' }] }] } }, null, 2)}\n`
  );
  const options = {
    scope: 'project',
    agents: ['codex', 'claude'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  const first = setup(options);
  const codex = JSON.parse(readFileSync(codexHooks, 'utf8'));
  const claudeSettings = path.join(files.project, '.claude', 'settings.json');
  const claude = JSON.parse(readFileSync(claudeSettings, 'utf8'));
  assert.equal(codex.hooks.SessionStart[0].hooks[0].command, 'foreign-hook');
  assert.equal(codex.hooks.PreToolUse.at(-1).matcher, '^(?:Bash|functions\\.exec|exec)$');
  assert.equal(codex.hooks.PreToolUse.at(-1).hooks[0].command, 'peer-review-codex-hook');
  assert.equal(claude.hooks.PreToolUse.at(-1).hooks[0].command, 'peer-review-claude-hook');
  assert.ok(first.backups.includes(`${codexHooks}.bak`));
  assert.equal(setup(options).changed, false);
  setup({ ...options, remove: true });
  const restored = JSON.parse(readFileSync(codexHooks, 'utf8'));
  assert.equal(restored.hooks.SessionStart[0].hooks[0].command, 'foreign-hook');
  assert.equal(restored.hooks.PreToolUse, undefined);
  assert.equal(existsSync(claudeSettings), false);
  assert.equal(setup({ ...options, remove: true }).changed, false);
});

test('setup upgrades its owned Bash-only Codex hook and teardown removes the upgraded hook', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const options = {
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  setup(options);
  const hooksFile = path.join(files.project, '.codex', 'hooks.json');
  const original = JSON.parse(readFileSync(hooksFile, 'utf8'));
  original.hooks.PreToolUse[0].matcher = 'Bash';
  original.hooks.PreToolUse.push({
    matcher: 'Bash',
    hooks: [{ type: 'command', command: 'foreign-hook' }],
  });
  writeFileSync(hooksFile, `${JSON.stringify(original, null, 2)}\n`);

  assert.equal(setup({ ...options, update: true }).changed, true);
  const upgraded = JSON.parse(readFileSync(hooksFile, 'utf8'));
  assert.deepEqual(
    upgraded.hooks.PreToolUse.map((group) => group.matcher),
    ['^(?:Bash|functions\\.exec|exec)$', 'Bash']
  );
  assert.equal(setup({ ...options, update: true }).changed, false);
  setup({ ...options, remove: true });
  const restored = JSON.parse(readFileSync(hooksFile, 'utf8'));
  assert.deepEqual(restored.hooks.PreToolUse, [
    { matcher: 'Bash', hooks: [{ type: 'command', command: 'foreign-hook' }] },
  ]);
});

test('teardown removes an owned Bash-only Codex hook before setup migration', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const options = {
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  setup(options);
  const hooksFile = path.join(files.project, '.codex', 'hooks.json');
  const original = JSON.parse(readFileSync(hooksFile, 'utf8'));
  original.hooks.PreToolUse[0].matcher = 'Bash';
  writeFileSync(hooksFile, `${JSON.stringify(original, null, 2)}\n`);
  assert.equal(setup({ ...options, remove: true }).changed, true);
  assert.equal(existsSync(hooksFile), false);
});

test('setup removes a leftover owned Bash-only hook when the new Codex matcher already exists', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const options = {
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  setup(options);
  const hooksFile = path.join(files.project, '.codex', 'hooks.json');
  const original = JSON.parse(readFileSync(hooksFile, 'utf8'));
  original.hooks.PreToolUse.push({
    matcher: 'Bash',
    hooks: [{ type: 'command', command: 'peer-review-codex-hook' }],
  });
  writeFileSync(hooksFile, `${JSON.stringify(original, null, 2)}\n`);
  assert.equal(setup({ ...options, update: true }).changed, true);
  assert.deepEqual(JSON.parse(readFileSync(hooksFile, 'utf8')).hooks.PreToolUse, [
    original.hooks.PreToolUse[0],
  ]);
});

test('setup preserves a pre-existing local Claude start hook without adding a duplicate', (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  const settingsFile = path.join(files.project, '.claude', 'settings.json');
  mkdirSync(path.dirname(settingsFile), { recursive: true });
  const existing = {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [{ type: 'command', command: 'node bin/peer-review-claude-hook.mjs' }],
        },
      ],
    },
  };
  writeFileSync(settingsFile, `${JSON.stringify(existing)}\n`);
  const options = {
    scope: 'project',
    agents: ['claude'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  };
  setup(options);
  assert.deepEqual(JSON.parse(readFileSync(settingsFile, 'utf8')), existing);
  setup({ ...options, remove: true });
  assert.deepEqual(JSON.parse(readFileSync(settingsFile, 'utf8')), existing);
});

test('doctor reports the explicit broker helper build command without blocking legacy manual rows', () => {
  const base = {
    requestedMode: 'manual',
    packageResolved: true,
    skillAvailable: true,
    identity: { identity_source: 'runtime', session_fingerprint: 'sha256:abc' },
    git: { repository: true, worktreeSafe: true, scratchIgnored: true },
    authority: {},
    transport: { mode: 'manual', healthy: true },
    brokerSecurity: {
      healthy: false,
      build_command:
        'npm --prefix /project/node_modules/@kburson/ai-peer-review run build:broker-security -- --nodedir /absolute/local/node-development-tree',
    },
  };
  const report = doctor(base);
  const broker = report.rows.find((entry) => entry.id === 'broker-security');
  assert.deepEqual(broker, {
    id: 'broker-security',
    status: 'unavailable',
    required: false,
    details: base.brokerSecurity,
  });
  assert.equal(report.healthy, true);
  assert.equal(
    doctor({ ...base, brokerSecurity: { ...base.brokerSecurity, healthy: true } }).healthy,
    true
  );
  assert.equal(doctor({ ...base, requestedMode: 'automatic-required' }).healthy, false);
});

test('doctor text distinguishes installation health from missing current-session identity', async (t) => {
  const files = fixture();
  t.after(() => rmSync(files.root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q'], { cwd: files.project });
  setup({
    scope: 'project',
    agents: ['codex'],
    cwd: files.project,
    home: files.home,
    confirmScratchExclude: true,
    gitExcludePath: files.exclude,
  });
  const configFile = path.join(files.project, '.ai-peer-review.json');
  const legacyConfig = JSON.parse(readFileSync(configFile, 'utf8'));
  legacyConfig.hosts.codex.identity = {
    provider: 'openai',
    host: 'codex',
    model_id: 'gpt-older-model',
    model_display: 'Old Model',
  };
  writeFileSync(configFile, `${JSON.stringify(legacyConfig)}\n`);
  const invoke = async (args) => {
    let stdout = '';
    let stderr = '';
    const code = await run(args, {
      cwd: files.project,
      env: { CODEX_THREAD_ID: 'session-with-changing-model' },
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: (value) => (stderr += value) },
      brokerSecurity: { healthy: true, build_command: 'ai-peer-review build broker-security' },
    });
    return { code, stdout, stderr };
  };
  const session = await invoke(['doctor']);
  assert.equal(session.code, 1);
  assert.match(session.stdout, /session readiness: unhealthy/i);
  assert.match(session.stdout, /identity-source: unavailable/i);
  assert.match(session.stdout, /recovery: .*model/i);
  assert.match(session.stdout, /linked worktree/i);
  assert.match(session.stdout, /active hook source/i);
  assert.match(session.stdout, /\/hooks/);
  assert.doesNotMatch(session.stdout, /recovery: ai-peer-review build broker-security/i);
  const installed = await invoke(['doctor', '--mode', 'installation']);
  assert.equal(installed.code, 0, installed.stderr);
  assert.match(installed.stdout, /installation: healthy/i);
  assert.doesNotMatch(installed.stdout, /recovery: ai-peer-review build broker-security/i);
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
    brokerSecurity: { healthy: true, build_command: 'already-built' },
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
    brokerSecurity: { healthy: true, build_command: 'already-built' },
  });
  assert.equal(unavailableCode, 1);
  config.hosts.codex.resume.command = ['codex', 'resume'];
  config.review = { reviews_root: 'docs/custom-reviews', max_turns: 4 };
  writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
  const started = await startReview(
    {
      ...fixtureSelection('codex', 'gpt-test'),
      cwd: root,
      artifact: 'docs/plan.md',
      artifactKind: 'plan',
      identity: participantIdentity({
        role: 'author',
        host: 'codex',
        provider: 'openai',
        modelId: 'test',
        modelDisplay: 'Test',
        sessionId: 'setup-start',
        source: 'declared',
        joinedAt: '2026-09-09T12:00:00.000Z',
      }),
      now: '2026-09-09T12:00:00.000Z',
    },
    fixtureStartupDeps
  );
  assert.equal(started.review.authority.authority_policy, 'unavailable');
  assert.equal(started.review.max_turns, 4);
  assert.match(started.paths.reviewer_invitation, /docs[\\/]custom-reviews/);
});
