import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { configPaths, loadConfig } from '../../src/config/load.mjs';
import {
  createPrimaryAuthorityFixture,
  createRepositoryFixture,
} from '../helpers/repository-fixture.mjs';

async function resolve(cwd) {
  const api = await import('../../src/config/primary-authority.mjs');
  return api.resolvePrimaryAuthority({ cwd });
}

for (const { separateGitDir, pathsWithSpaces } of [
  { separateGitDir: false, pathsWithSpaces: false },
  { separateGitDir: true, pathsWithSpaces: false },
  { separateGitDir: false, pathsWithSpaces: true },
]) {
  test(`primary config resolves from linked subdirectories (separate administrative directory=${separateGitDir}, spaces=${pathsWithSpaces})`, async (t) => {
    const f = createPrimaryAuthorityFixture(t, { separateGitDir, pathsWithSpaces });
    const loaded = loadConfig({ cwd: path.join(f.linked, 'docs'), env: {}, home: f.outside });
    assert.equal(loaded.config.review?.max_turns, 4);
    assert.equal(loaded.paths.project, f.configPath);
    assert.equal(loaded.paths.primaryRoot, f.root);
    assert.equal(loaded.paths.activeWorktreeRoot, f.linked);
    const observed = await resolve(f.linked);
    assert.equal(observed.root, f.root);
    assert.equal(observed.commonDir, f.commonDir);
    assert.deepEqual(observed.ownedBlobs, f.record.owned_blobs);
    assert.match(observed.activationDigest, /^sha256:[0-9a-f]{64}$/);
  });
}

test('linked legacy config cannot contribute authority or complete primary fields', async (t) => {
  const f = createPrimaryAuthorityFixture(t);
  writeFileSync(
    path.join(f.linked, '.ai-peer-review.json'),
    JSON.stringify({
      schema: 'ai-peer-review.config/v1',
      review: { max_turns: 99, claim_ttl_ms: 99 },
    })
  );
  const loaded = loadConfig({ cwd: f.linked, env: {}, home: f.outside });
  assert.equal(loaded.config.review.max_turns, 4);
  assert.equal(loaded.config.review.claim_ttl_ms, undefined);
  assert.equal(loaded.diagnostics[0].code, 'linked-config-ignored');
});

for (const mutation of ['working', 'staged', 'deleted', 'symlink', 'committed', 'unmerged']) {
  test(`initialized authority refuses ${mutation} owned policy`, async (t) => {
    const f = createPrimaryAuthorityFixture(t);
    if (mutation === 'deleted') rmSync(f.configPath);
    else if (mutation === 'symlink') {
      rmSync(f.configPath);
      symlinkSync(path.join(f.outside, 'file.md'), f.configPath);
    } else {
      writeFileSync(f.configPath, JSON.stringify({ ...f.policy, review: { max_turns: 5 } }) + '\n');
      if (mutation === 'staged') f.git('add', '--', '.ai-peer-review/config.json');
      if (mutation === 'committed')
        f.git('commit', '--only', '-m', 'changed policy', '--', '.ai-peer-review/config.json');
      if (mutation === 'unmerged') {
        const blob = f.record.owned_blobs.config.blob;
        f.git('update-index', '--force-remove', '.ai-peer-review/config.json');
        // Real unmerged index entries, without an artificial Git API substitute.
        const { execFileSync } = await import('node:child_process');
        execFileSync('git', ['update-index', '--index-info'], {
          cwd: f.root,
          input: `100644 ${blob} 1\t.ai-peer-review/config.json\n100644 ${blob} 2\t.ai-peer-review/config.json\n100644 ${blob} 3\t.ai-peer-review/config.json\n`,
        });
      }
    }
    await assert.rejects(resolve(f.linked), { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' });
    assert.throws(() => loadConfig({ cwd: f.linked, env: {}, home: f.outside }), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
  });
}

test('identical owned blobs survive primary branch change and unrelated rebase state', async (t) => {
  const f = createPrimaryAuthorityFixture(t);
  f.git('switch', '-c', 'same-policy');
  mkdirSync(path.join(f.commonDir, 'rebase-merge'));
  await resolve(f.linked);
  writeFileSync(path.join(f.commonDir, 'MERGE_HEAD'), f.git('rev-parse', 'HEAD') + '\n');
  await resolve(f.root);
});

test('branch lacking activated files refuses without falling back to old policy', async (t) => {
  const f = createPrimaryAuthorityFixture(t);
  f.git('switch', '--detach', f.head);
  await assert.rejects(resolve(f.linked), { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' });
});

for (const corruption of [
  'missing',
  'foreign-root',
  'foreign-common',
  'unknown-schema',
  'unknown-field',
  'uninitialized',
  'moved',
]) {
  test(`authority refuses ${corruption} registration`, async (t) => {
    const f = createPrimaryAuthorityFixture(t);
    const record = structuredClone(f.record);
    if (corruption === 'missing') rmSync(f.registrationPath);
    if (corruption === 'foreign-root') record.primary_root = f.linked;
    if (corruption === 'foreign-common') record.common_dir = f.outside;
    if (corruption === 'unknown-schema') record.schema = 'future/v9';
    if (corruption === 'unknown-field') record.extra = true;
    if (corruption === 'uninitialized') {
      record.primary_initialized = false;
      record.owned_blobs = null;
      record.integration_contract = null;
    }
    if (corruption === 'moved') renameSync(f.root, path.join(f.parent, 'moved'));
    if (!['missing', 'moved'].includes(corruption)) f.writeRecord(record);
    await assert.rejects(resolve(f.linked), { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' });
  });
}

test('forged Git environment cannot redirect primary or index discovery', async (t) => {
  const f = createPrimaryAuthorityFixture(t);
  const foreign = createPrimaryAuthorityFixture(t);
  const changes = {
    GIT_DIR: foreign.commonDir,
    GIT_COMMON_DIR: foreign.commonDir,
    GIT_WORK_TREE: foreign.root,
    GIT_INDEX_FILE: path.join(foreign.commonDir, 'index'),
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.worktree',
    GIT_CONFIG_VALUE_0: foreign.root,
  };
  const prior = { ...process.env };
  try {
    Object.assign(process.env, changes);
    assert.equal((await resolve(f.linked)).root, f.root);
    assert.equal(configPaths({ cwd: f.linked }).primaryRoot, f.root);
  } finally {
    for (const key of Object.keys(changes)) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  }
});

test('registration owner permissions and non-symlink location are enforced', async (t) => {
  const f = createPrimaryAuthorityFixture(t);
  if (process.platform !== 'win32') {
    chmodSync(f.registrationPath, 0o644);
    await assert.rejects(resolve(f.root), { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' });
    chmodSync(f.registrationPath, 0o600);
  }
  const bytes = readFileSync(f.registrationPath);
  rmSync(f.registrationPath);
  writeFileSync(path.join(f.outside, 'registration.json'), bytes);
  symlinkSync(path.join(f.outside, 'registration.json'), f.registrationPath);
  await assert.rejects(resolve(f.root), { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' });
});

test('outside Git resolves user preferences only and no project paths', (t) => {
  const f = createRepositoryFixture(t);
  const dir = path.join(f.outside, '.config', 'ai-peer-review');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, 'config.json'),
    JSON.stringify({
      schema: 'ai-peer-review.user-config/v2',
      hosts: { codex: { resume: { command: ['codex', 'resume'] } } },
    })
  );
  const loaded = loadConfig({ cwd: f.outside, env: {}, home: f.outside });
  assert.deepEqual(loaded.config.hosts.codex.resume.command, ['codex', 'resume']);
  assert.equal(loaded.paths.project, null);
  assert.equal(loaded.paths.primaryRoot, null);
  assert.equal(loaded.paths.activeWorktreeRoot, null);
});

test('a lost registration cannot downgrade an existing primary policy to legacy loading', (t) => {
  const f = createPrimaryAuthorityFixture(t);
  rmSync(f.registrationPath);
  assert.throws(() => loadConfig({ cwd: f.linked, env: {}, home: f.outside }), {
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
});

test('shared skill dirty and missing bytes are unavailable primary authority', async (t) => {
  const f = createPrimaryAuthorityFixture(t);
  writeFileSync(f.skillPath, '# Modified shared procedure\n');
  await assert.rejects(resolve(f.linked), { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' });
  rmSync(f.skillPath);
  await assert.rejects(resolve(f.linked), { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' });
});

test('read-only mismatch diagnostics identify activated and current committed blobs', async (t) => {
  const f = createPrimaryAuthorityFixture(t);
  writeFileSync(f.configPath, JSON.stringify({ ...f.policy, review: { max_turns: 7 } }) + '\n');
  f.git('commit', '--only', '-m', 'new committed policy', '--', '.ai-peer-review/config.json');
  const before = readFileSync(f.registrationPath);
  await assert.rejects(resolve(f.linked), (error) => {
    assert.equal(error.details.activatedBlob, f.record.owned_blobs.config.blob);
    assert.equal(error.details.currentBlob, f.git('rev-parse', 'HEAD:.ai-peer-review/config.json'));
    assert.match(error.details.activationCommand, /primary activate --dry-run/);
    return true;
  });
  assert.deepEqual(readFileSync(f.registrationPath), before);
});

test('moved primary discovery cannot downgrade linked loading to legacy configuration', (t) => {
  const f = createPrimaryAuthorityFixture(t);
  renameSync(f.root, path.join(f.parent, 'moved-primary'));
  assert.throws(() => loadConfig({ cwd: path.join(f.linked, 'docs'), env: {}, home: f.outside }), {
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
});

test('an unrelated prunable worktree never blocks a valid caller and primary', async (t) => {
  const f = createPrimaryAuthorityFixture(t);
  const abandoned = path.join(f.parent, 'abandoned');
  f.git('worktree', 'add', '--detach', abandoned, 'HEAD');
  rmSync(abandoned, { recursive: true, force: true });
  assert.equal((await resolve(f.linked)).root, f.root);
});
