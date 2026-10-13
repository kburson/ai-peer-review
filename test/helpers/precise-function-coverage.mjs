// @story #190
// Diagnostic engine metadata only; no source edits or operational authority.
import { Session } from 'node:inspector';

export async function startPreciseFunctionCoverage() {
  const session = new Session();
  session.connect();
  const post = (method, params = {}) =>
    new Promise((resolve, reject) =>
      session.post(method, params, (error, result) => (error ? reject(error) : resolve(result)))
    );
  try {
    await post('Profiler.enable');
    await post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
  } catch (error) {
    session.disconnect();
    throw error;
  }
  let finished = false;
  return Object.freeze({
    async finish() {
      if (finished) throw Error('precise-coverage-already-finished');
      finished = true;
      try {
        const observed = await post('Profiler.takePreciseCoverage');
        await post('Profiler.stopPreciseCoverage');
        return { result: observed.result };
      } finally {
        session.disconnect();
      }
    },
  });
}
