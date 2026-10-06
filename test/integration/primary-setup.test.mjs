// @story #134
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { platformSecurity } from '../../src/broker/platform.mjs';
import { setupHostFixture } from '../helpers/setup-host-fixture.mjs';
test(
  'primary setup migrates portable policy without activating or committing it',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    f.write(
      '.ai-peer-review.json',
      '{"schema":"ai-peer-review.config/v1","review":{"max_turns":7}}\n'
    );
    const before = f.git('rev-parse', 'HEAD');
    await f.setupApply({ migrate: true });
    assert.equal(f.exists('.ai-peer-review/config.json'), true, 'migration creates primary policy');
    assert.equal(JSON.parse(f.read('.ai-peer-review/config.json')).review.max_turns, 7);
    assert.equal(f.exists('.ai-peer-review.json'), false);
    assert.equal(f.git('rev-parse', 'HEAD'), before);
    assert.equal(JSON.parse(readFileSync(f.registrationPath)).primary_initialized, false);
  }
);
test(
  'linked setup apply refuses with the physical primary recovery command',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await assert.rejects(
      Promise.resolve().then(() => f.setupApply({ cwd: f.linked })),
      (error) =>
        error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' &&
        error.recovery.includes(JSON.stringify(f.root))
    );
    assert.equal(f.exists('.ai-peer-review/config.json'), false);
  }
);
test(
  'mixed host settings retain exact foreign property bytes',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const fragment = '"foreign" : { "theme" : "dark", "nested" : [ 1, 2 ] }';
    f.write('.codex/hooks.json', '{ ' + fragment + ' }\n');
    await f.setupApply();
    assert.ok(
      f.read('.codex/hooks.json').includes(fragment),
      'owned hook insertion preserves foreign formatting'
    );
  }
);
test(
  'conflicting new and legacy primary copies refuse before any setup writes',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    f.write(
      '.ai-peer-review.json',
      '{"schema":"ai-peer-review.config/v1","review":{"max_turns":7}}\n'
    );
    const current = '{"schema":"ai-peer-review.primary-config/v2","review":{"max_turns":9}}\n';
    f.write('.ai-peer-review/config.json', current);
    await assert.rejects(
      Promise.resolve().then(() => f.setupApply({ migrate: true })),
      (error) => error.code === 'APR_SETUP_CONFLICT'
    );
    assert.equal(f.read('.ai-peer-review/config.json'), current);
    assert.equal(f.exists('.codex/hooks.json'), false);
  }
);

test(
  'machine fields require explicit user migration consent',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    f.write(
      '.ai-peer-review.json',
      '{"schema":"ai-peer-review.config/v1","hosts":{"codex":{"resume":{"command":["codex","resume"]}}}}\n'
    );
    await assert.rejects(
      Promise.resolve().then(() => f.setupApply({ migrate: true })),
      (error) => error.code === 'APR_SETUP_CONFLICT'
    );
    assert.equal(f.exists('.ai-peer-review/config.json'), false);
    assert.equal(f.exists('.ai-peer-review.json'), true);
  }
);
test(
  'setup writes only changed bytes and preserves unrelated dependencies',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const first = await f.setupApply();
    const before = f.read('.ai-peer-review/config.json');
    const second = await f.setupApply();
    assert.equal(second.applied, 0);
    assert.equal(f.read('.ai-peer-review/config.json'), before);
    assert.equal(f.read('package.json'), '{"name":"host","private":true}\n');
    assert.equal(f.exists('node_modules'), false);
    assert.ok(first.applied > 0);
  }
);
test(
  'conflicting host formatting refuses the complete setup before writing policy',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const foreign = '{ "foreign" : { "dark" : true } }\n';
    f.write('.codex/hooks.json', foreign);
    f.write('.prettierrc.json', '{"tabWidth":4}\n');
    await assert.rejects(
      Promise.resolve().then(() => f.setupApply()),
      /format/i
    );
    assert.equal(f.read('.codex/hooks.json'), foreign);
    assert.equal(f.exists('.ai-peer-review/config.json'), false);
  }
);

test(
  'committed setup can activate; dirty policy refuses without changing registration',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned integration');
    const api = f.core;
    assert.equal(typeof api.activate, 'function');
    const activated = await api.activate({ cwd: f.root });
    assert.equal(activated.root, f.root);
    assert.equal(JSON.parse(readFileSync(f.registrationPath)).primary_initialized, true);
    const receipt = readFileSync(f.registrationPath, 'utf8');
    f.write(
      '.ai-peer-review/config.json',
      f.read('.ai-peer-review/config.json').replace('"version": 3', '"version": 4')
    );
    await assert.rejects(api.activate({ cwd: f.root }), /clean|dirty|committed/i);
    assert.equal(readFileSync(f.registrationPath, 'utf8'), receipt);
  }
);
test(
  'activation refuses live or unknown review startup inventory',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned integration');
    f.write('.scratch/peer-review/mystery/startup.json', '{"stage":"reserved"}\n');
    const before = readFileSync(f.registrationPath, 'utf8');
    await assert.rejects(
      Promise.resolve().then(() => f.core.activate({ cwd: f.root })),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
    assert.equal(readFileSync(f.registrationPath, 'utf8'), before);
  }
);
test(
  'linked activation cannot select an experimental primary',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await assert.rejects(
      Promise.resolve().then(() => f.core.activate({ cwd: f.linked })),
      (error) =>
        error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' &&
        error.recovery.includes(JSON.stringify(f.root))
    );
  }
);

test(
  'integration currency detects modified wrappers while allowing unchanged package content',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned integration');
    await f.core.activate({ cwd: f.root });
    assert.equal(typeof f.core.inspectIntegration, 'function');
    const first = await f.core.inspectIntegration({ cwd: f.root });
    assert.equal(first.contract, 'ai-peer-review.integration/v1');
    f.write('.codex/skills/peer-review/SKILL.md', '# Obsolete copied procedure\n');
    await assert.rejects(
      f.core.inspectIntegration({ cwd: f.root }),
      (error) => error.code === 'APR_SETUP_VERSION_MISMATCH'
    );
  }
);
test(
  'linked discovery requires a current user wrapper and never falls back to copied branch content',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned integration');
    await f.core.activate({ cwd: f.root });
    await assert.rejects(
      Promise.resolve().then(() => f.core.inspectIntegration({ cwd: f.linked })),
      (error) => error.code === 'APR_SETUP_VERSION_MISMATCH'
    );
    await f.core.setup({ scope: 'user', agents: ['codex'] });
    const observation = await f.core.inspectIntegration({ cwd: f.linked });
    assert.ok(observation.skillPath.startsWith(f.root));
    assert.ok(observation.skillPath.endsWith('SKILL.md'));
  }
);

test(
  'teardown removes only recorded integrations and keeps project policy and foreign settings',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    f.write('.claude/settings.json', '{ "statusLine" : { "command" : "mine" } }\n');
    await f.setupApply({ agents: ['claude'] });
    f.git('add', '.');
    f.git('commit', '-m', 'integration');
    const removed = await f.setupApply({ agents: ['claude'], remove: true });
    assert.ok(removed.applied > 0);
    assert.equal(f.exists('.claude/skills/peer-review/SKILL.md'), false);
    assert.equal(JSON.parse(f.read('.claude/settings.json')).hooks?.PreToolUse?.length ?? 0, 0);
    assert.ok(f.read('.claude/settings.json').includes('"statusLine" : { "command" : "mine" }'));
    assert.equal(JSON.parse(f.read('.ai-peer-review/config.json')).setup, undefined);
  }
);
test(
  'legacy neutral adapter metadata moves out of provider configuration without foreign edits',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    f.write(
      '.ai-peer-review.json',
      '{"schema":"ai-peer-review.config/v1","setup":{"owner":"ai-peer-review","version":1,"agents":["codex"],"config_created":true,"scratch_exclude_added":true,"resume_commands_added":[]}}\n'
    );
    const fragment = '"foreign" : { "keep" : true }';
    f.write(
      '.codex/config.json',
      '{ ' + fragment + ', "ai_peer_review":{"owner":"ai-peer-review","version":1} }\n'
    );
    await f.setupApply({ migrate: true });
    const bytes = f.read('.codex/config.json');
    assert.ok(bytes.includes(fragment));
    assert.equal(JSON.parse(bytes).ai_peer_review, undefined);
  }
);
test(
  'orphan broker registrations are unknown activity rather than an idle clone',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'integration');
    f.write('.scratch/peer-review/broker/registrations/orphan.json', '{}\n');
    await assert.rejects(
      f.core.activate({ cwd: f.root }),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
  }
);

test(
  'activation rejects committed modified host integrations before changing the receipt',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.write('.codex/skills/peer-review/SKILL.md', '# Modified wrapper\n');
    f.git('add', '.');
    f.git('commit', '-m', 'modified integration');
    const before = readFileSync(f.registrationPath, 'utf8');
    await assert.rejects(
      f.core.activate({ cwd: f.root }),
      (error) => error.code === 'APR_SETUP_VERSION_MISMATCH'
    );
    assert.equal(readFileSync(f.registrationPath, 'utf8'), before);
  }
);

test(
  'compatible host Markdown wrapping preserves normalized integration currency',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    f.write('.prettierrc.json', '{"printWidth":60,"proseWrap":"always"}\n');
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'host-formatted integration');
    const activated = await f.core.activate({ cwd: f.root });
    assert.equal(activated.root, f.root);
    const current = await f.core.inspectIntegration({ cwd: f.root });
    assert.equal(current.contract, 'ai-peer-review.integration/v1');
  }
);

test(
  'production setup refuses source authority even when a caller supplies another home',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const { setup } = await import('../../src/config/setup.mjs');
    await assert.rejects(
      Promise.resolve().then(() =>
        setup({ scope: 'user', agents: ['codex'], home: f.home, dryRun: true })
      ),
      (error) => error.code === 'APR_SETUP_INVALID' || error.code.startsWith('APR_RUNTIME_')
    );
  }
);

test(
  'matching legacy package metadata still requires primary integration migration',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const { installedPackageIdentity, assertProjectSetupCompatible } =
      await import('../../src/config/installation-identity.mjs');
    const identity = installedPackageIdentity();
    f.write(
      '.ai-peer-review.json',
      JSON.stringify({
        schema: 'ai-peer-review.config/v1',
        setup: {
          owner: 'ai-peer-review',
          version: 1,
          agents: ['generic'],
          config_created: true,
          scratch_exclude_added: false,
          resume_commands_added: [],
          ...identity,
        },
      }) + '\n'
    );
    f.write(
      '.agents/skills/peer-review/SKILL.md',
      readFileSync(new URL('../../skills/peer-review/SKILL.md', import.meta.url), 'utf8')
    );
    // This fixture tests the legacy guard; no registration is present yet.
    const { rmSync } = await import('node:fs');
    rmSync(f.registrationPath);
    assert.throws(
      () => assertProjectSetupCompatible({ cwd: f.root, env: {} }),
      (error) =>
        error.code === 'APR_SETUP_VERSION_MISMATCH' && error.details.migration_required === true
    );
  }
);

test(
  'explicit registration repair preserves evidence and resets an unknown schema to uninitialized',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const { writeFileSync, readdirSync } = await import('node:fs');
    const bytes = '{"schema":"future-registration/v9","foreign":"retain"}\n';
    writeFileSync(f.registrationPath, bytes);
    await assert.rejects(
      f.core.register({ cwd: f.root }),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
    const preview = await f.core.register({ cwd: f.root, update: true, dryRun: true });
    assert.equal(preview.after.primary_initialized, false);
    assert.equal(readFileSync(f.registrationPath, 'utf8'), bytes);
    await f.core.register({ cwd: f.root, update: true });
    assert.equal(JSON.parse(readFileSync(f.registrationPath)).primary_initialized, false);
    const path = await import('node:path');
    const receipts = readdirSync(path.dirname(f.registrationPath)).filter((name) =>
      name.startsWith('receipt-')
    );
    assert.ok(
      receipts.some(
        (name) =>
          JSON.parse(readFileSync(path.join(path.dirname(f.registrationPath), name)))
            .before_bytes_base64 === Buffer.from(bytes).toString('base64')
      )
    );
  }
);

test(
  'register update preserves a valid activation instead of invalidating clean policy',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned');
    await f.core.activate({ cwd: f.root });
    const before = readFileSync(f.registrationPath, 'utf8');
    await f.core.register({ cwd: f.root, update: true });
    assert.equal(readFileSync(f.registrationPath, 'utf8'), before);
  }
);

test(
  'setup refuses an unknown active reservation before changing any integration',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const journal = '{"schema":"unknown-startup/v9"}\n';
    f.write('.scratch/peer-review/transactions/reserved/startup.json', journal);
    await assert.rejects(
      f.setupApply(),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
    assert.equal(f.exists('.ai-peer-review/config.json'), false);
    assert.equal(f.read('.scratch/peer-review/transactions/reserved/startup.json'), journal);
  }
);

test(
  'destination formatter ignore permits a mixed hook file without changing foreign bytes',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const foreign = '{ "foreign" : { "dark" : true } }\n';
    f.write('.codex/hooks.json', foreign);
    f.write('.prettierrc.json', '{"tabWidth":4}\n');
    f.write('.prettierignore', '.codex/hooks.json\n');
    await f.setupApply();
    assert.ok(f.read('.codex/hooks.json').includes('"foreign" : { "dark" : true }'));
  }
);

test(
  'integration refuses a symlinked wrapper ancestor even when its bytes match',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned');
    await f.core.activate({ cwd: f.root });
    const { renameSync, symlinkSync } = await import('node:fs');
    const path = await import('node:path');
    renameSync(path.join(f.root, '.codex/skills'), path.join(f.root, 'moved-skills'));
    symlinkSync(path.join(f.root, 'moved-skills'), path.join(f.root, '.codex/skills'), 'dir');
    await assert.rejects(
      f.core.inspectIntegration({ cwd: f.root }),
      (error) => error.code === 'APR_SETUP_VERSION_MISMATCH'
    );
  }
);

test(
  'oversized primary registration refuses before parsing otherwise valid JSON',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const { writeFileSync } = await import('node:fs');
    const { readPrimaryRegistration } = await import('../../src/config/primary-authority.mjs');
    const { discoverAuthorityRepository } = await import('../../src/git/repository.mjs');
    const bytes = readFileSync(f.registrationPath, 'utf8');
    writeFileSync(f.registrationPath, ' '.repeat(1024 * 1024) + bytes);
    assert.throws(
      () => readPrimaryRegistration(discoverAuthorityRepository(f.root)),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
  }
);

test(
  'maintenance refuses an existing clone admission fence before any project write',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    f.write('.git/ai-peer-review/admission.lock/owner.json', '{"operation":"other-maintenance"}\n');
    await assert.rejects(
      f.setupApply(),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
    await assert.rejects(
      f.core.register({ cwd: f.root, update: true }),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
    assert.equal(f.exists('.ai-peer-review/config.json'), false);
  }
);

test(
  'project setup confirms and atomically appends its local scratch exclude',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const original = f.read('.git/info/exclude');
    await assert.rejects(
      f.setupApply({ confirmScratchExclude: false }),
      (error) => error.code === 'APR_SETUP_CONFLICT'
    );
    assert.equal(f.exists('.ai-peer-review/config.json'), false);
    const preview = await f.setupApply({ dryRun: true });
    assert.ok(preview.writes.some((entry) => entry.file.endsWith(path.join('info', 'exclude'))));
    assert.equal(f.read('.git/info/exclude'), original);
    await f.setupApply();
    assert.ok(f.read('.git/info/exclude').startsWith(original));
    assert.equal(f.git('check-ignore', '.scratch/peer-review/probe'), '.scratch/peer-review/probe');
    assert.equal((await f.setupApply()).applied, 0);
  }
);

test(
  'legacy update discovers recorded owned hosts during explicit migration',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const { installedPackageIdentity } = await import('../../src/config/installation-identity.mjs');
    f.write(
      '.ai-peer-review.json',
      JSON.stringify({
        schema: 'ai-peer-review.config/v1',
        setup: {
          owner: 'ai-peer-review',
          version: 1,
          agents: ['generic'],
          config_created: true,
          scratch_exclude_added: false,
          resume_commands_added: [],
          ...installedPackageIdentity(),
        },
      }) + '\n'
    );
    f.write('.agents/skills/peer-review/SKILL.md', '# Old owned skill\n');
    await f.setupApply({ update: true, migrate: true });
    assert.equal(f.exists('.ai-peer-review.json'), false);
    assert.equal(JSON.parse(f.read('.ai-peer-review/config.json')).setup.agents[0], 'generic');
    assert.match(f.read('.agents/skills/peer-review/SKILL.md'), /primary inspect --json/);
  }
);

test(
  'explicit machine migration writes invoking account preferences and refuses a collision',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const legacy =
      '{"schema":"ai-peer-review.config/v1","hosts":{"codex":{"resume":{"command":["codex","resume"]}}}}\n';
    f.write('.ai-peer-review.json', legacy);
    const path = await import('node:path');
    const userFile = path.join(f.home, '.config/ai-peer-review/config.json');
    const preview = await f.setupApply({ migrate: true, migrateUser: true, dryRun: true });
    assert.ok(preview.writes.some((entry) => entry.file === userFile));
    await f.setupApply({ migrate: true, migrateUser: true });
    assert.deepEqual(JSON.parse(readFileSync(userFile)).hosts.codex.resume.command, [
      'codex',
      'resume',
    ]);
    assert.equal(JSON.parse(f.read('.ai-peer-review/config.json')).hosts, undefined);
    const g = await setupHostFixture(t);
    g.write('.ai-peer-review.json', legacy);
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const other = path.join(g.home, '.config/ai-peer-review/config.json');
    mkdirSync(path.dirname(other), { recursive: true });
    const existing =
      '{"schema":"ai-peer-review.user-config/v2","hosts":{"codex":{"resume":{"command":["different","resume"]}}}}\n';
    writeFileSync(other, existing);
    await assert.rejects(
      g.setupApply({ migrate: true, migrateUser: true }),
      (error) => error.code === 'APR_SETUP_CONFLICT'
    );
    assert.equal(readFileSync(other, 'utf8'), existing);
    assert.equal(g.exists('.ai-peer-review/config.json'), false);
  }
);

test(
  'verified owned suspension permits activation without rewriting review evidence',
  { skip: 'Native broker verification paused for #102/#107' },
  async (t) => {
    const f = await setupHostFixture(t);
    const { rmSync } = await import('node:fs');
    const saved = readFileSync(f.registrationPath);
    rmSync(f.registrationPath);
    f.write('docs/artifact.md', '# Artifact\n');
    f.write('.git/info/exclude', f.read('.git/info/exclude') + '\n.scratch/peer-review/\n');
    f.git('add', 'docs/artifact.md');
    f.git('commit', '-m', 'artifact');
    const { startReview, fixtureSelection, fixtureStartupDeps } =
      await import('../helpers/internal-api.mjs');
    const { identity, NOW } = await import('../helpers/intervention-fixture.mjs');
    const started = await startReview(
      {
        ...fixtureSelection('claude', 'claude-opus-5'),
        cwd: f.root,
        artifact: 'docs/artifact.md',
        artifactKind: 'spec',
        identity: identity('author', 'activation-fixture'),
        now: NOW,
        reviewId: 'activation-review',
      },
      fixtureStartupDeps
    );
    const directory = platformSecurity().openPrivateDirectory(path.dirname(f.registrationPath));
    try {
      directory.create(path.basename(f.registrationPath), saved);
    } finally {
      directory.close();
    }
    await assert.rejects(
      f.setupApply(),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
    const { fenceManualRecovery } = await import('../helpers/broker-client-api.mjs');
    await fenceManualRecovery(started.paths.workspace, {
      connect: async () => ({ request: async () => ({ status: 'recovery-only' }) }),
    });
    const eventFile = path.join(started.paths.workspace, 'events.jsonl'),
      journalFile = path.join(started.paths.workspace, 'startup-request.json');
    const events = readFileSync(eventFile),
      journal = readFileSync(journalFile);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned');
    await f.core.activate({ cwd: f.root });
    assert.deepEqual(readFileSync(eventFile), events);
    assert.deepEqual(readFileSync(journalFile), journal);
  }
);

test(
  'package version changes leave unchanged contracts current; a changed contract refuses',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned');
    const primary = await f.core.activate({ cwd: f.root });
    const { cpSync, writeFileSync, mkdirSync } = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const source = fileURLToPath(new URL('../..', import.meta.url)),
      copy = path.join(f.parent, 'package fixture');
    mkdirSync(copy);
    cpSync(path.join(source, 'templates'), path.join(copy, 'templates'), { recursive: true });
    cpSync(path.join(source, 'skills'), path.join(copy, 'skills'), { recursive: true });
    writeFileSync(
      path.join(copy, 'package.json'),
      '{"name":"@kburson/ai-peer-review","version":"999.0.0"}\n'
    );
    const { createIntegrationChecker } =
      await import('../../src/config/integration-contract-core.mjs');
    const checker = createIntegrationChecker({ packageRoot: copy, home: f.home });
    assert.equal(checker.check(primary).primaryRoot, f.root);
    const file = path.join(copy, 'templates/integration/contract-v1.json'),
      manifest = JSON.parse(readFileSync(file));
    writeFileSync(file, '{broken');
    assert.throws(
      () => checker.check(primary),
      (error) => error.code === 'APR_SETUP_VERSION_MISMATCH'
    );
    manifest.contract = 'ai-peer-review.integration/v2';
    writeFileSync(file, JSON.stringify(manifest));
    assert.throws(
      () => checker.check(primary),
      (error) => error.code === 'APR_SETUP_VERSION_MISMATCH'
    );
  }
);

test(
  'linked dry run reports primary branch, byte digests and actual activity inventory',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const result = await f.setupApply({ cwd: f.linked, dryRun: true });
    assert.equal(result.primaryBranch, 'trunk');
    assert.equal(result.primaryRoot, f.root);
    assert.deepEqual(result.ownedDirtyPaths, []);
    assert.deepEqual(result.inventory.reviews, []);
    assert.ok(result.writes.some((entry) => /^[a-f0-9]{64}$/.test(entry.afterDigest)));
    assert.match(result.primaryCommand, /setup/);
    assert.equal(f.exists('.ai-peer-review/config.json'), false);
  }
);

test(
  'a changed admission proof is retained for inspection and cannot be silently released',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const { withPrimaryAdmissionFence } = await import('../../src/config/primary-admission.mjs');
    await assert.rejects(
      withPrimaryAdmissionFence({ commonDir: f.commonDir }, async () => {
        f.write('.git/ai-peer-review/admission.lock/owner.json', '{"owner":"changed"}\n');
      }),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
    assert.equal(f.read('.git/ai-peer-review/admission.lock/owner.json'), '{"owner":"changed"}\n');
  }
);

test(
  'setup update refuses dirty and staged primary policy without changing before bytes',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned');
    const file = '.ai-peer-review/config.json',
      config = JSON.parse(f.read(file));
    config.review = { max_turns: 9 };
    const bytes = JSON.stringify(config) + '\n';
    f.write(file, bytes);
    await assert.rejects(
      f.setupApply({ update: true }),
      (error) => error.code === 'APR_SETUP_CONFLICT'
    );
    assert.equal(f.read(file), bytes);
    f.git('add', file);
    await assert.rejects(
      f.setupApply({ update: true }),
      (error) => error.code === 'APR_SETUP_CONFLICT'
    );
    assert.equal(f.read(file), bytes);
  }
);

test(
  'new committed policy requires explicit activation and reports old and new blobs',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    await f.setupApply();
    f.git('add', '.');
    f.git('commit', '-m', 'owned');
    await f.core.activate({ cwd: f.root });
    const before = readFileSync(f.registrationPath, 'utf8');
    const config = JSON.parse(f.read('.ai-peer-review/config.json'));
    config.review = { max_turns: 8 };
    f.write('.ai-peer-review/config.json', JSON.stringify(config, null, 2) + '\n');
    f.git('add', '.ai-peer-review/config.json');
    f.git('commit', '-m', 'policy update');
    await assert.rejects(
      f.core.inspectIntegration({ cwd: f.root }),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
    const plan = await f.core.activate({ cwd: f.root, dryRun: true });
    assert.notEqual(plan.before.owned_blobs.config.blob, plan.after.owned_blobs.config.blob);
    assert.equal(readFileSync(f.registrationPath, 'utf8'), before);
    const current = await f.core.activate({ cwd: f.root });
    assert.equal(current.config.review.max_turns, 8);
  }
);

test(
  'explicit repair restores a moved registration only to the physical primary',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const { writeFileSync } = await import('node:fs');
    const prior = JSON.parse(readFileSync(f.registrationPath));
    prior.primary_root = f.linked;
    writeFileSync(f.registrationPath, JSON.stringify(prior) + '\n');
    await assert.rejects(
      f.core.register({ cwd: f.linked, update: true }),
      (error) => error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
    );
    await f.core.register({ cwd: f.root, update: true });
    assert.equal(JSON.parse(readFileSync(f.registrationPath)).primary_root, f.root);
    assert.equal(JSON.parse(readFileSync(f.registrationPath)).primary_initialized, false);
  }
);

test(
  'user maintenance shares the loader preference path while wrappers stay in the account home',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t),
      path = await import('node:path');
    const { mkdirSync } = await import('node:fs');
    const preferences = path.join(f.parent, 'user preferences');
    mkdirSync(preferences);
    const { configPaths } = await import('../../src/config/load.mjs');
    const userFile = configPaths({
      cwd: f.home,
      home: f.home,
      env: { XDG_CONFIG_HOME: preferences },
    }).user;
    const { createSetupMaintenanceCore } = await import('../../src/config/setup-core.mjs');
    const { fileURLToPath } = await import('node:url');
    const core = createSetupMaintenanceCore({
      packageRoot: fileURLToPath(new URL('../..', import.meta.url)),
      home: f.home,
      userFile,
      admit: async () => {},
    });
    await core.setup({ scope: 'user', agents: ['generic'] });
    assert.equal(
      JSON.parse(readFileSync(userFile)).setup.integration_contract,
      'ai-peer-review.integration/v1'
    );
    assert.match(
      readFileSync(path.join(f.home, '.agents/skills/peer-review/SKILL.md'), 'utf8'),
      /primary inspect --json/
    );
  }
);

test(
  'legacy project inspection remains readable beside migrated account preferences',
  {
    skip:
      process.platform === 'win32'
        ? 'Native broker security required on Windows; paused for #102/#107'
        : false,
  },
  async (t) => {
    const f = await setupHostFixture(t);
    const { rmSync } = await import('node:fs');
    rmSync(f.registrationPath);
    const { installedPackageIdentity, assertProjectSetupCompatible } =
      await import('../../src/config/installation-identity.mjs');
    f.write(
      '.ai-peer-review.json',
      JSON.stringify({
        schema: 'ai-peer-review.config/v1',
        review: { max_turns: 7 },
        setup: {
          owner: 'ai-peer-review',
          version: 1,
          agents: ['generic'],
          config_created: true,
          scratch_exclude_added: false,
          resume_commands_added: [],
          ...installedPackageIdentity(),
        },
      })
    );
    const user = pathForUser(f);
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(user.directory, { recursive: true });
    writeFileSync(
      user.file,
      JSON.stringify({
        schema: 'ai-peer-review.user-config/v2',
        hosts: { codex: { resume: { command: ['codex', 'resume'] } } },
      })
    );
    const { loadConfig } = await import('../../src/config/load.mjs');
    const loaded = loadConfig({ cwd: f.root, home: f.home, env: user.env });
    assert.equal(loaded.config.review.max_turns, 7);
    assert.deepEqual(loaded.config.hosts.codex.resume.command, ['codex', 'resume']);
    assert.equal(loaded.paths.primaryRoot, null);
    assert.throws(() => assertProjectSetupCompatible({ cwd: f.root, env: user.env }), {
      code: 'APR_SETUP_VERSION_MISMATCH',
    });
  }
);

function pathForUser(f) {
  const directory = f.home + '/.config/ai-peer-review';
  return {
    directory,
    file: directory + '/config.json',
    env: { XDG_CONFIG_HOME: f.home + '/.config' },
  };
}
