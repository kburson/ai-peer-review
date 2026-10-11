// @story #198
// Diagnostic data only. These classifications never mint runtime capabilities.
export function createProbeMeasurement({ limit = 4096 } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 4096) throw Error('measurement-limit');
  const guards = new WeakMap(),
    contexts = new WeakMap(),
    tokens = new WeakMap(),
    checks = new WeakMap();
  const calls = [],
    active = new Set(),
    waitingChecks = new Set();
  let guardSequence = 0,
    contextSequence = 0,
    total = 0,
    pending = null,
    truncated = false;
  const kinds = new Set(['observe', 'provision', 'replacement', 'principal', 'other']);
  function begin({ signal, kind = 'other' } = {}) {
    total++;
    pending = null;
    for (const item of waitingChecks) item.record.ambiguous = true;
    const token = {};
    if (calls.length >= limit) {
      truncated = true;
      return token;
    }
    let context = null;
    if (signal instanceof AbortSignal) {
      if (!contexts.has(signal)) contexts.set(signal, ++contextSequence);
      context = contexts.get(signal);
    }
    const record = {
      id: total,
      kind: kinds.has(kind) ? kind : 'other',
      context,
      guard: null,
      elapsedMs: 0,
      success: false,
      category: 'outside',
      ambiguous: active.size > 0 || waitingChecks.size > 0,
    };
    for (const item of active) item.ambiguous = true;
    calls.push(record);
    active.add(record);
    tokens.set(token, record);
    return token;
  }
  function setKind(token, kind) {
    const record = tokens.get(token);
    if (record && active.has(record) && kinds.has(kind)) record.kind = kind;
  }
  function complete(token, { success = false, elapsedMs = 0 } = {}) {
    const record = tokens.get(token);
    if (!record || !active.delete(record)) return;
    record.success = success === true;
    record.elapsedMs = Number.isSafeInteger(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0;
    pending =
      !record.ambiguous &&
      !active.size &&
      record.kind === 'observe' &&
      record.success &&
      record.context
        ? record
        : null;
  }
  function registerGuard(handle) {
    // Observations made before the retained guard exists stay one-shot.
    pending = null;
    if (!handle || handle.constructor?.name !== 'FileHandle' || handle.fd < 0) return;
    if (!guards.has(handle))
      guards.set(handle, { id: ++guardSequence, closed: false, seen: new Set() });
  }
  function beginGuardCheck(handle) {
    const record = pending;
    pending = null;
    const guard = guards.get(handle);
    const token = {};
    if (record && guard && !guard.closed && !active.size && !truncated) {
      const check = { record, guard };
      checks.set(token, check);
      waitingChecks.add(check);
    }
    return token;
  }
  function completeGuardCheck(token, { success = false } = {}) {
    const check = checks.get(token);
    if (!check || !waitingChecks.delete(check)) return;
    const { record, guard } = check;
    if (record.ambiguous || guard.closed || !success || active.size || truncated) return;
    record.guard = guard.id;
    record.category = guard.seen.has(record.context) ? 'removable' : 'first';
    guard.seen.add(record.context);
  }
  function checkGuard(handle, result) {
    completeGuardCheck(beginGuardCheck(handle), result);
  }
  function closeGuard(handle) {
    const guard = guards.get(handle);
    if (guard) guard.closed = true;
    pending = null;
  }
  function report({ elapsedMs = 0 } = {}) {
    const projected = calls.map(({ id, kind, context, guard, elapsedMs, success, category }) => ({
      id,
      kind,
      context,
      guard: truncated ? null : guard,
      elapsedMs,
      success,
      category: truncated ? 'outside' : category,
    }));
    const first = projected.filter((c) => c.category === 'first').length;
    const removable = projected.filter((c) => c.category === 'removable').length;
    const elapsed = Number.isSafeInteger(elapsedMs) && elapsedMs >= 0 ? elapsedMs : 0;
    return {
      verified: false,
      operationalAuthority: 'unavailable',
      calls: projected,
      counts: { total, first, removable, outside: total - first - removable },
      truncated,
      dropped: total - calls.length,
      originalBudgetMs: 30000,
      elapsedMs: elapsed,
      residualStarts: total - removable,
      guaranteedSavedMs: 0,
      requiredSavingPerRepeatMs: removable
        ? Math.ceil(Math.max(0, elapsed - 30000) / removable)
        : null,
      decision: 'insufficient-evidence',
    };
  }
  return {
    begin,
    setKind,
    complete,
    registerGuard,
    beginGuardCheck,
    completeGuardCheck,
    checkGuard,
    closeGuard,
    report,
  };
}
