// cspell:words unawaited ioreg
// @story #186
// Development-only bounded analysis. It never imports or executes analyzed source.
// cspell:words beforeDelivery releaseUnused execFile fileURLToPath
import { readFileSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';

const SCHEMA = 'ai-peer-review.portable-consumer-inventory/v1';
const MAX_FILES = 512,
  MAX_BYTES = 2097152;
const NATIVE = new Set(['platformSecurity', 'inspectPlatformSecurity', 'loadBinding', 'peerUser']);
const HANDLES = new Set([
  'canonicalPath',
  'userId',
  'openPrivateDirectory',
  'verifyDirectory',
  'directoryRead',
  'directoryCreate',
  'directoryRemove',
  'closeDirectory',
  'acquireExclusive',
  'verifyExclusive',
  'releaseExclusive',
  'abandonExclusive',
  'listenPrivate',
  'reclaimStaleEndpoint',
  'verifyEndpoint',
  'closeEndpoint',
  'acceptPrivate',
  'connectPrivate',
  'connectionRead',
  'connectionWrite',
  'closeConnection',
  'peerUser',
]);
const LEASE = new Set([
  'beforeDelivery',
  'releaseUnused',
  'release',
  'abandon',
  'acquireProviderResource',
]);
const LAUNCH = new Set([
  'execFile',
  'execFileSync',
  'spawn',
  'spawnSync',
  'fork',
  'Worker',
  'buildBrokerSecurity',
]);
const STOCK = new Set(['initializePortableSystem', 'initializePortableOperations']);
const linter = new Linter();
const union = (...values) => new Set(values.flatMap((v) => [...(v ?? [])]));
const literal = (n) => (n?.type === 'Literal' && typeof n.value === 'string' ? n.value : null);
const memberName = (n) => (n?.computed ? literal(n.property) : n?.property?.name);
function walk(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (['parent', 'loc', 'range', 'tokens', 'comments'].includes(key)) continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit, node);
    else if (value && typeof value === 'object' && value.type) walk(value, visit, node);
  }
}
function parse(source, file) {
  let ast;
  const messages = linter.verify(
    source,
    {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      plugins: {
        capture: {
          rules: {
            ast: {
              create: (context) => ({
                Program: () => {
                  ast = context.sourceCode.ast;
                },
              }),
            },
          },
        },
      },
      rules: { 'capture/ast': 'error' },
    },
    { filename: file }
  );
  if (!ast || messages.some((m) => m.fatal)) throw new Error('source-parse-unavailable: ' + file);
  return ast;
}
function ordinary(root, file) {
  const absolute = path.resolve(root, file);
  if (absolute !== root && !absolute.startsWith(root + path.sep))
    throw new Error('source-root-escape: ' + file);
  const stat = lstatSync(absolute);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > MAX_BYTES ||
    realpathSync(absolute) !== absolute
  )
    throw new Error('source-file-invalid: ' + file);
  return readFileSync(absolute, 'utf8');
}
function resolveTarget(file, value) {
  if (value.startsWith('node:')) return { kind: 'builtin', target: value };
  if (!value.startsWith('.')) return { kind: 'external', target: value };
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), value));
  if (target.startsWith('../') || target.startsWith('/')) throw new Error('source-root-escape');
  return { kind: 'module', target };
}
function sourceFiles(root) {
  const files = [];
  function visit(relative) {
    let rows;
    try {
      rows = readdirSync(path.join(root, relative), { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const row of rows.sort((a, b) => a.name.localeCompare(b.name))) {
      const file = relative + '/' + row.name;
      if (row.isSymbolicLink()) throw new Error('source-directory-alias: ' + file);
      if (row.isDirectory()) visit(file);
      else if (/\.(?:mjs|js)$/u.test(file)) files.push(file);
      if (files.length > MAX_FILES) throw new Error('source-inventory-budget');
    }
  }
  visit('src');
  visit('bin');
  return files.sort();
}
const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);
const SCOPE_TYPES = new Set([
  'Program',
  'BlockStatement',
  'CatchClause',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  ...FUNCTION_TYPES,
]);
function patternNames(pattern) {
  if (!pattern) return [];
  if (pattern.type === 'Identifier') return [pattern.name];
  if (pattern.type === 'AssignmentPattern') return patternNames(pattern.left);
  if (pattern.type === 'RestElement') return patternNames(pattern.argument);
  if (pattern.type === 'ArrayPattern') return pattern.elements.flatMap(patternNames);
  if (pattern.type === 'ObjectPattern')
    return pattern.properties.flatMap((p) => patternNames(p.value ?? p.argument));
  return [];
}
function scopeFor(module, node) {
  let current = node;
  while (current && !SCOPE_TYPES.has(current.type)) current = module.parents.get(current);
  current ??= module.ast;
  let scope = module.scopes.get(current);
  if (!scope) {
    scope = {
      node: current,
      bindings: current === module.ast ? module.bindings : new Map(),
      names: new Set(),
      parent: null,
    };
    module.scopes.set(current, scope);
    if (current !== module.ast) scope.parent = scopeFor(module, module.parents.get(current));
  }
  return scope;
}
function bindingScope(module, node, name) {
  let scope = scopeFor(module, node);
  while (scope && !scope.names.has(name) && !scope.bindings.has(name)) scope = scope.parent;
  return scope;
}
function prepareScopes(module) {
  module.scopes = new WeakMap();
  module.parameters = new Map();
  module.functionKeys = new WeakMap();
  module.functions.clear();
  const global = scopeFor(module, module.ast);
  for (const key of module.bindings.keys()) global.names.add(key);
  for (const node of module.nodes) {
    if (node.type === 'VariableDeclarator' || node.type === 'CatchClause') {
      const pattern = node.id ?? node.param;
      const scope = scopeFor(module, pattern);
      for (const name of patternNames(pattern)) scope.names.add(name);
    }
    if (!FUNCTION_TYPES.has(node.type)) continue;
    const key = String(node.start),
      scope = scopeFor(module, node);
    module.functions.set(key, node);
    module.functionKeys.set(node, key);
    for (const parameter of node.params)
      for (const name of patternNames(parameter)) {
        const tag = 'parameter:' + module.path + ':' + key + ':' + name;
        scope.names.add(name);
        scope.bindings.set(name, new Set([tag]));
        module.parameters.set(tag, new Set());
      }
    const value = new Set([
      NATIVE.has(node.id?.name) ? 'native-factory' : 'function:' + module.path + ':' + key,
    ]);
    const parent = module.parents.get(node);
    if (node.id) {
      scope.names.add(node.id.name);
      scope.bindings.set(node.id.name, value);
      if (node.type === 'FunctionDeclaration') {
        const outer = scopeFor(module, parent);
        outer.names.add(node.id.name);
        outer.bindings.set(node.id.name, value);
      }
    }
    if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
      const outer = scopeFor(module, parent.id);
      outer.names.add(parent.id.name);
      outer.bindings.set(parent.id.name, value);
    }
    if (parent?.type === 'ExportDefaultDeclaration') {
      global.names.add('default');
      global.bindings.set('default', value);
    }
  }
  for (const node of module.nodes)
    if (node.type === 'ExportNamedDeclaration' && !node.source) {
      for (const specifier of node.specifiers) {
        const value = global.bindings.get(specifier.local.name);
        if (value) {
          global.names.add(specifier.exported.name);
          global.bindings.set(specifier.exported.name, value);
        }
      }
    }
}
function expand(values, modules, final = false, visited = new Set(), memo = new Map()) {
  const index = (modules.parameterIndex ??= new Map(
    [...modules.values()].flatMap((module) =>
      [...module.parameters.keys()].map((tag) => [tag, module])
    )
  ));
  const result = new Set();
  for (const value of values ?? []) {
    if (memo.has(value)) {
      for (const item of memo.get(value)) result.add(item);
      continue;
    }
    if (visited.has(value)) {
      if (final) result.add('unknown');
      continue;
    }
    const resolvedValues = new Set();
    if (value.startsWith('parameter:')) {
      const incoming = index.get(value)?.parameters.get(value);
      if (!incoming?.size) resolvedValues.add(final ? 'unknown' : value);
      else
        for (const item of expand(incoming, modules, final, new Set([...visited, value]), memo))
          resolvedValues.add(item);
    } else if (value.startsWith('function:')) {
      const key = value.slice(9),
        split = key.lastIndexOf(':');
      const target = modules.get(key.slice(0, split)),
        name = key.slice(split + 1);
      if (target?.functions.has(name)) resolvedValues.add(value);
      else {
        const resolved = target?.bindings.get(name);
        if (resolved?.size)
          for (const item of expand(resolved, modules, final, new Set([...visited, value]), memo))
            resolvedValues.add(item);
        else resolvedValues.add(final ? 'unknown' : value);
      }
    } else resolvedValues.add(value);
    memo.set(value, resolvedValues);
    for (const item of resolvedValues) result.add(item);
  }
  return result;
}

function graph(root, initial) {
  const modules = new Map(),
    edges = [],
    problems = [];
  const queue = [...initial];
  while (queue.length) {
    const file = queue.shift();
    if (modules.has(file)) continue;
    if (modules.size >= MAX_FILES) throw new Error('source-inventory-budget');
    let source, ast;
    try {
      source = ordinary(root, file);
      ast = parse(source, file);
    } catch (error) {
      problems.push({ code: 'source-inspection-unavailable', path: file, detail: error.message });
      continue;
    }
    const module = {
      path: file,
      ast,
      nodes: [],
      parents: new WeakMap(),
      bindings: new Map(),
      functions: new Map(),
      native: false,
    };
    modules.set(file, module);
    walk(ast, (node, parent) => {
      module.nodes.push(node);
      if (parent) module.parents.set(node, parent);
      if (NATIVE.has(node.id?.name) || NATIVE.has(node.key?.name)) module.native = true;
      if (node.type === 'FunctionDeclaration' && node.id) module.functions.set(node.id.name, node);
      if (
        node.type === 'VariableDeclarator' &&
        ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.init?.type)
      )
        module.functions.set(node.id.name, node.init);
      let target = null,
        kind = 'import';
      if (
        ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)
      )
        target = literal(node.source);
      if (node.type === 'ImportExpression') {
        target = literal(node.source);
        kind = 'dynamic-import';
        if (target === null)
          problems.push({
            code: 'unresolved-dynamic-import',
            path: file,
            line: node.loc.start.line,
          });
      }
      if (target !== null) {
        try {
          const resolved = resolveTarget(file, target);
          const edge = {
            path: file,
            line: node.loc.start.line,
            column: node.loc.start.column,
            kind,
            ...resolved,
          };
          edge.kind = kind;
          edge.targetKind = resolved.kind;
          edges.push(edge);
          if (resolved.kind === 'module' && /\.(?:mjs|js)$/u.test(resolved.target))
            queue.push(resolved.target);
          if (node.type === 'ImportDeclaration')
            for (const specifier of node.specifiers) {
              const name = specifier.imported?.name ?? specifier.imported?.value ?? 'default';
              const value = NATIVE.has(name)
                ? 'native-factory'
                : resolved.kind === 'builtin'
                  ? specifier.type === 'ImportNamespaceSpecifier' ||
                    specifier.type === 'ImportDefaultSpecifier'
                    ? 'builtin-module:' + resolved.target
                    : 'builtin:' + name
                  : STOCK.has(name) &&
                      /^src\/broker\/portable-(?:system|platform)\.mjs$/u.test(resolved.target)
                    ? 'stock-factory'
                    : 'function:' + resolved.target + ':' + name;
              module.bindings.set(specifier.local.name, new Set([value]));
            }
        } catch (error) {
          problems.push({
            code: 'source-inspection-unavailable',
            path: file,
            detail: error.message,
          });
        }
      }
    });
    prepareScopes(module);
  }
  return { modules, edges, problems };
}
function assign(module, pattern, values) {
  let changed = false;
  for (const name of patternNames(pattern)) {
    const scope = bindingScope(module, pattern, name) ?? scopeFor(module, pattern);
    const old = scope.bindings.get(name) ?? new Set();
    const parameter = [...old].find((v) => v.startsWith('parameter:'));
    const storage = parameter ? module.parameters : scope.bindings;
    const key = parameter ?? name;
    const previous = storage.get(key) ?? new Set(),
      next = union(previous, values);
    if (next.size !== previous.size) {
      storage.set(key, next);
      changed = true;
    }
  }
  return changed;
}
function joinedOrigins(argumentsOrigins, method) {
  let products = [[]];
  for (const origins of argumentsOrigins) {
    if (!origins.size || [...origins].some((value) => !/^(?:target|literal):/u.test(value)))
      return new Set(['unknown-target']);
    products = products.flatMap((parts) => [...origins].map((value) => [...parts, value]));
    if (products.length > 256) return new Set(['unknown-target']);
  }
  return new Set(
    products.map((parts) => {
      const base = parts[0];
      if (!base) return 'unknown-target';
      const values = parts.map((value) => value.slice(value.indexOf(':') + 1));
      if (
        base.startsWith('target:') &&
        parts.slice(1).every((value) => value.startsWith('literal:'))
      ) {
        const target = path.posix.normalize(path.posix.join(...values));
        if (target.startsWith('../') || target.startsWith('/')) return 'unknown-target';
        return 'target:' + target;
      }
      const api = /^[A-Za-z]:\\/u.test(values[0]) ? path.win32 : path.posix;
      if (!parts.every((value) => value.startsWith('literal:')) || !api.isAbsolute(values[0]))
        return 'unknown-target';
      return 'literal:' + (method === 'resolve' ? api.resolve(...values) : api.join(...values));
    })
  );
}

function evaluate(module, node, modules, returns, depth = 0) {
  if (!node || depth > 32) return new Set();
  const next = (value) => evaluate(module, value, modules, returns, depth + 1);
  if (node.type === 'Identifier')
    return bindingScope(module, node, node.name)?.bindings.get(node.name) ?? new Set(['unknown']);
  if (node.type === 'AwaitExpression' || node.type === 'ChainExpression')
    return next(node.argument ?? node.expression);
  if (node.type === 'Literal')
    return typeof node.value === 'string' ? new Set(['literal:' + node.value]) : new Set();
  if (node.type === 'ArrayExpression') return union(...node.elements.map(next));
  if (node.type === 'ObjectExpression')
    return union(...node.properties.map((p) => next(p.value ?? p.argument)));
  if (node.type === 'SpreadElement') return next(node.argument);
  if (node.type === 'ConditionalExpression')
    return union(next(node.consequent), next(node.alternate));
  if (node.type === 'LogicalExpression' || node.type === 'BinaryExpression')
    return union(next(node.left), next(node.right));
  if (node.type === 'NewExpression' && node.callee.name === 'URL') {
    const value = literal(node.arguments[0]);
    const base = node.arguments[1];
    if (
      value &&
      base?.type === 'MemberExpression' &&
      base.property.name === 'url' &&
      base.object?.type === 'MetaProperty'
    ) {
      try {
        return new Set(['target:' + resolveTarget(module.path, value).target]);
      } catch {
        return new Set(['unknown-target']);
      }
    }
    return new Set(['unknown-target']);
  }
  if (node.type === 'MemberExpression') {
    if (
      node.object.name === 'process' &&
      memberName(node) === 'execPath' &&
      !bindingScope(module, node.object, 'process')
    )
      return new Set(['node-executable']);
    const receiver = expand(next(node.object), modules);
    if ([...receiver].some((origin) => origin.startsWith('builtin-module:')))
      return new Set(['builtin:' + memberName(node)]);
    return receiver;
  }
  if (node.type === 'CallExpression') {
    const callee = expand(next(node.callee), modules);
    if (callee.has('builtin:createRequire')) return new Set(['native-loader']);
    if (callee.has('native-factory')) return new Set(['native']);
    if (callee.has('stock-factory')) return new Set(['stock']);
    const name = node.callee.name ?? memberName(node.callee);
    if (
      name === 'fileURLToPath' ||
      callee.has('builtin:fileURLToPath') ||
      name === 'promisify' ||
      callee.has('builtin:promisify')
    )
      return next(node.arguments[0]);
    if (
      node.callee.type === 'MemberExpression' &&
      ['join', 'resolve'].includes(name) &&
      node.arguments.length
    ) {
      // Preserve URL/parameter provenance; unknown string assembly remains unknown.
      return joinedOrigins(
        node.arguments.map((arg) => expand(next(arg), modules)),
        name
      );
    }
    const result = new Set();
    for (const value of callee)
      if (value.startsWith('function:')) {
        const key = value.slice(9);
        const index = key.lastIndexOf(':');
        const target = modules.get(key.slice(0, index)),
          exported = key.slice(index + 1);
        if (target?.bindings.get(exported)?.has('native-factory')) result.add('native');
        else for (const item of returns.get(key) ?? []) result.add(item);
      }
    return result;
  }
  return new Set();
}
function analyze(data) {
  const returns = new Map();
  let changed = true,
    rounds = 0;
  while (changed && rounds++ < 512) {
    changed = false;
    for (const module of data.modules.values())
      for (const node of module.nodes) {
        const values = (value) => evaluate(module, value, data.modules, returns);
        if (node.type === 'VariableDeclarator')
          changed = assign(module, node.id, values(node.init)) || changed;
        if (node.type === 'AssignmentExpression')
          changed = assign(module, node.left, values(node.right)) || changed;
        if (node.type === 'CallExpression' || node.type === 'NewExpression') {
          for (const origin of expand(values(node.callee), data.modules))
            if (origin.startsWith('function:')) {
              const key = origin.slice(9),
                index = key.lastIndexOf(':');
              const target = data.modules.get(key.slice(0, index)),
                name = key.slice(index + 1);
              const fn = target?.functions.get(name);
              if (fn)
                fn.params.forEach((parameter, i) => {
                  changed = assign(target, parameter, values(node.arguments[i])) || changed;
                });
            }
        }
        if (node.type === 'ReturnStatement') {
          let parent = module.parents.get(node);
          while (
            parent &&
            !['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'].includes(
              parent.type
            )
          )
            parent = module.parents.get(parent);
          for (const [name, fn] of module.functions)
            if (fn === parent) {
              const key = module.path + ':' + name,
                old = returns.get(key) ?? new Set(),
                next = union(old, values(node.argument));
              if (next.size !== old.size) {
                returns.set(key, next);
                changed = true;
              }
            }
        }
      }
  }
  if (changed) data.problems.push({ code: 'origin-analysis-budget' });
  for (const module of data.modules.values())
    for (const node of module.nodes) {
      if (node.type === 'VariableDeclarator' || node.type === 'AssignmentExpression') {
        const origins = expand(
          evaluate(module, node.init ?? node.right, data.modules, returns),
          data.modules,
          true
        );
        data.edges.push({
          path: module.path,
          line: node.loc.start.line,
          column: node.loc.start.column,
          kind: 'alias',
          targetKind: 'origin',
          target: patternNames(node.id ?? node.left).join(','),
          origins: [...new Set([...origins].map((origin) => origin.split(':')[0]))].sort(),
        });
      }
      if (!['CallExpression', 'NewExpression'].includes(node.type)) continue;
      const name = node.callee.name ?? memberName(node.callee);
      const values = (value) => evaluate(module, value, data.modules, returns);
      const origins = expand(values(node.callee), data.modules, true);
      const originKinds = [...origins].map((origin) => origin.split(':')[0]).sort();
      data.edges.push({
        path: module.path,
        line: node.loc.start.line,
        column: node.loc.start.column,
        kind: 'call',
        targetKind: 'origin',
        target: name ?? '<unresolved>',
        origins: [...new Set(originKinds)],
      });
      if (origins.has('native-loader')) {
        module.native = true;
        data.problems.push({
          code: 'reachable-native-load',
          path: module.path,
          line: node.loc.start.line,
          column: node.loc.start.column,
        });
      }

      const detail = {
        path: module.path,
        line: node.loc.start.line,
        column: node.loc.start.column,
      };
      if (origins.has('native-factory')) {
        module.native = true;
        data.problems.push({ code: 'reachable-native-operation', ...detail, name });
      }
      if (node.callee.type === 'MemberExpression') {
        const receiver = expand(values(node.callee.object), data.modules, true);
        if (receiver.has('native'))
          data.problems.push({ code: 'native-handle-call', ...detail, name });
        else if (HANDLES.has(name) && (!receiver.has('stock') || receiver.size !== 1))
          data.problems.push({ code: 'unknown-handle-origin', ...detail, name });
      }
      if (LEASE.has(name)) {
        let parent = module.parents.get(node);
        while (parent?.type === 'ChainExpression') parent = module.parents.get(parent);
        if (parent?.type !== 'AwaitExpression')
          data.problems.push({ code: 'unawaited-resource-lease', ...detail, name });
      }
      const launch =
        LAUNCH.has(name) ||
        [...origins].some((o) => o.startsWith('builtin:') && LAUNCH.has(o.slice(8)));
      if (launch) {
        const targets = expand(union(...node.arguments.map(values)), data.modules, true);
        const repository = [...targets].filter((value) => value.startsWith('target:'));
        const executable = expand(values(node.arguments[0]), data.modules, true);
        const fixedProbes = new Set([
          'literal:/usr/bin/git',
          'literal:/bin/ps',
          'literal:/usr/sbin/ioreg',
          'literal:/usr/sbin/sysctl',
          'literal:C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
          'literal:C:\\Program Files\\Git\\cmd\\git.exe',
        ]);
        const directEntry =
          ['fork', 'Worker'].includes(name) &&
          executable.size > 0 &&
          [...executable].every((value) => value.startsWith('target:'));
        const nodeEntry =
          executable.size === 1 && executable.has('node-executable') && repository.length > 0;
        const stockProbe =
          executable.size > 0 && [...executable].every((value) => fixedProbes.has(value));
        const injectedKnownBuild = name === 'buildBrokerSecurity' && repository.length > 0;
        if (!directEntry && !nodeEntry && !stockProbe && !injectedKnownBuild)
          data.problems.push({ code: 'unresolved-process-entry', ...detail, name });
        for (const value of repository) {
          const target = value.slice(7);
          data.edges.push({ ...detail, kind: 'process-entry', targetKind: 'module', target });
          if (target === 'scripts/build-broker-security.mjs')
            data.problems.push({ code: 'reachable-native-build', ...detail, target });
        }
      }
    }
  return data;
}
function completeGraph(root, initial) {
  let data = analyze(graph(root, initial));
  for (let i = 0; i < MAX_FILES; i++) {
    const extra = data.edges
      .filter(
        (edge) =>
          edge.kind === 'process-entry' &&
          /\.(?:mjs|js)$/u.test(edge.target) &&
          !data.modules.has(edge.target)
      )
      .map((edge) => edge.target);
    if (!extra.length) return data;
    data = analyze(graph(root, [...initial, ...data.modules.keys(), ...extra]));
  }
  throw new Error('source-process-entry-budget');
}
function reachable(data, entries) {
  const result = new Set(),
    pending = [...entries];
  while (pending.length) {
    const file = pending.pop();
    if (result.has(file)) continue;
    result.add(file);
    for (const edge of data.edges)
      if (edge.path === file && edge.targetKind === 'module') pending.push(edge.target);
  }
  return result;
}
function inventoryValid(value) {
  return (
    value &&
    (Object.keys(value).length === 3 ||
      (Object.keys(value).length === 4 && Object.hasOwn(value, 'observedGraph'))) &&
    value.schema === SCHEMA &&
    Array.isArray(value.entries) &&
    value.entries.length > 0 &&
    value.entries.every((x) => typeof x === 'string') &&
    Array.isArray(value.modules) &&
    value.modules.every(
      (row) =>
        row &&
        Object.keys(row).length === 3 &&
        typeof row.path === 'string' &&
        Number.isSafeInteger(row.owner) &&
        row.owner > 0 &&
        ['portable', 'migration-required', 'legacy-unreachable'].includes(row.disposition)
    ) &&
    new Set(value.modules.map((row) => row.path)).size === value.modules.length
  );
}
export function inspectPortableConsumerInventory({ root, inventory } = {}) {
  const physical = realpathSync(root),
    files = sourceFiles(physical);
  const entries = inventory?.entries ?? ['bin/peer-review.mjs', 'src/public-api.mjs'];
  const data = completeGraph(physical, [...files, ...entries]);
  const reached = reachable(data, entries);
  const owners = new Map((inventory?.modules ?? []).map((row) => [row.path, row]));
  const blockers = inventoryValid(inventory) ? [] : [{ code: 'inventory-invalid' }];
  const modules = [...data.modules.values()]
    .map((module) => ({
      path: module.path,
      reachable: reached.has(module.path),
      ...owners.get(module.path),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  for (const module of modules)
    if (!owners.has(module.path)) blockers.push({ code: 'unowned-consumer', path: module.path });
  let declared = [];
  try {
    const metadata = JSON.parse(ordinary(physical, 'package.json'));
    declared = Object.values(
      typeof metadata.bin === 'object' ? metadata.bin : metadata.bin ? { bin: metadata.bin } : {}
    )
      .concat(typeof metadata.exports === 'string' ? [metadata.exports] : [])
      .map((file) => String(file).replace(/^\.\//u, ''));
  } catch (error) {
    if (error.code !== 'ENOENT') blockers.push({ code: 'entry-manifest-invalid' });
  }
  for (const file of declared)
    if (!entries.includes(file)) blockers.push({ code: 'portable-entry-omitted', path: file });
  for (const file of entries)
    if (!data.modules.has(file)) blockers.push({ code: 'entry-unavailable', path: file });
  for (const [file, module] of data.modules)
    if (reached.has(file) && module.native)
      blockers.push({ code: 'reachable-native-operation', path: file });
  for (const problem of data.problems)
    if (
      !problem.path ||
      reached.has(problem.path) ||
      problem.code === 'source-inspection-unavailable'
    )
      blockers.push(problem);
  const edges = data.edges.map((edge) => ({
    ...edge,
    owner: owners.get(edge.path)?.owner ?? null,
  }));
  const ownedBlockers = blockers.map((row) => ({
    ...row,
    owner: owners.get(row.path)?.owner ?? null,
  }));
  const observed = { modules, edges, blockers: ownedBlockers };
  const coverageComplete =
    inventory?.observedGraph !== undefined &&
    JSON.stringify(inventory.observedGraph) === JSON.stringify(observed);
  if (inventory?.observedGraph !== undefined && !coverageComplete)
    ownedBlockers.push({ code: 'observed-graph-mismatch', owner: 186 });
  return {
    schema: 'ai-peer-review.portable-consumer-report/v1',
    verified: false,
    passed: coverageComplete && ownedBlockers.length === 0,
    coverageComplete,
    modules,
    edges,
    blockers: ownedBlockers,
  };
}
export function deriveProcessSourceContract({ root } = {}) {
  const physical = realpathSync(root),
    entry = 'src/protocol/process-source-assurance.mjs';
  const data = graph(physical, [entry]);
  const reached = reachable(data, [entry]);
  const allowed = new Set([
    'schemas/process-source-class-v1.json',
    'src/protocol/process-source-contract-files.json',
  ]);
  if (data.problems.length)
    throw new Error('source-contract-unresolved: ' + JSON.stringify(data.problems));
  for (const edge of data.edges)
    if (edge.targetKind === 'external' && reached.has(edge.path))
      throw new Error('source-contract-external-dependency: ' + edge.target);
  for (const edge of data.edges)
    if (
      edge.targetKind === 'module' &&
      reached.has(edge.path) &&
      !/\.(?:mjs|js)$/u.test(edge.target) &&
      !allowed.has(edge.target)
    )
      throw new Error('source-contract-non-js-data-import: ' + edge.target);
  for (const file of allowed) ordinary(physical, file);
  return Object.freeze({ files: Object.freeze([...new Set([...reached, ...allowed])].sort()) });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
  const file = path.join(root, 'evidence/portable-runtime/consumer-inventory.json');
  let inventory;
  try {
    inventory = JSON.parse(readFileSync(file, 'utf8'));
  } catch {}
  try {
    const report = inspectPortableConsumerInventory({ root, inventory });
    console.log(
      JSON.stringify(
        {
          schema: report.schema,
          verified: report.verified,
          coverageComplete: report.coverageComplete,
          passed: report.passed,
          moduleCount: report.modules.length,
          edgeCount: report.edges.length,
          blockers: report.blockers,
        },
        null,
        2
      )
    );
    process.exitCode = process.argv.includes('--report-only') ? 0 : report.passed ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
