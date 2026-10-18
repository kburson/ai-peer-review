// @story #141
// Development-only attribution. It never imports or executes analyzed runtime source.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectPortableConsumerInventory } from './verify-portable-consumers.mjs';
const files = new Map();
let analysisRoot;
const platforms = ['linux', 'darwin', 'win32'];
function load(file) {
  if (files.has(file)) return files.get(file);
  if (
    typeof file !== 'string' ||
    !/^\b(?:src|bin)\//.test(file) ||
    path.posix.normalize(file) !== file ||
    file.includes('\\')
  )
    throw Error('source-path');
  const absolute = path.resolve(analysisRoot, file);
  const stat = fs.lstatSync(absolute);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > 2097152 ||
    fs.realpathSync(absolute) !== absolute
  )
    throw Error('source-file');
  const source = fs.readFileSync(absolute, 'utf8');
  let code;
  new Linter().verify(
    source,
    {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      plugins: {
        capture: {
          rules: {
            ast: {
              create(c) {
                code = c.sourceCode;
                return {};
              },
            },
          },
        },
      },
      rules: { 'capture/ast': 'error' },
    },
    { filename: file }
  );
  if (!code) throw Error('parse:' + file);
  const nodes = [];
  const parents = new WeakMap();
  function walk(n, p) {
    if (!n?.type) return;
    nodes.push(n);
    if (p) parents.set(n, p);
    for (const [k, v] of Object.entries(n)) {
      if (['parent', 'loc', 'range', 'tokens', 'comments'].includes(k)) continue;
      for (const x of Array.isArray(v) ? v : [v]) if (x?.type) walk(x, n);
    }
  }
  walk(code.ast);
  const vars = code.scopeManager.scopes.flatMap((s) => s.variables);
  const functionBindings = new Map();
  for (const v of vars)
    for (const d of v.defs) {
      if (d.type === 'FunctionName') functionBindings.set(d.node, v);
      if (
        d.node.type === 'VariableDeclarator' &&
        /FunctionExpression$/.test(d.node.init?.type ?? '')
      )
        functionBindings.set(d.node.init, v);
    }
  const dynamicLexical = nodes.some((n) => n.type === 'CallExpression' && n.callee.name === 'eval');
  const r = {
    file,
    source,
    nodes,
    parents,
    vars,
    functionBindings,
    dynamicLexical,
    hash: createHash('sha256').update(source).digest('hex'),
  };
  files.set(file, r);
  return r;
}
function enclosing(r, n) {
  let p = r.parents.get(n);
  while (p && !/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(p.type))
    p = r.parents.get(p);
  return p;
}
function value(r, n, platform, seen = new Set()) {
  if (!n) return undefined;
  if (n.type === 'Literal') return n.value;
  if (
    n.type === 'MemberExpression' &&
    !n.computed &&
    n.object.name === 'process' &&
    n.property.name === 'platform'
  ) {
    const scope = r.vars.find((v) => v.name === 'process' && v.defs.length);
    if (scope) return undefined;
    return platform;
  }
  if (n.type === 'Identifier') {
    const scope = r.nodes.length
      ? r.vars.filter((v) => v.name === n.name && v.references.some((ref) => ref.identifier === n))
      : [];
    if (scope.length !== 1) return undefined;
    const v = scope[0];
    if (seen.has(v) || v.defs.length !== 1) return undefined;
    const d = v.defs[0];
    if (
      d.node.type !== 'VariableDeclarator' ||
      d.node.id.type !== 'Identifier' ||
      d.parent?.kind !== 'const' ||
      v.references.some((ref) => ref.isWrite() && !ref.init)
    )
      return undefined;
    return value(r, d.node.init, platform, new Set([...seen, v]));
  }
  if (n.type === 'UnaryExpression' && n.operator === '!') {
    const a = value(r, n.argument, platform, seen);
    return a === undefined ? undefined : !a;
  }
  if (n.type === 'BinaryExpression') {
    const a = value(r, n.left, platform, seen),
      b = value(r, n.right, platform, seen);
    if (a === undefined || b === undefined) return undefined;
    if (n.operator === '===') return a === b;
    if (n.operator === '!==') return a !== b;
    if (n.operator === '==') return a == b;
    if (n.operator === '!=') return a != b;
  }
  if (n.type === 'LogicalExpression') {
    const a = value(r, n.left, platform, seen),
      b = value(r, n.right, platform, seen);
    // Logical expressions return operands, and an unknown left operand cannot
    // be replaced by a known right operand without losing its possible value.
    if (a !== undefined && n.operator === '&&') return a ? b : a;
    if (a !== undefined && n.operator === '||') return a ? a : b;
  }
  return undefined;
}
function lexical(r, node, platform) {
  let child = node,
    p = r.parents.get(node);
  while (p) {
    if (
      (p.type === 'IfStatement' || p.type === 'ConditionalExpression') &&
      (child === p.consequent || child === p.alternate)
    ) {
      const v = value(r, p.test, platform);
      if (v !== undefined && Boolean(v) !== (child === p.consequent)) return false;
    }
    if (p.type === 'LogicalExpression' && child === p.right) {
      const v = value(r, p.left, platform);
      if (v !== undefined && ((p.operator === '&&' && !v) || (p.operator === '||' && v)))
        return false;
    }
    child = p;
    p = r.parents.get(p);
  }
  return true;
}
function possible(r, node, platform, seen = new Set()) {
  if (!lexical(r, node, platform)) return false;
  const fn = enclosing(r, node);
  if (!fn) return true;
  if (seen.has(fn)) return true;
  if (r.dynamicLexical) return true;
  const v = r.functionBindings.get(fn);
  if (!v) return possible(r, fn, platform, new Set([...seen, fn]));
  for (let current = fn; current && current.type !== 'Program'; current = r.parents.get(current))
    if (current.type.startsWith('Export')) return true;
  if (!v.references.length) return true;
  return v.references.some((ref) => {
    const p = r.parents.get(ref.identifier);
    if (p?.type !== 'CallExpression' || p.callee !== ref.identifier) return true;
    return possible(r, p, platform, new Set([...seen, fn]));
  });
}

export function attributeFindings({ root, blockers } = {}) {
  analysisRoot = fs.realpathSync(root);
  files.clear();
  if (!Array.isArray(blockers)) throw Error('finding-array');
  return blockers.map((b, index) => {
    if (!b.path || !b.line)
      return { index, ...b, possiblePlatforms: platforms, attribution: 'shared-or-unresolved' };
    const r = load(b.path);
    const node = r.nodes.find(
      (n) =>
        n.loc?.start.line === b.line &&
        n.loc.start.column === b.column &&
        ['CallExpression', 'NewExpression'].includes(n.type) &&
        (!b.name ||
          (n.callee.name ??
            (n.callee.computed ? n.callee.property?.value : n.callee.property?.name)) === b.name)
    );
    if (!node) throw Error('finding-location:' + JSON.stringify(b));
    const possiblePlatforms = platforms.filter((p) => possible(r, node, p));
    return {
      index,
      ...b,
      possiblePlatforms,
      attribution:
        possiblePlatforms.length === 1 && possiblePlatforms[0] === 'win32'
          ? 'proven-windows-only'
          : 'shared-or-unresolved',
      sourceSha256: r.hash,
      sourceSpan: [node.start, node.end],
      expression: r.source.slice(node.start, node.end).slice(0, 300),
    };
  });
}
function collect(root) {
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }).trim();
  const head = git('rev-parse', 'HEAD');
  if (git('status', '--porcelain', '--untracked-files=all', '--', 'src', 'bin'))
    throw Error('runtime-source-dirty');
  const sourceFiles = git('ls-files', '-z', '--', 'src', 'bin').split('\0').filter(Boolean).sort();
  const fingerprint = () =>
    createHash('sha256')
      .update(
        JSON.stringify(
          sourceFiles.map((file) => [
            file,
            createHash('sha256')
              .update(fs.readFileSync(path.join(root, file)))
              .digest('hex'),
          ])
        )
      )
      .digest('hex');
  const before = fingerprint();
  const inventory = JSON.parse(
    fs.readFileSync(path.join(root, 'evidence/portable-runtime/consumer-inventory.json'))
  );
  const report = inspectPortableConsumerInventory({ root, inventory });
  const rows = attributeFindings({ root, blockers: report.blockers });
  if (
    git('rev-parse', 'HEAD') !== head ||
    fingerprint() !== before ||
    git('status', '--porcelain', '--untracked-files=all', '--', 'src', 'bin')
  )
    throw Error('analysis-source-changed');
  const raw = {
    schema: report.schema,
    verified: report.verified,
    coverageComplete: report.coverageComplete,
    passed: report.passed,
    moduleCount: report.modules.length,
    edgeCount: report.edges.length,
    blockers: report.blockers,
  };
  const historicalPath = 'evidence/local-handoff/191/failed-broad-graph.json';
  const historicalSha256 = createHash('sha256')
    .update(fs.readFileSync(path.join(root, historicalPath)))
    .digest('hex');
  if (historicalSha256 !== 'af68d1380c0dfbcae54ca431bfb881aa94e752250e9b9473d9353b2acc3ceafe')
    throw Error('historical-report-changed');
  const grouped = {};
  for (const row of rows) {
    const key = row.attribution + ':' + row.code;
    grouped[key] = (grouped[key] ?? 0) + 1;
  }
  return {
    schema: 'ai-peer-review.posix-runtime-attribution/v1',
    sourceHead: head,
    sourceFingerprint: before,
    supportedRuntimeTargets: ['linux', 'darwin'],
    analysisOnly: true,
    broaderAcceptance: 'not-established',
    runtimeDefectCount: null,
    historicalReport: {
      path: historicalPath,
      sha256: historicalSha256,
      result: 'failed; unchanged',
    },
    rawGraph: {
      verified: report.verified,
      coverageComplete: report.coverageComplete,
      passed: report.passed,
      moduleCount: report.modules.length,
      edgeCount: report.edges.length,
      findingCount: rows.length,
      sha256: createHash('sha256')
        .update(JSON.stringify(raw, null, 2) + '\n')
        .digest('hex'),
    },
    method:
      'Conservative process.platform guards and private direct callers; exported, escaped, parameter-dependent and uncertain paths remain shared. No filename exclusions. Unresolved origins are not confirmed runtime defects.',
    grouped,
    rows,
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const full = process.argv.length === 3 && process.argv[2] === '--full';
    if (process.argv.length !== 2 && !full) throw Error('usage:analyze-posix-runtime[--full]');
    const report = collect(fs.realpathSync(fileURLToPath(new URL('../', import.meta.url))));
    console.log(
      JSON.stringify(full ? report : (({ rows: _rows, ...summary }) => summary)(report), null, 2)
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
