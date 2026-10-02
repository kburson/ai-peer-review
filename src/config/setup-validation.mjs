// @story #134
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  realpathSync,
  lstatSync,
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  rmSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { AprError } from '../errors.mjs';

const markdownModule = createRequire(import.meta.url).resolve('markdownlint-cli2');
const worker = fileURLToPath(new URL('./setup-lint-worker.mjs', import.meta.url));
const referenceFormat = JSON.parse(
  readFileSync(new URL('../../templates/integration/format-v1.json', import.meta.url), 'utf8')
);
const referenceMarkdown = JSON.parse(
  readFileSync(new URL('../../templates/integration/markdownlint-v1.json', import.meta.url), 'utf8')
);
const validated = new WeakSet();
const validationInputs = new WeakMap();
const configNames = [
  'package.json',
  '.editorconfig',
  '.prettierignore',
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  'eslint.config.mjs',
  'eslint.config.js',
  'eslint.config.cjs',
  'eslint.config.ts',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yml',
  '.eslintrc.yaml',
  '.markdownlint-cli2.jsonc',
  '.markdownlint-cli2.yaml',
  '.markdownlint-cli2.cjs',
  '.markdownlint-cli2.mjs',
  '.markdownlint.json',
  '.markdownlint.jsonc',
  '.markdownlint.yaml',
  '.markdownlint.yml',
  '.markdownlint.cjs',
  '.markdownlint.mjs',
  'cspell.json',
  'cspell.config.json',
  'cspell.config.yaml',
  'cspell.config.yml',
  'cspell.config.js',
  'cspell.config.cjs',
  'cspell.config.mjs',
  '.cspell.json',
  '.cspell.yml',
  '.cspell.yaml',
];
function configSnapshot(writes, root) {
  const paths = new Set([root]);
  for (const entry of writes) {
    if (!entry || typeof entry.file !== 'string') invalid('Setup destination is invalid.');
    const relative = path.relative(root, entry.file);
    if (
      !relative ||
      relative === '..' ||
      relative.startsWith('..' + path.sep) ||
      path.isAbsolute(relative) ||
      path.resolve(entry.file) !== entry.file
    )
      invalid('Setup destination is outside its authority root.');
    let directory = path.dirname(entry.file),
      depth = 0;
    while (true) {
      if (++depth > 128 || paths.size > 1024)
        invalid('Host configuration traversal exceeds its bound.');
      paths.add(directory);
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
  const observed = [];
  let total = 0;
  for (const directory of [...paths].sort())
    for (const name of configNames) {
      const file = path.join(directory, name);
      try {
        const stat = lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
          invalid('Host check configuration is not a bounded ordinary file.', { file });
        if ((total += stat.size) > 16 * 1024 * 1024 || observed.length >= 512)
          invalid('Host configuration inventory exceeds its bound.');
        observed.push([file, stat.dev, stat.ino, stat.mode, readFileSync(file).toString('base64')]);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  const stat = lstatSync(root);
  return JSON.stringify({ root: [stat.dev, stat.ino, stat.mode], configs: observed });
}
export function isValidatedWriteSet(value) {
  return validated.has(value);
}
function invalid(message, details = {}) {
  throw new AprError('APR_SETUP_INVALID', message, {
    recovery: 'Repair the destination formatting or lint conflict, then retry setup --dry-run.',
    details,
  });
}
function configRoot(file, names) {
  let directory = path.dirname(file);
  while (true) {
    if (names.some((name) => existsSync(path.join(directory, name)))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return null;
}
function markdownConfigRoot(file) {
  return configRoot(file, [
    '.markdownlint-cli2.jsonc',
    '.markdownlint-cli2.yaml',
    '.markdownlint-cli2.cjs',
    '.markdownlint-cli2.mjs',
    '.markdownlint.json',
    '.markdownlint.jsonc',
    '.markdownlint.yaml',
    '.markdownlint.yml',
    '.markdownlint.cjs',
    '.markdownlint.mjs',
  ]);
}
function assertKnownHostChecks(root) {
  const file = path.join(root, 'package.json');
  if (!existsSync(file)) return;
  if (lstatSync(file).size > 1024 * 1024)
    invalid('Host check configuration exceeds its bound.', { file });
  let value;
  try {
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    invalid('Host check configuration is unreadable.', { file });
  }
  for (const [name, command] of Object.entries(value.scripts ?? {}))
    if (/^(?:lint|format|spell)(?::|$)/.test(name)) {
      if (
        typeof command !== 'string' ||
        command
          .split(/&&/)
          .some(
            (part) =>
              !/^\s*(?:eslint|markdownlint-cli2|cspell|prettier)(?:\s+(?:--check|--no-progress|--no-must-find-files|["'][^"']+["']|[.\w*/{}?,:-]+))*\s*$/.test(
                part
              )
          )
      )
        invalid(
          'An unrecognized configured host check cannot run reliably for only proposed destinations.',
          { file, command }
        );
    }
}
function hostLint(kind, moduleName, hostRoot, root, entry, after) {
  const input = { kind, moduleName, resolutionRoot: root, root: hostRoot, file: entry.file };
  const result = markdown({ ...input, bytes: after });
  const baseline =
    entry.before === null ? { diagnostics: [] } : markdown({ ...input, bytes: entry.before });
  const added = introduced(result.diagnostics, baseline.diagnostics);
  if (added.length || result.exit > 1)
    invalid('Destination lint introduced new failures.', {
      file: entry.file,
      command: kind,
      diagnostics: added,
    });
}
function markdown(input) {
  try {
    return JSON.parse(
      execFileSync(process.execPath, ['--experimental-import-meta-resolve', worker], {
        input: JSON.stringify(input),
        encoding: 'utf8',
        timeout: 15000,
        maxBuffer: 2 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    );
  } catch (error) {
    invalid('Destination lint check failed or could not run reliably.', {
      file: input.file,
      command: 'markdownlint-cli2 (virtual destination)',
      reason: String(error.stderr ?? error.message).slice(0, 2048),
    });
  }
}
function introduced(after, before) {
  const signature = (e) => JSON.stringify([e.rule, e.detail, e.context, e.severity]);
  const counts = new Map();
  for (const e of before) {
    const key = signature(e);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return after.filter((e) => {
    const key = signature(e),
      count = counts.get(key) || 0;
    if (count) {
      counts.set(key, count - 1);
      return false;
    }
    return true;
  });
}
export async function validateSetupWriteSet({ writes, destinationRoot }) {
  const root = realpathSync(destinationRoot);
  assertKnownHostChecks(root);
  if (!Array.isArray(writes) || writes.length > 128) invalid('Setup write set is invalid.');
  const inputs = configSnapshot(writes, root);
  const checked = [],
    destinations = new Set();
  for (const entry of writes) {
    if (!entry || typeof entry.file !== 'string' || destinations.has(entry.file))
      invalid('Setup destinations must be unique canonical paths.');
    destinations.add(entry.file);
    if (entry.before !== null && typeof entry.before !== 'string')
      invalid('Setup before image is invalid.', { file: entry.file });
    if (
      (typeof entry.after === 'string' && Buffer.byteLength(entry.after) > 1024 * 1024) ||
      (typeof entry.before === 'string' && Buffer.byteLength(entry.before) > 1024 * 1024)
    )
      invalid('Setup input exceeds the byte bound.', { file: entry.file });
    const relative = path.relative(root, entry.file);
    if (
      !relative ||
      relative === '..' ||
      relative.startsWith('..' + path.sep) ||
      path.isAbsolute(relative) ||
      path.resolve(entry.file) !== entry.file
    )
      invalid('Setup destination is outside its authority root.', { file: entry.file });
    let current = root;
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment);
      try {
        if (lstatSync(current).isSymbolicLink())
          invalid('Setup destination contains a symbolic link.', { file: entry.file });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    if (entry.after !== null && typeof entry.after !== 'string')
      invalid('Proposed setup bytes are invalid.', { file: entry.file });
    let after = entry.after;
    if (after !== null && /\.(?:json|md)$/.test(entry.file)) {
      try {
        const ignores = [];
        let directory = path.dirname(entry.file);
        while (true) {
          const file = path.join(directory, '.prettierignore');
          if (existsSync(file)) ignores.push(file);
          const parent = path.dirname(directory);
          if (parent === directory) break;
          directory = parent;
        }
        const ignored = (
          await prettier.getFileInfo(entry.file, { ignorePath: ignores, resolveConfig: false })
        ).ignored;
        const config = ignored
          ? null
          : await prettier.resolveConfig(entry.file, { editorconfig: true, useCache: false });
        const input =
          entry.file.endsWith('.json') && !entry.preserveForeign
            ? JSON.stringify(JSON.parse(after), null, 2) + '\n'
            : after;
        const formatted = await prettier.format(input, {
          ...referenceFormat,
          ...config,
          filepath: entry.file,
        });
        if (entry.preserveForeign) {
          if (config && formatted !== after)
            invalid('Destination formatting conflicts with preserved foreign bytes.', {
              file: entry.file,
            });
        } else after = formatted;
      } catch (error) {
        invalid('Destination formatting failed.', { file: entry.file, reason: error.message });
      }
    }
    if (after !== null && Buffer.byteLength(after) > 1024 * 1024)
      invalid('Setup output exceeds the byte bound.', { file: entry.file });
    if (after !== null && entry.file.endsWith('.md')) {
      if (!entry.preserveForeign) {
        const reference = markdown({
          module: markdownModule,
          root,
          file: entry.file,
          bytes: after,
          reference: referenceMarkdown,
        });
        if (reference.exit !== 0)
          invalid('Package reference lint rejected generated Markdown.', {
            file: entry.file,
            diagnostics: reference.diagnostics,
          });
      }
      const hostRoot = markdownConfigRoot(entry.file);
      if (hostRoot) {
        let module;
        try {
          module = createRequire(path.join(root, 'package.json')).resolve('markdownlint-cli2');
        } catch {
          invalid('A configured host lint check is unavailable.', {
            file: entry.file,
            command: 'markdownlint-cli2',
          });
        }
        const result = markdown({ module, root: hostRoot, file: entry.file, bytes: after });
        const baseline =
          entry.before === null
            ? { diagnostics: [] }
            : markdown({ module, root: hostRoot, file: entry.file, bytes: entry.before });
        const added = introduced(result.diagnostics, baseline.diagnostics);
        if (added.length || result.exit > 1)
          invalid('Destination lint introduced new failures.', {
            file: entry.file,
            diagnostics: added,
          });
      }
    }
    if (after !== null) {
      const eslintRoot = configRoot(entry.file, [
        'eslint.config.mjs',
        'eslint.config.js',
        'eslint.config.cjs',
        'eslint.config.ts',
        '.eslintrc.json',
        '.eslintrc.js',
        '.eslintrc.cjs',
        '.eslintrc.yml',
        '.eslintrc.yaml',
      ]);
      if (eslintRoot) hostLint('eslint', 'eslint', eslintRoot, root, entry, after);
      const spellingRoot = configRoot(entry.file, [
        'cspell.json',
        'cspell.config.json',
        'cspell.config.yaml',
        'cspell.config.yml',
        'cspell.config.js',
        'cspell.config.cjs',
        'cspell.config.mjs',
        '.cspell.json',
        '.cspell.yml',
        '.cspell.yaml',
      ]);
      if (spellingRoot) hostLint('cspell', 'cspell-lib', spellingRoot, root, entry, after);
    }
    if (after !== null && !after.endsWith('\n'))
      invalid('Setup output requires a final newline.', { file: entry.file });
    checked.push(Object.freeze({ ...entry, after }));
  }
  const result = Object.freeze({ writes: Object.freeze(checked), destinationRoot: root });
  if (configSnapshot(writes, root) !== inputs)
    invalid('Host check configuration changed during validation.');
  validationInputs.set(result, inputs);
  validated.add(result);
  return result;
}

function currentBytes(file) {
  try {
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink())
      invalid('Setup destination must be an ordinary file.', { file });
    return readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
function verifyDestinations(checked) {
  if (configSnapshot(checked.writes, checked.destinationRoot) !== validationInputs.get(checked))
    throw new AprError('APR_SETUP_CONFLICT', 'Host check configuration changed after validation.', {
      recovery: 'Repeat setup --dry-run under the current host checks.',
    });
  if (realpathSync(checked.destinationRoot) !== checked.destinationRoot)
    invalid('Setup root changed after validation.');
  for (const entry of checked.writes) {
    let current = checked.destinationRoot;
    for (const segment of path.relative(current, entry.file).split(path.sep)) {
      current = path.join(current, segment);
      try {
        const stat = lstatSync(current);
        if (stat.isSymbolicLink() || (current !== entry.file && !stat.isDirectory()))
          invalid('Setup path changed after validation.', { file: entry.file });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    if (currentBytes(entry.file) !== entry.before)
      throw new AprError('APR_SETUP_CONFLICT', 'Setup destination changed after planning.', {
        recovery: 'Inspect the changed destination and repeat setup --dry-run.',
        details: { file: entry.file },
      });
  }
}
export async function applyAtomicValidatedWrites(checked) {
  const sets = Array.isArray(checked) ? checked : [checked];
  if (!sets.length || sets.some((set) => !validated.has(set)))
    invalid('Setup requires the original validated write sets.');
  const writes = sets.flatMap((set) => set.writes);
  if (new Set(writes.map((entry) => entry.file)).size !== writes.length)
    invalid('Combined setup destinations must be unique.');
  for (const set of sets) verifyDestinations(set);
  const staged = [],
    applied = [];
  try {
    for (const entry of writes) {
      if (entry.after === entry.before) continue;
      const mode = entry.before === null ? 0o600 : lstatSync(entry.file).mode & 0o777;
      if (entry.after !== null) {
        mkdirSync(path.dirname(entry.file), { recursive: true });
        const temporary = entry.file + '.setup-' + randomUUID();
        writeFileSync(temporary, entry.after, { flag: 'wx', mode });
        staged.push({ entry, temporary, mode });
      } else staged.push({ entry, temporary: null, mode });
    }
    for (const set of sets) verifyDestinations(set);
    for (const item of staged) {
      if (item.temporary) renameSync(item.temporary, item.entry.file);
      else unlinkSync(item.entry.file);
      applied.push(item);
    }
  } catch (error) {
    const rollback = [];
    for (const item of applied.reverse())
      try {
        if (item.entry.before === null) unlinkSync(item.entry.file);
        else {
          const temporary = item.entry.file + '.rollback-' + randomUUID();
          writeFileSync(temporary, item.entry.before, { flag: 'wx', mode: item.mode });
          renameSync(temporary, item.entry.file);
        }
      } catch (cause) {
        rollback.push({ file: item.entry.file, reason: cause.message });
      }
    if (rollback.length)
      throw new AprError('APR_SETUP_CONFLICT', 'Setup I/O failed and rollback requires repair.', {
        recovery: 'Restore the reported destinations from the before images; do not activate.',
        details: { rollback, cause: error.message },
      });
    throw error;
  } finally {
    for (const item of staged) if (item.temporary) rmSync(item.temporary, { force: true });
  }
  return Object.freeze({ applied: applied.length });
}
