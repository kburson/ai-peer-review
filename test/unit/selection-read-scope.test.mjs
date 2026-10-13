// @story #190
import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { existsSync } from 'node:fs';

const file = new URL('../../src/config/selection-read-scope.mjs', import.meta.url);
const api = existsSync(file) ? await import(file) : {};
const context = (ms = 30000) => ({
  signal: new AbortController().signal,
  deadline: performance.now() + ms,
});
const tuple = Object.freeze({
  directory: 'fixture',
  home: 'fixture',
  uid: 0,
  principal: 'fixture',
});
const deferred = () => Promise.withResolvers();
function fixture(finalize = () => {}) {
  assert.equal(typeof api.createSelectionReadScope, 'function', 'missing private scope API');
  const counts = { opens: 0, closes: 0, reads: 0 };
  const manager = api.createSelectionReadScope({ finalize });
  const acquire = async () => {
    counts.opens++;
    return {
      read: async () => ++counts.reads,
      close: async () => {
        counts.closes++;
      },
    };
  };
  return { manager, acquire, counts };
}
// Removing retained acquisition or after-close finalization must break this.
test('one bounded scope retains one guard across sixteen fresh reads and finalizes after close', async () => {
  let finalizations = 0;
  const { manager, acquire, counts } = fixture((original, copied, witness) => {
    assert.equal(original.signal, ctx.signal);
    assert.equal(original.deadline, ctx.deadline);
    assert.deepEqual(copied, tuple);
    assert.equal(witness, 'last-genuine-witness');
    assert.equal(counts.closes, 1);
    finalizations++;
  });
  const ctx = context();
  assert.equal(
    await manager.run(ctx, async () => {
      for (let n = 0; n < 16; n++) {
        const result = await manager.use(ctx, tuple, acquire, (guard) => guard.read());
        assert.deepEqual(result, { borrowed: true, value: n + 1 });
        manager.noteWitness(ctx, 'last-genuine-witness');
      }
      return 'result';
    }),
    'result'
  );
  assert.deepEqual(counts, { opens: 1, closes: 1, reads: 16 });
  assert.equal(finalizations, 1);
  assert.deepEqual(await manager.use(ctx, tuple, acquire, () => {}), { borrowed: false });
  await assert.rejects(manager.run(ctx, async () => {}));
  manager.assertRegistrationAllowed();
});

test('scope rejects excess budgets, nesting and resealing without admitting mismatched contexts', async () => {
  const { manager, acquire, counts } = fixture();
  await assert.rejects(manager.run(context(31000), async () => {}));
  const ctx = context();
  await manager.run(ctx, async () => {
    assert.throws(() => manager.assertRegistrationAllowed());
    await assert.rejects(manager.run(context(), async () => {}));
    const differentSignal = { ...ctx, signal: new AbortController().signal };
    const differentDeadline = { ...ctx, deadline: ctx.deadline - 1 };
    for (const mismatched of [differentSignal, differentDeadline])
      assert.deepEqual(await manager.use(mismatched, tuple, acquire, () => {}), {
        borrowed: false,
      });
  });
  assert.equal(counts.opens, 0);
});
test('lexically inherited continuations remain nested after closure', async () => {
  const { manager } = fixture();
  const fire = deferred(),
    done = deferred();
  await manager.run(context(), async () => {
    fire.promise.then(async () => {
      try {
        await assert.rejects(manager.run(context(), async () => {}));
        done.resolve();
      } catch (error) {
        done.reject(error);
      }
    });
  });
  fire.resolve();
  await done.promise;
});
test('borrowers serialize in FIFO with one acquisition and fresh operations', async () => {
  const { manager, acquire, counts } = fixture();
  const ctx = context(),
    entered = deferred(),
    release = deferred(),
    order = [];
  await manager.run(ctx, async () => {
    const first = manager.use(ctx, tuple, acquire, async () => {
      order.push(0);
      entered.resolve();
      await release.promise;
    });
    await entered.promise;
    const second = manager.use(ctx, tuple, acquire, async () => {
      order.push(1);
    });
    const third = manager.use(ctx, tuple, acquire, async () => {
      order.push(2);
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(order, [0]);
    release.resolve();
    await Promise.all([first, second, third]);
  });
  assert.deepEqual(order, [0, 1, 2]);
  assert.equal(counts.opens, 1);
  assert.equal(counts.closes, 1);
});
test('sixty-fifth pending borrower poisons the scope without admitting overflow', async () => {
  const { manager, acquire, counts } = fixture();
  const ctx = context(),
    entered = deferred(),
    release = deferred();
  const completion = manager.run(ctx, async () => {
    const first = manager.use(ctx, tuple, acquire, async () => {
      entered.resolve();
      await release.promise;
    });
    await entered.promise;
    const pending = Array.from({ length: 64 }, () =>
      manager.use(ctx, tuple, acquire, () => {
        throw new Error('queued call admitted after poison');
      })
    );
    const settled = Promise.allSettled(pending);
    await assert.rejects(manager.use(ctx, tuple, acquire, () => {}));
    release.resolve();
    await first;
    assert.equal(
      (await settled).every((result) => result.status === 'rejected'),
      true
    );
  });
  await assert.rejects(completion);
  assert.equal(counts.opens, 1);
  assert.equal(counts.closes, 1);
});
test('independent siblings own separate guards and closed tombstones do not exhaust live capacity', async () => {
  const { manager, acquire, counts } = fixture();
  const release = deferred();
  const runs = Array.from({ length: 64 }, () => {
    const ctx = context();
    return manager.run(ctx, async () => {
      await manager.use(ctx, tuple, acquire, (guard) => guard.read());
      await release.promise;
    });
  });
  await assert.rejects(manager.run(context(), async () => {}));
  release.resolve();
  await Promise.all(runs);
  assert.equal(counts.opens, 64);
  assert.equal(counts.closes, 64);
  await manager.run(context(), async () => {});
});
for (const replacement of [
  { home: 'other' },
  { uid: 1 },
  { principal: 'other' },
  { directory: 'other' },
]) {
  test(`fresh ${Object.keys(replacement)[0]} mismatch poisons permanently while healthy siblings remain available`, async () => {
    const { manager, acquire, counts } = fixture();
    const ctx = context();
    await assert.rejects(
      manager.run(ctx, async () => {
        await manager.use(ctx, tuple, acquire, (guard) => guard.read());
        await manager.use(ctx, { ...tuple, ...replacement }, acquire, (guard) => guard.read());
      })
    );
    await assert.rejects(manager.use(ctx, tuple, acquire, (guard) => guard.read()));
    await manager.retryCleanup();
    await assert.rejects(manager.run(ctx, async () => {}));
    const other = context();
    await manager.run(other, async () => {
      await manager.use(other, tuple, acquire, (guard) => guard.read());
    });
    assert.deepEqual(counts, { opens: 2, closes: 2, reads: 2 });
  });
}

test('unawaited reads must settle before scope closure and successful completion', async () => {
  const { manager, acquire, counts } = fixture();
  const ctx = context(),
    entered = deferred(),
    release = deferred();
  let completed = false;
  const completion = manager
    .run(ctx, async () => {
      void manager.use(ctx, tuple, acquire, async (guard) => {
        entered.resolve();
        await release.promise;
        return guard.read();
      });
      return 'callback-value';
    })
    .then((value) => {
      completed = true;
      return value;
    });
  await entered.promise;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false);
  assert.equal(counts.closes, 0);
  release.resolve();
  assert.equal(await completion, 'callback-value');
  assert.deepEqual(counts, { opens: 1, closes: 1, reads: 1 });
});
test('deadline expiry retains unawaited acquisition until actual settlement and cleanup', async () => {
  const { manager } = fixture();
  const ctx = context(50),
    acquired = deferred(),
    release = deferred();
  let closes = 0;
  const completion = manager.run(ctx, async () => {
    const pending = manager.use(
      ctx,
      tuple,
      async () => {
        acquired.resolve();
        return release.promise;
      },
      () => {}
    );
    void pending.catch(() => {});
  });
  await acquired.promise;
  await assert.rejects(completion);
  assert.throws(() => manager.assertRegistrationAllowed());
  await assert.rejects(manager.run(context(), async () => {}));
  await assert.rejects(manager.retryCleanup());
  release.resolve({
    close: async () => {
      closes++;
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  await manager.retryCleanup();
  assert.equal(closes, 1);
  manager.assertRegistrationAllowed();
  await assert.rejects(
    manager.use(
      ctx,
      tuple,
      async () => {},
      () => {}
    )
  );
});
test('failed close remains reachable and cleanup cannot revive its poisoned key', async () => {
  const { manager } = fixture();
  const ctx = context();
  let closes = 0;
  await assert.rejects(
    manager.run(ctx, async () => {
      await manager.use(
        ctx,
        tuple,
        async () => ({
          close: async () => {
            if (++closes === 1) throw new Error('private-close');
          },
        }),
        () => 'read'
      );
    })
  );
  assert.throws(() => manager.assertRegistrationAllowed());
  await manager.retryCleanup();
  assert.equal(closes, 2);
  manager.assertRegistrationAllowed();
  await assert.rejects(
    manager.use(
      ctx,
      tuple,
      async () => {},
      () => {}
    )
  );
});
for (const uncertain of [false, true]) {
  test(`post-open failure retains only its genuine cleanup handle: ${uncertain}`, async () => {
    const { manager } = fixture();
    const original = new Error('private-principal');
    let cleaned = 0;
    if (uncertain)
      original.retryCleanup = async () => {
        cleaned++;
      };
    const ctx = context();
    await assert.rejects(
      manager.run(ctx, async () => {
        await manager.use(
          ctx,
          tuple,
          async () => {
            throw original;
          },
          () => {}
        );
      }),
      (error) => error === original
    );
    if (uncertain) assert.throws(() => manager.assertRegistrationAllowed());
    else manager.assertRegistrationAllowed();
    await manager.retryCleanup();
    assert.equal(cleaned, uncertain ? 1 : 0);
    manager.assertRegistrationAllowed();
    await assert.rejects(manager.run(ctx, async () => {}));
  });
}
for (const effect of ['none', 'unknown', 'committed']) {
  test(`post-effect finalizer failure reports bounded ${effect} and preserves the actual result`, async () => {
    const { manager, acquire, counts } = fixture(() => {
      throw new Error('private-final-path');
    });
    const ctx = context(),
      receipt = { path: '/private-receipt', bytes: 'secret' },
      result = { activation: true };
    let failure;
    try {
      await manager.run(ctx, async (sink) => {
        await manager.use(ctx, tuple, acquire, (guard) => guard.read());
        if (effect !== 'none') sink.possible();
        if (effect === 'committed') {
          sink.committed(receipt, result);
          sink.committed(receipt, result);
        }
        return result;
      });
    } catch (error) {
      failure = error;
    }
    assert.ok(failure);
    assert.deepEqual(api.selectionScopeOutcome(failure), {
      effect,
      completion: 'uncertain',
      cleanup: 'discharged',
    });
    assert.deepEqual(counts, { opens: 1, closes: 1, reads: 1 });
    const serialized = JSON.stringify(failure);
    assert.equal(/private|secret|activation|fixture/.test(serialized), false);
    assert.deepEqual(result, { activation: true });
  });
}
test('callback exception identity survives failed close and effect progress never moves backwards', async () => {
  const { manager } = fixture();
  const original = new Error('private-callback'),
    ctx = context(),
    receipt = {},
    result = {};
  await assert.rejects(
    manager.run(ctx, async (sink) => {
      sink.possible();
      sink.possible();
      sink.committed(receipt, result);
      assert.throws(() => sink.possible());
      assert.throws(() => sink.committed({}, result));
      await manager.use(
        ctx,
        tuple,
        async () => ({
          close: async () => {
            throw new Error('private-close');
          },
        }),
        () => {}
      );
      throw original;
    }),
    (error) => error === original
  );
  assert.deepEqual(api.selectionScopeOutcome(original), {
    effect: 'committed',
    completion: 'uncertain',
    cleanup: 'retained',
  });
});

test('a hung callback is bounded and retains its obligation until genuine callback exit', async () => {
  const { manager, acquire, counts } = fixture();
  const ctx = context(50),
    entered = deferred(),
    release = deferred();
  let retainedSink;
  const completion = manager.run(ctx, async (sink) => {
    retainedSink = sink;
    await manager.use(ctx, tuple, acquire, (guard) => guard.read());
    entered.resolve();
    await release.promise;
  });
  await entered.promise;
  const won = await Promise.race([
    completion.then(
      () => 'success',
      () => 'refused'
    ),
    new Promise((resolve) => setTimeout(() => resolve('unbounded'), 100)),
  ]);
  // Always release the private fixture callback, including on the original RED.
  release.resolve();
  await completion.catch(() => {});
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(won, 'refused');
  assert.throws(() => retainedSink.possible());
  await manager.retryCleanup();
  assert.equal(counts.closes, 1);
});
test('actual callback thrown values are preserved even when not Error objects', async () => {
  const { manager } = fixture();
  for (const original of [undefined, null, 'fixture-private-error']) {
    const caught = await manager
      .run(context(), async () => {
        throw original;
      })
      .then(
        () => ({ succeeded: true }),
        (error) => ({ error })
      );
    assert.equal(caught.succeeded, undefined);
    assert.equal(caught.error, original);
  }
});
test('real C1 two-read unit control retains one descriptor with four fresh snapshots', async (t) => {
  const helper = new URL('../helpers/selection-read-scope-fixture.mjs', import.meta.url);
  const prototype = existsSync(helper) ? await import(helper) : {};
  assert.equal(typeof prototype.selectionReadScopePrototype, 'function');
  const result = await prototype.selectionReadScopePrototype(t, 2);
  assert.deepEqual(result, {
    verified: false,
    unscoped: { acquisitions: 2, snapshots: 4, closed: 2 },
    scoped: { acquisitions: 1, snapshots: 4, closed: 1 },
  });
});

test('abort rejects queued borrowers while tracking the running operation until exit', async () => {
  const { manager, acquire, counts } = fixture();
  const controller = new AbortController(),
    ctx = { signal: controller.signal, deadline: performance.now() + 30000 };
  const entered = deferred(),
    release = deferred();
  let first, second;
  const completion = manager.run(ctx, async () => {
    first = manager.use(ctx, tuple, acquire, async () => {
      entered.resolve();
      await release.promise;
    });
    void first.catch(() => {});
    await entered.promise;
    second = manager.use(ctx, tuple, acquire, () => {
      throw new Error('aborted queued admission');
    });
    void second.catch(() => {});
    controller.abort();
  });
  await assert.rejects(completion);
  assert.equal(counts.closes, 0);
  await assert.rejects(manager.retryCleanup());
  release.resolve();
  await Promise.allSettled([first, second]);
  await manager.retryCleanup();
  assert.equal(counts.closes, 1);
});
test('bound event listeners inherit nesting after closure and separate store instances stay independent', async () => {
  const { AsyncResource } = await import('node:async_hooks');
  const { EventEmitter } = await import('node:events');
  const { manager } = fixture(),
    other = fixture(),
    emitter = new EventEmitter(),
    done = deferred(),
    ctx = context();
  await manager.run(ctx, async () => {
    await other.manager.run(ctx, async () => {
      await other.manager.use(ctx, tuple, other.acquire, (guard) => guard.read());
    });
    emitter.once(
      'later',
      AsyncResource.bind(async () => {
        try {
          await assert.rejects(manager.run(context(), async () => {}));
          done.resolve();
        } catch (error) {
          done.reject(error);
        }
      })
    );
  });
  emitter.emit('later');
  await done.promise;
  assert.equal(other.counts.opens, 1);
  assert.equal(other.counts.closes, 1);
});
