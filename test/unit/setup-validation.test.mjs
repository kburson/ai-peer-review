// cspell:ignore Flibbertywordzz
// @story #134
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { setupHostFixture } from '../helpers/setup-host-fixture.mjs';
test('complete write validation uses parent formatting without writing destinations or dependencies', async (t) => {
  const f = await setupHostFixture(t);
  writeFileSync(path.join(f.parent, '.prettierrc.json'), '{"tabWidth":4}\n');
  const { validateSetupWriteSet } = await import('../../src/config/setup-validation.mjs');
  const file = path.join(f.root, '.ai-peer-review/config.json');
  const checked = await validateSetupWriteSet({
    destinationRoot: f.root,
    writes: [
      {
        file,
        before: null,
        after: '{"schema":"ai-peer-review.primary-config/v2","review":{"max_turns":3}}\n',
        owner: 'package-config',
      },
    ],
  });
  assert.match(checked.writes[0].after, /\n {4}"schema"/);
  assert.equal(existsSync(file), false);
  assert.equal(
    readFileSync(path.join(f.root, 'package.json'), 'utf8'),
    '{"name":"host","private":true}\n'
  );
});
test('a configured unavailable host lint check refuses the complete write set', async (t) => {
  const f = await setupHostFixture(t);
  f.write('.markdownlint.json', '{"MD001":true}\n');
  const { validateSetupWriteSet } = await import('../../src/config/setup-validation.mjs');
  await assert.rejects(
    validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [
        {
          file: path.join(f.root, 'skill.md'),
          before: null,
          after: '# Valid\n',
          owner: 'shared-skill',
        },
      ],
    }),
    /lint|check/i
  );
  assert.equal(f.exists('skill.md'), false);
});

test('host lint evaluates virtual content with destination-specific overrides and refuses before writes', async (t) => {
  const f = await setupHostFixture(t);
  f.installTool('markdownlint-cli2');
  f.write(
    '.markdownlint-cli2.jsonc',
    JSON.stringify({
      config: { MD013: false },
      overrides: [
        {
          filter: ['.ai-peer-review/**'],
          combine: 'merge',
          config: { MD013: { line_length: 12 } },
        },
      ],
    })
  );
  const { validateSetupWriteSet } = await import('../../src/config/setup-validation.mjs');
  const file = path.join(f.root, '.ai-peer-review/skills/peer-review/SKILL.md');
  await assert.rejects(
    validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [
        { file, before: null, after: '# A deliberately long heading\n', owner: 'shared-skill' },
      ],
    }),
    (error) =>
      error.code === 'APR_SETUP_INVALID' &&
      error.details.file === file &&
      error.details.diagnostics?.some((d) => d.rule === 'MD013')
  );
  assert.equal(existsSync(file), false);
});
test('host lint baseline distinguishes retained failures from introduced ones', async (t) => {
  const f = await setupHostFixture(t);
  f.installTool('markdownlint-cli2');
  f.write('.markdownlint.json', '{"MD013":false}\n');
  const { validateSetupWriteSet } = await import('../../src/config/setup-validation.mjs');
  const file = path.join(f.root, 'existing.md');
  const before = '# Title\n\n# Existing duplicate\n';
  f.write('existing.md', before);
  const checked = await validateSetupWriteSet({
    destinationRoot: f.root,
    writes: [
      {
        file,
        before,
        after: before + '\nNew paragraph.\n',
        owner: 'mixed-document',
        preserveForeign: true,
      },
    ],
  });
  assert.ok(checked.writes[0].after.includes('New paragraph.'));
  await assert.rejects(
    validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [
        {
          file,
          before,
          after: before + '\n# New duplicate\n',
          owner: 'mixed-document',
          preserveForeign: true,
        },
      ],
    }),
    /lint/i
  );
  assert.equal(readFileSync(file, 'utf8'), before);
});
test('symlinked destination ancestors refuse without changing their target', async (t) => {
  const f = await setupHostFixture(t);
  const { symlinkSync, mkdirSync } = await import('node:fs');
  const outside = path.join(f.parent, 'foreign');
  mkdirSync(outside);
  symlinkSync(outside, path.join(f.root, 'pointer'), 'dir');
  const { validateSetupWriteSet } = await import('../../src/config/setup-validation.mjs');
  await assert.rejects(
    validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [
        {
          file: path.join(f.root, 'pointer', 'config.json'),
          before: null,
          after: '{}\n',
          owner: 'package-config',
        },
      ],
    }),
    /link/i
  );
  assert.equal(existsSync(path.join(outside, 'config.json')), false);
});

test('validated apply checks every before image before changing any file', async (t) => {
  const f = await setupHostFixture(t);
  const api = await import('../../src/config/setup-validation.mjs');
  const first = f.write('first.json', '{}\n'),
    second = f.write('second.json', '{}\n');
  const checked = await api.validateSetupWriteSet({
    destinationRoot: f.root,
    writes: [
      { file: first, before: '{}\n', after: '{"a":1}\n', owner: 'package-config' },
      { file: second, before: '{}\n', after: '{"b":1}\n', owner: 'package-config' },
    ],
  });
  f.write('second.json', '{"foreign":true}\n');
  await assert.rejects(
    Promise.resolve().then(() => api.applyAtomicValidatedWrites(checked)),
    (error) => error.code === 'APR_SETUP_CONFLICT'
  );
  assert.equal(readFileSync(first, 'utf8'), '{}\n');
  assert.equal(readFileSync(second, 'utf8'), '{"foreign":true}\n');
});
test('validated apply refuses caller-fabricated write sets', async (t) => {
  const f = await setupHostFixture(t);
  const api = await import('../../src/config/setup-validation.mjs');
  await assert.rejects(
    Promise.resolve().then(() =>
      api.applyAtomicValidatedWrites({ destinationRoot: f.root, writes: [] })
    ),
    (error) => error.code === 'APR_SETUP_INVALID'
  );
});
test('validated apply writes approved bytes and leaves unchanged destinations alone', async (t) => {
  const f = await setupHostFixture(t);
  const api = await import('../../src/config/setup-validation.mjs');
  const file = path.join(f.root, 'generated.json');
  const checked = await api.validateSetupWriteSet({
    destinationRoot: f.root,
    writes: [{ file, before: null, after: '{"a":1}\n', owner: 'package-config' }],
  });
  await api.applyAtomicValidatedWrites(checked);
  assert.equal(readFileSync(file, 'utf8'), checked.writes[0].after);
});

test('duplicate destinations refuse validation rather than replacing the same file twice', async (t) => {
  const f = await setupHostFixture(t);
  const api = await import('../../src/config/setup-validation.mjs');
  const file = path.join(f.root, 'duplicate.json');
  await assert.rejects(
    api.validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [
        { file, before: null, after: '{}\n', owner: 'package-config' },
        { file, before: null, after: '{"other":true}\n', owner: 'package-config' },
      ],
    }),
    (error) => error.code === 'APR_SETUP_INVALID'
  );
});
test('ordinary destination names beginning with two dots are contained', async (t) => {
  const f = await setupHostFixture(t);
  const api = await import('../../src/config/setup-validation.mjs');
  const checked = await api.validateSetupWriteSet({
    destinationRoot: f.root,
    writes: [
      {
        file: path.join(f.root, '..metadata.json'),
        before: null,
        after: '{}\n',
        owner: 'package-config',
      },
    ],
  });
  assert.equal(checked.writes.length, 1);
});
test('explicit machine migration checks both roots before the first write', async (t) => {
  const f = await setupHostFixture(t);
  const api = await import('../../src/config/setup-validation.mjs');
  const local = f.write('policy.json', '{}\n');
  const account = path.join(f.home, 'preference.json');
  const primary = await api.validateSetupWriteSet({
    destinationRoot: f.root,
    writes: [{ file: local, before: '{}\n', after: '{"new":true}\n', owner: 'package-config' }],
  });
  const user = await api.validateSetupWriteSet({
    destinationRoot: f.home,
    writes: [{ file: account, before: null, after: '{}\n', owner: 'user-config' }],
  });
  f.write('policy.json', '{"foreign":true}\n');
  await assert.rejects(
    Promise.resolve().then(() => api.applyAtomicValidatedWrites([user, primary])),
    (error) => error.code === 'APR_SETUP_CONFLICT'
  );
  assert.equal(existsSync(account), false);
});

test('configured spelling checks use the destination document before setup writes', async (t) => {
  const f = await setupHostFixture(t);
  f.installTool('cspell-lib');
  f.write('cspell.json', '{"version":"0.2","language":"en"}\n');
  const api = await import('../../src/config/setup-validation.mjs');
  const file = path.join(f.root, 'skill.md');
  await assert.rejects(
    api.validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [
        {
          file,
          before: null,
          after: '# Instructions\n\nFlibbertywordzz.\n',
          owner: 'shared-skill',
        },
      ],
    }),
    (error) =>
      error.code === 'APR_SETUP_INVALID' &&
      error.details.diagnostics?.some((d) => d.rule === 'cspell')
  );
  assert.equal(existsSync(file), false);
});
test('an unavailable configured ESLint checker cannot silently pass', async (t) => {
  const f = await setupHostFixture(t);
  f.write('eslint.config.mjs', "export default [{files:['**/*.json'],rules:{}}];\n");
  const api = await import('../../src/config/setup-validation.mjs');
  const file = path.join(f.root, 'config.json');
  await assert.rejects(
    api.validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [{ file, before: null, after: '{}\n', owner: 'package-config' }],
    }),
    /check|lint/i
  );
});
test('unrecognized host lint scripts refuse targeted validation without running a repository command', async (t) => {
  const f = await setupHostFixture(t);
  f.write('package.json', '{"name":"host","scripts":{"lint":"custom-host-validator ."}}\n');
  const api = await import('../../src/config/setup-validation.mjs');
  await assert.rejects(
    api.validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [
        {
          file: path.join(f.root, 'config.json'),
          before: null,
          after: '{}\n',
          owner: 'package-config',
        },
      ],
    }),
    /unrecognized|reliable|unknown/i
  );
});

test('a host formatter change after validation refuses application', async (t) => {
  const f = await setupHostFixture(t);
  f.write('.prettierrc.json', '{"tabWidth":2}\n');
  const api = await import('../../src/config/setup-validation.mjs');
  const file = path.join(f.root, 'config.json');
  const checked = await api.validateSetupWriteSet({
    destinationRoot: f.root,
    writes: [{ file, before: null, after: '{"a":1}\n', owner: 'package-config' }],
  });
  f.write('.prettierrc.json', '{"tabWidth":4}\n');
  await assert.rejects(
    api.applyAtomicValidatedWrites(checked),
    (error) => error.code === 'APR_SETUP_CONFLICT'
  );
  assert.equal(existsSync(file), false);
});

test('destination configuration traversal is bounded before running tools', async (t) => {
  const f = await setupHostFixture(t);
  const { validateSetupWriteSet } = await import('../../src/config/setup-validation.mjs');
  const file = path.join(f.root, ...Array(140).fill('n'), 'config.json');
  await assert.rejects(
    validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [{ file, before: null, after: '{}\n' }],
    }),
    (error) => error.code === 'APR_SETUP_INVALID' && /bound/i.test(error.message)
  );
});

test('actual destination ESLint rules reject generated bytes and honor their ignore path', async (t) => {
  const f = await setupHostFixture(t);
  f.installTool('eslint');
  f.write(
    'eslint.config.mjs',
    "export default [{ files: ['**/*.js'], ignores: ['ignored.js'], rules: { 'no-restricted-syntax': ['error', 'DebuggerStatement'] } }];\n"
  );
  const { validateSetupWriteSet } = await import('../../src/config/setup-validation.mjs');
  await assert.rejects(
    validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [{ file: path.join(f.root, 'generated.js'), before: null, after: 'debugger;\n' }],
    }),
    (error) =>
      error.code === 'APR_SETUP_INVALID' &&
      error.details.diagnostics.some((entry) => entry.rule === 'no-restricted-syntax')
  );
  const checked = await validateSetupWriteSet({
    destinationRoot: f.root,
    writes: [{ file: path.join(f.root, 'ignored.js'), before: null, after: 'debugger;\n' }],
  });
  assert.equal(checked.writes[0].after, 'debugger;\n');
});

// The nearest host config must govern the actual generated destination.
test('a closer destination ESLint config overrides a permissive parent', async (t) => {
  const f = await setupHostFixture(t);
  f.installTool('eslint');
  f.write('eslint.config.mjs', "export default [{ files: ['**/*.js'], rules: {} }];\n");
  f.write(
    'generated/eslint.config.mjs',
    "export default [{ files: ['**/*.js'], rules: { 'no-restricted-syntax': ['error', 'DebuggerStatement'] } }];\n"
  );
  const { validateSetupWriteSet } = await import('../../src/config/setup-validation.mjs');
  await assert.rejects(
    validateSetupWriteSet({
      destinationRoot: f.root,
      writes: [
        { file: path.join(f.root, 'generated/content.js'), before: null, after: 'debugger;\n' },
      ],
    }),
    (error) =>
      error.code === 'APR_SETUP_INVALID' &&
      error.details.diagnostics?.some((entry) => entry.rule === 'no-restricted-syntax')
  );
  assert.equal(f.exists('generated/content.js'), false);
});
