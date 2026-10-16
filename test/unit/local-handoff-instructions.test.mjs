// @story #190
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { installRuntimeFixture } from '../helpers/runtime-package.mjs';
test('installed host wrapper opens its shipped local procedure without enrollment', (t) => {
  const runtime = installRuntimeFixture(t);
  const child = runtime.execute(
    `const {hostWrapper}=await import(${runtime.module('src/config/integration-assets.mjs')});console.log(JSON.stringify(hostWrapper('codex')));`,
    { cwd: runtime.directory }
  );
  assert.equal(child.status, 0, child.stderr);
  const wrapper = JSON.parse(child.stdout);
  assert.match(wrapper, /peer-review help --json/u);
  const help = runtime.execute(
    `const {run}=await import(${runtime.module('src/cli/run.mjs')});await run(['help','--json'],{cwd:process.cwd(),env:process.env,stdout:process.stdout,stderr:process.stderr});`,
    { cwd: runtime.directory }
  );
  assert.equal(help.status, 0, help.stderr);
  const file = JSON.parse(help.stdout).skillPath;
  assert.equal(file, path.join(runtime.packageRoot, 'skills/peer-review/SKILL.md'));
  assert.doesNotMatch(wrapper, /Run `peer-review primary inspect/u);
  const skill = readFileSync(file, 'utf8');
  assert.match(skill, /ordinary project filesystem access/u);
  assert.match(skill, /instruction-bound/u);
  assert.doesNotMatch(
    skill.slice(0, skill.indexOf('## Legacy maintenance')),
    /peer-review register-runtime|peer-review primary register|requires the project-local broker/u
  );
});
