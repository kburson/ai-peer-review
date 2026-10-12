// @story #190
// Worker thread avoids same-thread debugger deadlock. Raw inspector/heap data
// stays private and is never written; one snapshot binds genuine signal identity.
import { Session } from 'node:inspector/promises';
import { parentPort, workerData } from 'node:worker_threads';
if (!parentPort) throw Error('selection-attribution-worker-required');
parentPort.on('message', () => {});
const session = new Session();
session.connectToMainThread();
const ids = new Map(),
  breakpoints = new Map(),
  observations = [];
let finished = false;
async function finish() {
  if (finished) return;
  finished = true;
  await session.post('Debugger.disable');
  await session.post('HeapProfiler.stopTrackingHeapObjects');
  session.disconnect();
  parentPort.postMessage({ kind: 'report', unavailable, observations });
  parentPort.close();
}
let sequence = 0,
  snapshotTaken = false,
  unavailable = 0;
async function properties(objectId) {
  return (await session.post('Runtime.getProperties', { objectId, ownProperties: true })).result;
}
async function contextOf(frame, variable) {
  for (const scope of frame.scopeChain) {
    const fields = await properties(scope.object.objectId);
    const value = fields.find((field) => field.name === variable)?.value;
    if (!value?.objectId) continue;
    const context = await properties(value.objectId);
    const signal = context.find((field) => field.name === 'signal')?.value;
    const deadline = context.find((field) => field.name === 'deadline')?.value;
    if (
      signal?.className !== 'AbortSignal' ||
      !signal.objectId ||
      deadline?.type !== 'number' ||
      !Number.isFinite(deadline.value)
    )
      throw Error('selection-attribution-context-unavailable');
    let { heapSnapshotObjectId: id } = await session.post('HeapProfiler.getHeapObjectId', {
      objectId: signal.objectId,
    });
    if (id === '0' && !snapshotTaken) {
      snapshotTaken = true;
      // Heap chunks are deliberately discarded, never published or persisted.
      await session.post('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
      ({ heapSnapshotObjectId: id } = await session.post('HeapProfiler.getHeapObjectId', {
        objectId: signal.objectId,
      }));
    }
    if (!/^[1-9][0-9]*$/.test(id)) throw Error('selection-attribution-signal-unavailable');
    const key = id + ':' + deadline.value;
    if (!ids.has(key)) ids.set(key, ++sequence);
    return ids.get(key);
  }
  throw Error('selection-attribution-context-unavailable');
}
session.on('Debugger.paused', async ({ params }) => {
  try {
    const target = params.hitBreakpoints.map((id) => breakpoints.get(id)).find(Boolean);
    if (target?.kind === 'complete') {
      await finish();
      return;
    }
    if (!target || observations.length >= 4096)
      throw Error('selection-attribution-frame-unavailable');
    const context = await contextOf(params.callFrames[0], target.variable);
    const known = ['assertSelected', 'read', 'register', 'location'];
    const caller = params.callFrames
      .slice(1)
      .map((frame) => frame.functionName)
      .find((name) => known.includes(name));
    observations.push({
      kind: target.kind,
      context,
      caller: target.kind === 'original' ? 'original' : (caller ?? 'fixture'),
    });
  } catch {
    unavailable++;
  } finally {
    if (!finished) await session.post('Debugger.resume');
  }
});
await session.post('HeapProfiler.enable');
await session.post('HeapProfiler.startTrackingHeapObjects', { trackAllocations: false });
await session.post('Debugger.enable');
for (const target of workerData.targets) {
  const { breakpointId } = await session.post('Debugger.setBreakpointByUrl', {
    url: target.url,
    lineNumber: target.lineNumber,
  });
  breakpoints.set(breakpointId, target);
}
parentPort.on('message', async (message) => {
  if (message !== 'stop') return;
  await finish();
});
parentPort.postMessage({ kind: 'ready' });
