// @story #190
// Required positive installed acceptance after genuine final-source admission.
// No injected source class, capability, deadline extension or fallback.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
export function assertInstalledEffectAcceptance(f) {
  const imports =
    'import {withOperationAuthority,performCurrentOperationEffect} from ' +
    f.module('src/startup/authority-fence.mjs') +
    ';';
  const positive = f.execute(
    imports +
      'let effects=0;const value=await withOperationAuthority({operation:"start",cwd:process.cwd()},()=>performCurrentOperationEffect(()=>{effects++;return "observed";}));console.log(JSON.stringify({effects,value}));'
  );
  assert.equal(positive.status, 0, positive.stderr);
  assert.deepEqual(JSON.parse(positive.stdout), { effects: 1, value: 'observed' });
  const policy = path.join(f.root, '.ai-peer-review/config.json');
  const originalPolicy = readFileSync(policy);
  const drift = f.execute(
    imports +
      'import {readFileSync,writeFileSync} from "node:fs";import path from "node:path";' +
      'let effects=0,code=null;try{await withOperationAuthority({operation:"start",cwd:process.cwd()},async()=>{await Promise.resolve();const file=path.join(process.cwd(),".ai-peer-review/config.json");writeFileSync(file,readFileSync(file,"utf8")+" ");await performCurrentOperationEffect(()=>{effects++;});});}catch(error){code=error.code;}console.log(JSON.stringify({effects,code}));'
  );
  assert.equal(drift.status, 0, drift.stderr);
  assert.deepEqual(JSON.parse(drift.stdout), {
    effects: 0,
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
  writeFileSync(policy, originalPolicy);
  const originalErrors = readFileSync(path.join(f.installed, 'src/errors.mjs'));
  const originalInventory = readFileSync(path.join(f.installed, 'runtime-inventory.json'));
  const lateInventory = f.execute(
    imports +
      'import fs from "node:fs";import path from "node:path";import {createHash} from "node:crypto";import {syncBuiltinESMExports} from "node:module";' +
      'const installed=' +
      JSON.stringify(f.installed) +
      ';const manifest=path.join(installed,"runtime-inventory.json");let armed=false,changed=false,effects=0,code=null;const realStat=fs.lstatSync;' +
      'fs.lstatSync=function(file,...args){if(armed&&!changed&&file===manifest&&new Error().stack.includes("assertEffectIntegrity")&&!new Error().stack.includes("assertOperationAuthorityNow")){changed=true;const target=path.join(installed,"src/errors.mjs");fs.appendFileSync(target,"\\n// changed generation\\n");const value=JSON.parse(fs.readFileSync(manifest));value.files.find(entry=>entry.path==="src/errors.mjs").sha256=createHash("sha256").update(fs.readFileSync(target)).digest("hex");fs.writeFileSync(manifest,JSON.stringify(value)+"\\n");}return Reflect.apply(realStat,this,[file,...args]);};syncBuiltinESMExports();' +
      'try{await withOperationAuthority({operation:"start",cwd:process.cwd()},async()=>{armed=true;await performCurrentOperationEffect(()=>{effects++;});});}catch(error){code=error.code;}console.log(JSON.stringify({changed,effects,code}));'
  );
  // Disposable acceptance runner restores bytes for subsequent installed checks.
  writeFileSync(path.join(f.installed, 'src/errors.mjs'), originalErrors);
  writeFileSync(path.join(f.installed, 'runtime-inventory.json'), originalInventory);
  assert.equal(lateInventory.status, 0, lateInventory.stderr);
  const late = JSON.parse(lateInventory.stdout);
  assert.equal(late.changed, true);
  assert.equal(late.effects, 0, JSON.stringify(late));
  assert.equal(late.code, 'APR_RUNTIME_CHANGED', JSON.stringify(late));
}
