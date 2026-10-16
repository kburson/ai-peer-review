// @story #190
// Installed protocol fixture controls; not ordinary OS journey acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fixture as createProject } from '../helpers/intervention-fixture.mjs';
import { installRuntimeFixture } from '../helpers/runtime-package.mjs';

test('nested mutation retains original context and refuses cross-worktree or aborted parents', async (t) => {
  const project = createProject();
  t.after(project.cleanup);
  const installed = installRuntimeFixture(t);
  const fixture = {
    root: project.root,
    module: installed.module,
    execute: (code) => installed.execute(code, { cwd: project.root }),
  };
  const prefix =
    'import {withOperationAuthority,currentOperationAuthorityContext} from ' +
    fixture.module('src/startup/authority-fence.mjs') +
    ';';
  const run = (body) => {
    const result = fixture.execute(prefix + body);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  await t.test('a subdirectory cannot replace the original signal or extend its deadline', () => {
    const result = run(
      'const observed=await withOperationAuthority({operation:"submit",cwd:' +
        JSON.stringify(fixture.root) +
        '},async()=>{const parent=await currentOperationAuthorityContext();return withOperationAuthority({operation:"protocol.mutate",cwd:' +
        JSON.stringify(path.join(fixture.root, 'docs')) +
        ',signal:new AbortController().signal,deadline:parent.deadline+30000},async()=>{const child=await currentOperationAuthorityContext();return {sameSignal:parent.signal===child.signal,sameDeadline:parent.deadline===child.deadline};});});console.log(JSON.stringify(observed));'
    );
    assert.deepEqual(result, { sameSignal: true, sameDeadline: true });
  });
  await t.test('a linked checkout cannot inherit the parent admission', () => {
    const linked = path.join(fixture.root, 'linked-context');
    execFileSync('git', ['worktree', 'add', '--detach', linked, 'HEAD'], {
      cwd: fixture.root,
      stdio: 'pipe',
    });
    const result = run(
      'let entered=false,code;try{await withOperationAuthority({operation:"submit",cwd:' +
        JSON.stringify(fixture.root) +
        '},()=>withOperationAuthority({operation:"protocol.mutate",cwd:' +
        JSON.stringify(linked) +
        '},()=>{entered=true;}));}catch(error){code=error.code;}console.log(JSON.stringify({entered,code}));'
    );
    assert.deepEqual(result, { entered: false, code: 'APR_OPERATION_AUTHORITY_UNAVAILABLE' });
  });
  await t.test('a fresh child signal cannot revive an aborted parent', () => {
    const result = run(
      'const controller=new AbortController();let entered=false,refused=false;try{await withOperationAuthority({operation:"submit",cwd:' +
        JSON.stringify(fixture.root) +
        ',signal:controller.signal},async()=>{controller.abort();await withOperationAuthority({operation:"protocol.mutate",cwd:' +
        JSON.stringify(path.join(fixture.root, 'docs')) +
        ',signal:new AbortController().signal,deadline:performance.now()+30000},()=>{entered=true;});});}catch{refused=true;}console.log(JSON.stringify({entered,refused}));'
    );
    assert.deepEqual(result, { entered: false, refused: true });
  });
});
