// @story #190
// Unverified diagnostic only. Leaves candidate bytes, APIs and original clocks unchanged.
// Observer pauses add cost; no result from this process establishes acceptance.
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { Session } from 'node:inspector';
import { readFileSync, mkdirSync, openSync, writeSync, ftruncateSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
    rows = [],
    stages = new Map();
  const started = performance.now();
  mkdirSync(output, { recursive: true });
  // Only this diagnostic's exclusively created descriptor is ever overwritten.
  // Flush while the broker is alive: an owned crash may prevent an exit hook.
  const descriptor = openSync(path.join(output, 'startup-exceptions.json'), 'wx', 0o600);
  const flush = () => {
    const bytes = Buffer.from(
      JSON.stringify(
        {
          schema: 'ai-peer-review.startup-exception-diagnostic/v1',
          verified: false,
          operationalAuthority: 'unavailable',
          observerMode: 'apr-constructor-breakpoint',
          observerPausesCountAgainstOriginalClock: true,
          rows,
        },
        null,
        2
      ) + '\n'
    );
    writeSync(descriptor, bytes, 0, bytes.length, 0);
    ftruncateSync(descriptor, bytes.length);
  };
  flush();
  session.connect();
  const post = (method, params = {}) =>
    new Promise((resolve, reject) =>
      session.post(method, params, (error, value) => (error ? reject(error) : resolve(value)))
    );
  session.on('Debugger.scriptParsed', ({ params }) => scripts.set(params.scriptId, params.url));
  session.on('Debugger.paused', async ({ params }) => {
    try {
      if (!params.hitBreakpoints?.length) return;
      const stage = params.hitBreakpoints.map((id) => stages.get(id)).find(Boolean);
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
      if (!stage && params.callFrames[0]) {
        const observed = await post('Debugger.evaluateOnCallFrame', {
          callFrameId: params.callFrames[0].callFrameId,
          expression: 'code',
          returnByValue: true,
          throwOnSideEffect: true,
        });
        const value = observed.result?.value;
        if (typeof value === 'string' && /^(?:APR|ERR)_[A-Z0-9_]{1,80}$/u.test(value)) code = value;
      }
      rows.push({
        event: stage ? 'startup-stage' : 'apr-constructor',
        ...(stage ? { stage } : { errorClass: 'AprError' }),
        elapsedMs: Math.round(performance.now() - started),
        code,
        frames,
      });
      if (rows.length > 32) rows.shift();
      flush();
      for (const id of params.hitBreakpoints)
        if (stages.has(id)) {
          stages.delete(id);
          await post('Debugger.removeBreakpoint', { breakpointId: id });
        }
    } finally {
      await post('Debugger.resume').catch(() => {});
    }
  });
  await post('Debugger.enable');
  // A single declared constructor site avoids all resolver/loader exceptions.
  await post('Debugger.setBreakpointByUrl', {
    url: pathToFileURL(path.join(installed, 'src/errors.mjs')).href,
    lineNumber: 7,
  });
  const sites = [
    [
      'src/broker/portable-bootstrap.mjs',
      '    const operations = await initializePortableOperations(context);',
      'bootstrap-read',
    ],
    [
      'src/broker/portable-bootstrap.mjs',
      '    const runtime = await assertSelectedRuntime(context);',
      'bootstrap-runtime',
    ],
    [
      'src/broker/portable-bootstrap.mjs',
      '    await assertSelectedRuntime({ previousObservation: runtime, ...context });',
      'bootstrap-final-runtime',
    ],
    [
      'src/broker/portable-service.mjs',
      '  const bootstrap = await assertPortableBrokerBootstrap(input.bootstrap);',
      'service-bootstrap',
    ],
    [
      'src/broker/portable-service.mjs',
      '  const operations = await initializePortableOperations(context);',
      'service-operations',
    ],
    [
      'src/broker/portable-service.mjs',
      '  const owner = await preparePortableOwner({',
      'service-owner-prepare',
    ],
    [
      'src/broker/portable-service.mjs',
      '  const runtime = await assertSelectedRuntime(context);',
      'service-owner-prepared',
    ],
    ['src/broker/portable-service.mjs', '  const run = service.startBroker({', 'service-start'],
    [
      'src/broker/service-core.mjs',
      '          await server.start(serializedDispatch);',
      'server-start',
    ],
    ['src/broker/service-core.mjs', '          await owner.publish?.();', 'owner-publish'],
    ['src/broker/service-core.mjs', '      starting = false;', 'service-published'],
  ];
  for (const [module, marker, stage] of sites) {
    if (!declared.has(module)) continue; // The isolated privacy probe has only errors.mjs.
    const lines = readFileSync(path.join(installed, module), 'utf8').split('\n');
    const lineNumber = lines.indexOf(marker);
    if (lineNumber < 0) throw Error('diagnostic-site-unavailable');
    const result = await post('Debugger.setBreakpointByUrl', {
      url: pathToFileURL(path.join(installed, module)).href,
      lineNumber,
    });
    stages.set(result.breakpointId, stage);
  }
  process.once('exit', () => {
    flush();
    session.disconnect();
  });
}
