// @story #190
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import {
  applyAtomicValidatedWrites,
  validateSetupWriteSet,
} from '../../src/config/setup-validation.mjs';

function fixture(t, scripts, drivers) {
  const root = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'apr setup checks ')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  const write = (relative, bytes) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  };
  git('init', '-b', 'trunk');
  git('config', 'user.name', 'Setup Check Fixture');
  git('config', 'user.email', 'setup@example.invalid');
  write('package.json', JSON.stringify({ name: 'host', private: true, scripts }) + '\n');
  write('README.md', '# Original\n');
  write('.codex/foreign.json', '{"foreign":"preserved"}\n');
  for (const [file, bytes] of Object.entries(drivers)) write(file, bytes);
  git('add', '.');
  git('commit', '-m', 'fixture');
  const file = path.join(root, '.ai-peer-review', 'config.json');
  const validate = (context = {}) =>
    validateSetupWriteSet({
      destinationRoot: root,
      writes: [
        { file, before: null, after: '{"review":{"max_turns":3}}\n', owner: 'package-config' },
      ],
      ...context,
    });
  return { root, file, git, write, validate };
}

const readsProposal = `import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync('.ai-peer-review/config.json','utf8'));
if(config.review.max_turns!==3) process.exit(17);
if(readFileSync('.codex/foreign.json','utf8')!=='{"foreign":"preserved"}\\n') process.exit(18);
`;

test('npm aliases and tracked Node checks validate proposed bytes without modifying the host', async (t) => {
  const f = fixture(
    t,
    {
      lint: 'npm run lint:code && npm run lint:policy && npm run lint:policy',
      'lint:code': 'eslint . --no-warn-ignored --max-warnings=0',
      'lint:policy': 'node scripts/check.mjs',
      'format:check': 'node scripts/check.mjs',
    },
    { 'scripts/check.mjs': readsProposal }
  );
  const before = f.git('status', '--porcelain');
  const checked = await f.validate();
  assert.equal(checked.writes.length, 1);
  assert.equal(existsSync(f.file), false);
  assert.equal(f.git('status', '--porcelain'), before);
  assert.equal(readFileSync(path.join(f.root, 'README.md'), 'utf8'), '# Original\n');
  assert.equal(
    readFileSync(path.join(f.root, '.codex/foreign.json'), 'utf8'),
    '{"foreign":"preserved"}\n'
  );
});

test('repository check rejection refuses before any proposed host write', async (t) => {
  const f = fixture(
    t,
    { lint: 'node scripts/check.mjs' },
    {
      'scripts/check.mjs': 'process.exit(19);\n',
    }
  );
  await assert.rejects(f.validate, /Repository-owned host check rejected/);
  assert.equal(existsSync(f.file), false);
  assert.equal(f.git('status', '--porcelain'), '');
});

test('write-format drivers receive only explicit proposed destination paths', async (t) => {
  const f = fixture(
    t,
    { 'format:write': 'node scripts/format.mjs --write' },
    {
      'scripts/format.mjs': `import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
assert.deepEqual(process.argv.slice(2),['--write','./.ai-peer-review/config.json']);
assert.equal(JSON.parse(readFileSync(process.argv[3],'utf8')).review.max_turns,3);
`,
    }
  );
  const checked = await f.validate();
  assert.equal(checked.writes.length, 1);
  assert.equal(existsSync(f.file), false);
  assert.equal(f.git('status', '--porcelain'), '');
});

test('candidate mutation cannot manufacture a passing repository check', async (t) => {
  const f = fixture(
    t,
    { lint: 'node scripts/check.mjs' },
    {
      'scripts/check.mjs':
        "import {writeFileSync} from 'node:fs';writeFileSync('README.md','# Changed\\n');\n",
    }
  );
  await assert.rejects(f.validate, /Host check changed tracked candidate inputs/);
  assert.equal(readFileSync(path.join(f.root, 'README.md'), 'utf8'), '# Original\n');
  assert.equal(existsSync(f.file), false);
});

test('new staged inputs remain part of candidate custody', async (t) => {
  const f = fixture(
    t,
    { lint: 'node scripts/check.mjs' },
    {
      'scripts/check.mjs':
        "import {writeFileSync} from 'node:fs';writeFileSync('new.md','# Changed\\n');\n",
    }
  );
  f.write('new.md', '# Original\n');
  f.git('add', 'new.md');
  await assert.rejects(f.validate, /Host check changed tracked candidate inputs/);
  assert.equal(readFileSync(path.join(f.root, 'new.md'), 'utf8'), '# Original\n');
  assert.equal(existsSync(f.file), false);
});

test('repository drivers cannot alter the proposed owned bytes', async (t) => {
  const f = fixture(
    t,
    { lint: 'node scripts/check.mjs' },
    {
      'scripts/check.mjs':
        "import {writeFileSync} from 'node:fs';writeFileSync('.ai-peer-review/config.json','{}\\n');\n",
    }
  );
  await assert.rejects(f.validate, /Host check changed proposed setup bytes/);
  assert.equal(existsSync(f.file), false);
});

test('redirected tracked source ancestry refuses before the repository driver runs', async (t) => {
  const f = fixture(t, { lint: 'node scripts/check.mjs' }, { 'scripts/check.mjs': readsProposal });
  const target = path.join(f.root, 'redirected-source');
  renameSync(path.join(f.root, 'scripts'), target);
  symlinkSync(
    target,
    path.join(f.root, 'scripts'),
    process.platform === 'win32' ? 'junction' : 'dir'
  );
  await assert.rejects(f.validate, /unsafe physical ancestry/);
  assert.equal(readFileSync(path.join(target, 'check.mjs'), 'utf8'), readsProposal);
  assert.equal(existsSync(f.file), false);
});

test('changed repository driver invalidates previously validated publication', async (t) => {
  const f = fixture(t, { lint: 'node scripts/check.mjs' }, { 'scripts/check.mjs': readsProposal });
  const checked = await f.validate();
  f.write('scripts/check.mjs', 'process.exit(0);\n');
  await assert.rejects(() => applyAtomicValidatedWrites(checked), { code: 'APR_SETUP_CONFLICT' });
  assert.equal(existsSync(f.file), false);
});

test('unknown commands, cyclic aliases and untracked drivers remain refused', async (t) => {
  for (const [name, scripts, tracked] of [
    ['unknown command', { lint: 'arbitrary-command' }, true],
    ['cycle', { lint: 'npm run lint:policy', 'lint:policy': 'npm run lint' }, true],
    ['untracked driver', { lint: 'node scripts/check.mjs' }, false],
    ['escape', { lint: 'node ../check.mjs' }, true],
  ]) {
    await t.test(name, async (t) => {
      const f = fixture(t, scripts, tracked ? { 'scripts/check.mjs': readsProposal } : {});
      if (!tracked) f.write('scripts/check.mjs', readsProposal);
      await assert.rejects(f.validate, { code: 'APR_SETUP_INVALID' });
      assert.equal(existsSync(f.file), false);
    });
  }
});

test('repository checks preserve caller cancellation and the original setup deadline', async (t) => {
  const f = fixture(t, { lint: 'node scripts/check.mjs' }, { 'scripts/check.mjs': readsProposal });
  const controller = new AbortController();
  controller.abort();
  for (const context of [
    { signal: controller.signal, deadline: performance.now() + 30000 },
    { signal: new AbortController().signal, deadline: performance.now() - 1 },
  ]) {
    await assert.rejects(f.validate(context), /aborted or deadline expired/);
    assert.equal(existsSync(f.file), false);
  }
});

test('a stalled Git child cannot overrun the caller setup deadline', (t) => {
  const f = fixture(t, { lint: 'node scripts/check.mjs' }, { 'scripts/check.mjs': readsProposal });
  const moduleUrl = new URL('../../src/config/setup-validation.mjs', import.meta.url).href;
  const code = `
    import assert from 'node:assert/strict';
    import childProcess from 'node:child_process';
    import {syncBuiltinESMExports} from 'node:module';
    import {performance} from 'node:perf_hooks';
    const original=childProcess.execFileSync;
    childProcess.execFileSync=(file,args,options)=>file==='git'
      ? original(process.execPath,['-e','setTimeout(()=>{},2000)'],options)
      : original(file,args,options);
    syncBuiltinESMExports();
    const {validateSetupWriteSet}=await import(${JSON.stringify(moduleUrl)});
    const started=performance.now();
    await assert.rejects(validateSetupWriteSet({
      destinationRoot:${JSON.stringify(f.root)},writes:[],
      signal:new AbortController().signal,deadline:started+250,
    }),{code:'APR_SETUP_INVALID'});
    assert.ok(performance.now()-started<1200,'stalled Git exceeded the original caller budget');
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8',
    timeout: 4500,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.git('status', '--porcelain'), '');
});
