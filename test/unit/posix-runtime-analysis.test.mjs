// @story #141
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { attributeFindings } from '../../scripts/analyze-posix-runtime.mjs';

const all = ['linux', 'darwin', 'win32'];
const cases = [
  ['direct Windows guard', "if(process.platform==='win32'){target();}", ['win32']],
  ['Linux remains in scope', "if(process.platform==='linux'){target();}", ['linux']],
  ['macOS remains in scope', "if(process.platform==='darwin'){target();}", ['darwin']],
  ['shared POSIX guard', "if(process.platform!=='win32'){target();}", ['linux', 'darwin']],
  ['shared call', 'target();', all],
  [
    'destructured platform character remains shared',
    "const [kind]=process.platform;if(kind!=='linux'&&kind!=='darwin'){target();}",
    all,
  ],
  [
    'known falsy logical operand retains its value',
    "const x=0;if(process.platform==='win32'||((x&&false)!==false)){target();}",
    all,
  ],
  [
    'exported unknown logical operand stays shared',
    "export function run(x){if(process.platform==='win32'||((x&&false)!==false)){target();}}",
    all,
  ],

  [
    'destructured binding stays unresolved',
    "const {kind='win32'}=process.platform;if(kind==='win32'){target();}",
    all,
  ],
  [
    'array destructuring stays unresolved',
    "const [kind='win32']=[];if(kind==='win32'){target();}",
    all,
  ],
  [
    'logical and preserves falsy operand',
    "if((process.platform==='win32'&&false)===false){target();}",
    all,
  ],
  [
    'logical or preserves truthy operand',
    "if((process.platform!=='win32'||'win32')==='win32'){target();}",
    ['win32'],
  ],
  [
    'logical and unknown operand cannot force false value',
    "if((unknown&&false)===false||process.platform==='win32'){target();}",
    all,
  ],
  [
    'logical or unknown operand cannot force true value',
    "if((unknown||true)===true||process.platform==='win32'){target();}",
    all,
  ],

  [
    'parameter is not platform proof',
    "export function run(kind){if(kind==='win32'){target();}}",
    all,
  ],
  [
    'private direct caller',
    "function run(){target();}if(process.platform==='win32'){run();}",
    ['win32'],
  ],
  [
    'shared private callers',
    "function run(){target();}if(process.platform==='win32'){run();}else{run();}",
    all,
  ],
  [
    'exported declaration',
    "export function run(){target();}if(process.platform==='win32'){run();}",
    all,
  ],
  [
    'exported arrow',
    "export const run=()=>{target();};if(process.platform==='win32'){run();}",
    all,
  ],
  [
    'exported function expression',
    "export const run=function(){target();};if(process.platform==='win32'){run();}",
    all,
  ],
  [
    'escaped callback',
    "function run(){target();}const callback=run;if(process.platform==='win32'){run();}",
    all,
  ],
  [
    'shadowed process',
    "export function run(process){if(process.platform==='win32'){target();}}",
    all,
  ],
  ['immutable alias', "const kind=process.platform;if(kind==='win32'){target();}", ['win32']],
  ['mutable alias', "let kind=process.platform;kind='win32';if(kind==='win32'){target();}", all],
];
function fixture(t, source, file = 'bin/main.mjs') {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-posix-attribution-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), source);
  return {
    root,
    finding: {
      code: 'unknown-handle-origin',
      path: file,
      line: 1,
      column: source.indexOf('target()'),
      owner: 141,
    },
  };
}
for (const [name, source, expected] of cases)
  test(name, (t) => {
    const { root, finding } = fixture(t, source);
    const rows = attributeFindings({ root, blockers: [finding] });
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].possiblePlatforms, expected);
    assert.equal(
      rows[0].attribution,
      expected.length === 1 && expected[0] === 'win32'
        ? 'proven-windows-only'
        : 'shared-or-unresolved'
    );
  });
test('mixed source keeps each shared finding and ignores a Windows-looking filename', (t) => {
  const source = "if(process.platform==='win32'){target();}target();";
  const { root, finding } = fixture(t, source, 'bin/windows-only.mjs');
  const second = { ...finding, column: source.lastIndexOf('target()') };
  const aggregate = { code: 'observed-graph-mismatch', owner: 186 };
  const rows = attributeFindings({ root, blockers: [finding, second, aggregate] });
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => row.index),
    [0, 1, 2]
  );
  assert.deepEqual(rows[0].possiblePlatforms, ['win32']);
  assert.deepEqual(rows[1].possiblePlatforms, all);
  assert.deepEqual(rows[2].possiblePlatforms, all);
  assert.equal(rows[0].code, finding.code);
  assert.equal(rows[2].code, aggregate.code);
});
test('changed source is re-read rather than accepted from a prior cached attribution', (t) => {
  const { root, finding } = fixture(t, "if(process.platform==='win32'){target();}");
  assert.deepEqual(attributeFindings({ root, blockers: [finding] })[0].possiblePlatforms, [
    'win32',
  ]);
  writeFileSync(path.join(root, finding.path), 'target();');
  const row = attributeFindings({ root, blockers: [{ ...finding, column: 0 }] })[0];
  assert.deepEqual(row.possiblePlatforms, all);
});
test('outside-source paths and invalid finding locations refuse attribution', (t) => {
  const { root, finding } = fixture(t, 'target();');
  assert.throws(() =>
    attributeFindings({ root, blockers: [{ ...finding, path: '../outside.mjs' }] })
  );
  assert.throws(() => attributeFindings({ root, blockers: [{ ...finding, column: 100 }] }));
});
test('dynamic lexical evaluation prevents a private-only reachability claim', (t) => {
  const { root, finding } = fixture(
    t,
    "function run(){target();}if(process.platform==='win32'){run();}eval('run()');"
  );
  assert.deepEqual(attributeFindings({ root, blockers: [finding] })[0].possiblePlatforms, all);
});
test('source witness identifies the inner callee when nested calls share a location', (t) => {
  const source = "if(process.platform==='win32'){Buffer.from('text').toString();}";
  const { root } = fixture(t, source);
  const row = attributeFindings({
    root,
    blockers: [
      {
        code: 'unknown-handle-origin',
        path: 'bin/main.mjs',
        line: 1,
        column: source.indexOf('Buffer'),
        name: 'from',
      },
    ],
  })[0];
  assert.equal(row.expression, "Buffer.from('text')");
});
