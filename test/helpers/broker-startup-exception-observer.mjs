// @story #190
// Unverified diagnostic only. Leaves candidate bytes, APIs and original clocks unchanged.
// Observer pauses add cost; no result from this process establishes acceptance.
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { Session } from 'node:inspector';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const observer = fileURLToPath(import.meta.url);
const output = fileURLToPath(
  new URL('../../.scratch/190-startup-diagnostic-public/', import.meta.url)
);
if (path.basename(process.argv[1] ?? '') !== 'peer-review-broker.mjs') {
  const spawn = cp.spawn;
  cp.spawn = function (file, args, ...rest) {
    if (
      file === process.execPath &&
      Array.isArray(args) &&
      path.basename(args[0] ?? '') === 'peer-review-broker.mjs'
    )
      args = ['--import', observer, ...args];
    return Reflect.apply(spawn, this, [file, args, ...rest]);
  };
  syncBuiltinESMExports();
} else {
  const installed = path.dirname(path.dirname(process.argv[1]));
  const declared = new Set(
    JSON.parse(readFileSync(path.join(installed, 'runtime-inventory.json'))).files.map(
      (entry) => entry.path
    )
  );
  const session = new Session(),
    scripts = new Map(),
    rows = [];
  session.connect();
  const post = (method, params = {}) =>
    new Promise((resolve, reject) =>
      session.post(method, params, (error, value) => (error ? reject(error) : resolve(value)))
    );
  session.on('Debugger.scriptParsed', ({ params }) => scripts.set(params.scriptId, params.url));
  session.on('Debugger.paused', async ({ params }) => {
    try {
      if (!['exception', 'promiseRejection'].includes(params.reason)) return;
      const frames = params.callFrames
        .flatMap((frame) => {
          const url = scripts.get(frame.location.scriptId);
          if (!url?.startsWith('file:')) return [];
          const relative = path.relative(installed, fileURLToPath(url)).split(path.sep).join('/');
          if (!declared.has(relative) || !/^(?:src|bin)\/[A-Za-z0-9_./-]+\.mjs$/u.test(relative))
            return [];
          return [{ module: relative, line: frame.location.lineNumber + 1 }];
        })
        .slice(0, 4);
      if (!frames.length) return;
      let code = null;
      if (params.data?.objectId) {
        const observed = await post('Runtime.getProperties', {
          objectId: params.data.objectId,
          ownProperties: true,
        });
        const value = observed.result.find((entry) => entry.name === 'code')?.value?.value;
        if (typeof value === 'string' && /^(?:APR|ERR)_[A-Z0-9_]{1,80}$/u.test(value)) code = value;
      }
      rows.push({
        event: params.reason,
        errorClass: ['Error', 'TypeError', 'RangeError', 'SyntaxError'].includes(
          params.data?.className
        )
          ? params.data.className
          : 'Error',
        code,
        frames,
      });
      if (rows.length > 16) rows.shift();
    } finally {
      await post('Debugger.resume').catch(() => {});
    }
  });
  await post('Debugger.enable');
  await post('Debugger.setPauseOnExceptions', { state: 'all' });
  process.once('exit', () => {
    mkdirSync(output, { recursive: true });
    writeFileSync(
      path.join(output, 'startup-exceptions.json'),
      JSON.stringify(
        {
          schema: 'ai-peer-review.startup-exception-diagnostic/v1',
          verified: false,
          operationalAuthority: 'unavailable',
          observerPausesCountAgainstOriginalClock: true,
          rows,
        },
        null,
        2
      ) + '\n',
      { flag: 'wx', mode: 0o600 }
    );
    session.disconnect();
  });
}
