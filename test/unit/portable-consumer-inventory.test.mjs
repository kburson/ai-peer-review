// cspell:words unawaited
import { spawnSync as runNode } from 'node:child_process';
// @story #186
import assert from 'node:assert/strict';
import test from 'node:test';
import { consumerFixture } from '../helpers/portable-consumer-fixtures.mjs';
const api = await import('../../scripts/verify-portable-consumers.mjs').catch(() => ({}));
function inspect(t, files, options) {
  assert.equal(typeof api.inspectPortableConsumerInventory, 'function');
  return api.inspectPortableConsumerInventory(consumerFixture(t, files, options));
}
function blocked(report, code) {
  assert.equal(report.verified, false);
  assert.ok(
    report.blockers.some((row) => row.code === code),
    JSON.stringify(report.blockers)
  );
}
test('a complete neutral module graph is diagnostic data without operation authority', (t) => {
  const report = inspect(t, {
    'bin/peer-review.mjs':
      "import { value } from '../src/helper.mjs'; export const answer = value;",
    'src/helper.mjs': 'export const value = 42;',
  });
  assert.deepEqual(report.blockers, []);
  assert.equal(report.verified, false);
  assert.deepEqual(
    report.modules.map((row) => row.path),
    ['bin/peer-review.mjs', 'src/helper.mjs']
  );
});
test('an omitted imported consumer blocks complete inventory', (t) => {
  blocked(
    inspect(
      t,
      {
        'bin/peer-review.mjs': "import '../src/helper.mjs';",
        'src/helper.mjs': 'export const value = 42;',
      },
      { omit: ['src/helper.mjs'] }
    ),
    'unowned-consumer'
  );
});
test('new unowned modules are classified even outside the initial reachable entry', (t) => {
  blocked(
    inspect(
      t,
      {
        'bin/peer-review.mjs': 'export const value = 42;',
        'src/new-consumer.mjs': 'export const extra = 1;',
      },
      { omit: ['src/new-consumer.mjs'] }
    ),
    'unowned-consumer'
  );
});
test('a renamed default native factory cannot hide its origin', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import factory from '../src/native.mjs'; const alias = factory; export const result = alias();",
      'src/native.mjs': 'export default function platformSecurity() { return {}; }',
    }),
    'reachable-native-operation'
  );
});
test('a native handle forwarded to a module without native imports remains tainted', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { platformSecurity as make } from '../src/native.mjs'; import { use } from '../src/use.mjs'; const handle = make(); use(handle);",
      'src/native.mjs': 'export function platformSecurity() { return {}; }',
      'src/use.mjs':
        'export function use(injected) { const alias = injected; return alias.userId(); }',
    }),
    'native-handle-call'
  );
});
test('a neutral binding imported from a mixed native module still blocks module reachability', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { neutral } from '../src/mixed.mjs'; export const value = neutral;",
      'src/mixed.mjs':
        'export const neutral = 1; export function platformSecurity() { return {}; }',
    }),
    'reachable-native-operation'
  );
});
test('an unresolved dynamic import is an inventory blocker', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs': 'export async function choose(target) { return import(target); }',
    }),
    'unresolved-dynamic-import'
  );
});
test('a literal dynamic import has its full transitive module closure', (t) => {
  const report = inspect(t, {
    'bin/peer-review.mjs': "export async function choose() { return import('../src/helper.mjs'); }",
    'src/helper.mjs': "export { value } from './leaf.mjs';",
    'src/leaf.mjs': 'export const value = 42;',
  });
  assert.deepEqual(report.blockers, []);
  assert.equal(report.modules.length, 3);
});
test('a repository URL flowed into a launcher exposes the native build entry', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { execFile } from 'node:child_process'; import { fileURLToPath } from 'node:url'; const script = fileURLToPath(new URL('../scripts/build-broker-security.mjs', import.meta.url)); execFile(process.execPath, [script]);",
      'scripts/build-broker-security.mjs': 'export const nativeBuild = true;',
    }),
    'reachable-native-build'
  );
});
test('an injected launcher cannot hide the URL target', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "export async function build(io) { const script = new URL('../scripts/build-broker-security.mjs', import.meta.url); await io.buildBrokerSecurity({ script }); }",
      'scripts/build-broker-security.mjs': 'export const nativeBuild = true;',
    }),
    'reachable-native-build'
  );
});
test('the broker spawn target is attributed to its caller and traversed', (t) => {
  const report = inspect(t, {
    'bin/peer-review.mjs':
      "import { spawn } from 'node:child_process'; const broker = new URL('./peer-review-broker.mjs', import.meta.url); spawn(process.execPath, [broker]);",
    'bin/peer-review-broker.mjs': 'export const protocol = 1;',
  });
  assert.deepEqual(report.blockers, []);
  assert.ok(
    report.edges.some(
      (row) => row.kind === 'process-entry' && row.target === 'bin/peer-review-broker.mjs'
    )
  );
});
test('unknown reachable spawn targets fail closed', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { spawn } from 'node:child_process'; export function start(target) { spawn(process.execPath, [target]); }",
    }),
    'unresolved-process-entry'
  );
});
test('an unawaited lease verification blocks the launch effect site', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        'export async function deliver(lease, launchReviewer) { lease.beforeDelivery(); return launchReviewer(); }',
    }),
    'unawaited-resource-lease'
  );
});
test('awaited lease verification has no promise-as-permission finding', (t) => {
  const report = inspect(t, {
    'bin/peer-review.mjs':
      'export async function deliver(lease, launchReviewer) { await lease.beforeDelivery(); return launchReviewer(); }',
  });
  assert.deepEqual(report.blockers, []);
});
test('source-contract derivation includes literal lazy dependencies and terminates cycles', (t) => {
  assert.equal(typeof api.deriveProcessSourceContract, 'function');
  const fixture = consumerFixture(
    t,
    {
      'src/protocol/process-source-assurance.mjs': "import '../config/selection.mjs';",
      'src/config/selection.mjs': "export const guard = () => import('../broker/guard.mjs');",
      'src/broker/guard.mjs': "import '../protocol/process-source-assurance.mjs';",
      'schemas/process-source-class-v1.json': '{}',
      'src/protocol/process-source-contract-files.json': '{}',
    },
    { entries: ['src/protocol/process-source-assurance.mjs'] }
  );
  assert.deepEqual(api.deriveProcessSourceContract({ root: fixture.root }).files, [
    'schemas/process-source-class-v1.json',
    'src/broker/guard.mjs',
    'src/config/selection.mjs',
    'src/protocol/process-source-assurance.mjs',
    'src/protocol/process-source-contract-files.json',
  ]);
});
test('source-contract derivation refuses an unreviewed JSON import instead of silently skipping it', (t) => {
  assert.equal(typeof api.deriveProcessSourceContract, 'function');
  const fixture = consumerFixture(t, {
    'src/protocol/process-source-assurance.mjs':
      "import value from '../../package.json' with { type: 'json' }; export default value;",
    'package.json': '{}',
    'schemas/process-source-class-v1.json': '{}',
    'src/protocol/process-source-contract-files.json': '{}',
  });
  assert.throws(
    () => api.deriveProcessSourceContract({ root: fixture.root }),
    /non-js|JSON|data-import/i
  );
});

test('an uncertain branch cannot borrow a stock handle origin from its other branch', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { initializePortableOperations } from '../src/broker/portable-platform.mjs'; export async function choose(unproved, flag) { const handle = flag ? await initializePortableOperations() : unproved; return handle.userId(); }",
      'src/broker/portable-platform.mjs':
        'export function initializePortableOperations() { return {}; }',
    }),
    'unknown-handle-origin'
  );
});
test('an arbitrary Windows executable is not a fixed stock probe', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { execFile } from 'node:child_process'; execFile('C:\\\\Windows\\\\Temp\\\\evil.exe', []);",
    }),
    'unresolved-process-entry'
  );
});
test('a known script argument cannot excuse an unknown executable', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { spawn } from 'node:child_process'; export function launch(executable) { const script = new URL('./peer-review-broker.mjs', import.meta.url); return spawn(executable, [script]); }",
      'bin/peer-review-broker.mjs': 'export const protocol = 1;',
    }),
    'unresolved-process-entry'
  );
});
test('inventory cannot omit the package-declared portable entry', (t) => {
  blocked(
    inspect(
      t,
      {
        'package.json': '{"bin":{"peer-review":"./bin/peer-review.mjs"}}',
        'bin/peer-review.mjs':
          "import { platformSecurity } from '../src/native.mjs'; export const handle = platformSecurity();",
        'src/native.mjs': 'export function platformSecurity() { return {}; }',
        'src/helper.mjs': 'export const value = 1;',
      },
      { entries: ['src/helper.mjs'] }
    ),
    'portable-entry-omitted'
  );
});
test('source-contract derivation cannot exclude an imported third-party implementation', (t) => {
  assert.equal(typeof api.deriveProcessSourceContract, 'function');
  const fixture = consumerFixture(t, {
    'src/protocol/process-source-assurance.mjs': "import 'unreviewed-guard-package';",
    'schemas/process-source-class-v1.json': '{}',
    'src/protocol/process-source-contract-files.json': '{}',
  });
  assert.throws(
    () => api.deriveProcessSourceContract({ root: fixture.root }),
    /external|dependency|contract/i
  );
});

test('a same-named local in another function cannot prove an unknown launch parameter', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { spawn } from 'node:child_process'; function declared() { const target = new URL('./peer-review-broker.mjs', import.meta.url); return target; } export function launch(target) { return spawn(process.execPath, [target]); } export { declared };",
      'bin/peer-review-broker.mjs': 'export const protocol = 1;',
    }),
    'unresolved-process-entry'
  );
});
test('a same-named stock local cannot bless an unrelated handle parameter', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { initializePortableOperations } from '../src/broker/portable-platform.mjs'; export async function initialize() { const handle = await initializePortableOperations(); return handle; } export function use(handle) { return handle.userId(); }",
      'src/broker/portable-platform.mjs':
        'export function initializePortableOperations() { return {}; }',
    }),
    'unknown-handle-origin'
  );
});

test('removing an imported edge from the bound observed graph blocks coverage', (t) => {
  const fixture = consumerFixture(t, {
    'bin/peer-review.mjs':
      "import { value } from '../src/helper.mjs'; export const answer = value;",
    'src/helper.mjs': 'export const value = 42;',
  });
  assert.equal(typeof api.inspectPortableConsumerInventory, 'function');
  const first = api.inspectPortableConsumerInventory(fixture);
  assert.ok(first.edges.some((edge) => edge.target === 'src/helper.mjs'));
  fixture.inventory.observedGraph = {
    modules: first.modules,
    edges: first.edges,
    blockers: first.blockers,
  };
  fixture.inventory.observedGraph.edges = [];
  blocked(api.inspectPortableConsumerInventory(fixture), 'observed-graph-mismatch');
});
test('an aliased native require loader cannot evade the graph by avoiding named native factories', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { createRequire as make } from 'node:module'; const load = make(import.meta.url); export const binding = load('../native/hidden.node');",
    }),
    'reachable-native-load'
  );
});

test('shared parameter diamonds complete without repeatedly expanding the same symbolic origins', (t) => {
  const definitions = [
    'function f0(value) { return value; }',
    'function f1(value) { return f0(value); }',
  ];
  for (let i = 2; i <= 40; i++)
    definitions.push(
      'function f' + i + '(value) { f' + (i - 1) + '(value); return f' + (i - 2) + '(value); }'
    );
  definitions.push('export function inspect(value) { return f40(value).userId(); }');
  const fixture = consumerFixture(t, { 'bin/peer-review.mjs': definitions.join('\n') });
  const source =
    'import {inspectPortableConsumerInventory} from ' +
    JSON.stringify(new URL('../../scripts/verify-portable-consumers.mjs', import.meta.url).href) +
    ';const report=inspectPortableConsumerInventory(' +
    JSON.stringify(fixture) +
    ');console.log(JSON.stringify(report.blockers.map(row=>row.code)));';
  const result = runNode(process.execPath, ['--input-type=module', '-e', source], {
    encoding: 'utf8',
    timeout: 3000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).includes('unknown-handle-origin'));
});

test('native alias edges retain their source location and migration owner', (t) => {
  const report = inspect(t, {
    'bin/peer-review.mjs':
      "import { platformSecurity } from '../src/native.mjs'; const other = platformSecurity; export const handle = other();",
    'src/native.mjs': 'export function platformSecurity() { return {}; }',
  });
  assert.ok(
    report.edges.some(
      (edge) =>
        edge.kind === 'alias' &&
        edge.target === 'other' &&
        edge.origins.includes('native-factory') &&
        edge.owner === 186 &&
        edge.line === 1
    )
  );
});

test('a namespace require loader remains a native load edge', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import * as Module from 'node:module'; const load = Module.createRequire(import.meta.url); export const binding = load('../native/hidden.node');",
    }),
    'reachable-native-load'
  );
});
test('an exported native factory alias refuses even when its implementation name is neutral', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { platformSecurity as make } from '../src/helper.mjs'; export const handle = make();",
      'src/helper.mjs': 'function make() { return {}; } export { make as platformSecurity };',
    }),
    'reachable-native-operation'
  );
});
test('native origin prevents a generic handle method from escaping the native method-name list', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { platformSecurity } from '../src/helper.mjs'; const handle = platformSecurity(); handle.read();",
      'src/helper.mjs': 'export function platformSecurity() { return {}; }',
    }),
    'native-handle-call'
  );
});
test('joining a module-derived repository root with a script preserves the actual process target', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { spawn } from 'node:child_process'; const root = fileURLToPath(new URL('../', import.meta.url)); const script = path.join(root, 'scripts', 'build-broker-security.mjs'); spawn(process.execPath, [script]);",
      'scripts/build-broker-security.mjs': 'export const nativeBuild = true;',
    }),
    'reachable-native-build'
  );
});

test('review: unknown returns cannot be erased from stock handle alternatives', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { initializePortableOperations } from '../src/broker/portable-platform.mjs'; const bogus = () => ({ userId() { return 'fake'; } }); const op = flag ? await initializePortableOperations() : bogus(); op.userId();",
      'src/broker/portable-platform.mjs':
        'export function initializePortableOperations() { return {}; }',
    }),
    'unknown-handle-origin'
  );
});
test('review: unresolved operational methods refuse regardless of method name', (t) => {
  blocked(
    inspect(t, { 'bin/peer-review.mjs': 'export function go(handle) { return handle.read(); }' }),
    'unknown-handle-origin'
  );
});
test('review: unreachable stock callers cannot establish reachable parameter authority', (t) => {
  const report = inspect(t, {
    'bin/peer-review.mjs': "export { use } from '../src/use.mjs';",
    'src/use.mjs': 'export function use(handle) { return handle.userId(); }',
    'src/unreachable.mjs':
      "import { use } from './use.mjs'; import { initializePortableOperations } from './broker/portable-platform.mjs'; use(await initializePortableOperations());",
    'src/broker/portable-platform.mjs':
      'export function initializePortableOperations() { return {}; }',
  });
  assert.equal(report.modules.find((row) => row.path === 'src/unreachable.mjs').reachable, false);
  blocked(report, 'unknown-handle-origin');
});
test('review: public parameters retain unknown external alternatives beside reachable stock calls', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { initializePortableOperations } from '../src/broker/portable-platform.mjs'; export function use(handle) { return handle.userId(); } use(await initializePortableOperations());",
      'src/broker/portable-platform.mjs':
        'export function initializePortableOperations() { return {}; }',
    }),
    'unknown-handle-origin'
  );
});
test('review: every alternative in the actual Node script position must be resolved', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { spawn } from 'node:child_process'; const known = new URL('./broker.mjs', import.meta.url); spawn(process.execPath, [flag ? known : target]);",
      'bin/broker.mjs': 'export const protocol = 1;',
    }),
    'unresolved-process-entry'
  );
});
test('review: a repository argument after an unknown script cannot excuse the script', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { spawn } from 'node:child_process'; const known = new URL('./broker.mjs', import.meta.url); spawn(process.execPath, [target, known]);",
      'bin/broker.mjs': 'export const protocol = 1;',
    }),
    'unresolved-process-entry'
  );
});
test('review: a reachable CommonJS dependency cannot disappear from inspection', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs': "import '../src/native.cjs';",
      'src/native.cjs': "require('../native/binding.node');",
    }),
    'unsupported-module-dependency'
  );
});
test('review: reachable external implementations require explicit refusal', (t) => {
  blocked(
    inspect(t, { 'bin/peer-review.mjs': "import 'unknown-implementation';" }),
    'external-implementation-dependency'
  );
});
test('review: bare builtin launcher aliases still refuse unknown targets', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { spawn as launch } from 'child_process'; launch(process.execPath, [target]);",
    }),
    'unresolved-process-entry'
  );
});
test('review: object and conditional exports remain required public entries', (t) => {
  blocked(
    inspect(t, {
      'package.json':
        '{"exports":{".":{"import":"./src/public-api.mjs","default":"./src/fallback.mjs"}}}',
      'bin/peer-review.mjs': 'export const value = 1;',
      'src/public-api.mjs': 'export function platformSecurity() { return {}; }',
      'src/fallback.mjs': 'export const value = 2;',
    }),
    'portable-entry-omitted'
  );
});

test('review: an uncertain factory alias retains its unknown return alternative', (t) => {
  blocked(
    inspect(t, {
      'bin/peer-review.mjs':
        "import { initializePortableOperations } from '../src/broker/portable-platform.mjs'; const make = flag ? initializePortableOperations : injected; const handle = await make(); handle.userId();",
      'src/broker/portable-platform.mjs':
        'export function initializePortableOperations() { return {}; }',
    }),
    'unknown-handle-origin'
  );
});
