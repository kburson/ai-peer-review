// @story #187
// Fresh-process controls observe original stock principal queries; no injected identity.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
const mode = process.argv[2];
const cwd = await fsp.realpath(await fsp.mkdtemp(path.join(tmpdir(), 'apr-principal-bound-')));
const displaced = cwd + '-displaced';
let observations = 0,
  paths = 0,
  replaced = false;
function observe() {
  observations++;
  if (['replacement', 'batch-replacement'].includes(mode) && paths === 2 && !replaced) {
    fs.renameSync(cwd, displaced);
    fs.mkdirSync(cwd);
    replaced = true;
  }
}
const rawRealpath = fsp.realpath;
fsp.realpath = async (...args) => {
  const value = await rawRealpath(...args);
  if (args[0] === cwd) paths++;
  return value;
};
if (process.platform === 'win32') {
  const original = cp.execFile;
  const isPrincipal = (file, args) => {
    if (file === 'C:\\Windows\\System32\\whoami.exe' && args.join(',') === '/user,/fo,csv,/nh')
      return true;
    const position = args.indexOf('-EncodedCommand');
    const source =
      position < 0 ? '' : Buffer.from(args[position + 1], 'base64').toString('utf16le');
    return /WindowsIdentity.*GetCurrent/.test(source) && !/GetAccessControl|Get-Acl/.test(source);
  };
  function observed(file, args, options, callback) {
    return original(file, args, options, (error, stdout, stderr) => {
      if (!error && isPrincipal(file, args)) observe();
      callback(error, stdout, stderr);
    });
  }
  observed[promisify.custom] = (...args) => {
    const pending = original[promisify.custom](...args);
    pending.then(
      () => {
        if (isPrincipal(args[0], args[1])) observe();
      },
      () => {}
    );
    return pending;
  };
  cp.execFile = observed;
} else {
  const original = process.geteuid.bind(process);
  process.geteuid = () => {
    const value = original();
    observe();
    return value;
  };
}
syncBuiltinESMExports();
try {
  const { initializePortableSystem } = await import('../../src/broker/portable-system.mjs');
  const system = await initializePortableSystem({
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  });
  observations = 0;
  if (mode === 'count') {
    await system.canonicalPath(cwd);
    assert.equal(observations, 2);
    observations = 0;
    paths = 0;
    await system.canonicalPath(cwd);
    assert.equal(observations, 2);
  } else if (mode === 'batch' || mode === 'batch-replacement') {
    const second = path.join(cwd, 'second installation path');
    await fsp.mkdir(second);
    observations = 0;
    if (mode === 'batch-replacement') {
      await assert.rejects(system.canonicalPaths([cwd, second]), /path|replaced|identity/i);
      assert.equal(replaced, true);
    } else {
      const observed = system.canonicalPaths
        ? await system.canonicalPaths([cwd, second])
        : [await system.canonicalPath(cwd), await system.canonicalPath(second)];
      assert.deepEqual(observed, [await rawRealpath(cwd), await rawRealpath(second)]);
      assert.equal(observations, 2);
    }
  } else if (mode === 'rendering') {
    const packageRoot = path.join(cwd, 'Mixed Case Package');
    await fsp.mkdir(packageRoot);
    const input = process.platform === 'win32' ? packageRoot.toLowerCase() : packageRoot;
    const expected = await rawRealpath(input);
    assert.equal(await system.canonicalPath(input), expected);
  } else if (mode === 'replacement') {
    await assert.rejects(system.canonicalPath(cwd), /path|replaced|identity/i);
    assert.equal(replaced, true);
  } else throw Error('unknown control');
  console.log(JSON.stringify({ mode, observations, replaced, actualStock: true }));
} finally {
  await fsp.rm(cwd, { recursive: true, force: true });
  await fsp.rm(displaced, { recursive: true, force: true });
}
