import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createProductionReviewWorker } from '../../src/broker/worker-factory.mjs';

export function recoveryWorkerFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-recovery-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let observedState = 'awaiting-reviewer';
  const registration = {
    review_id: 'review-recovery',
    project_root: root,
    project_digest: 'a'.repeat(64),
    workspace: path.join(root, '.scratch', 'peer-review', 'review-recovery'),
    request_digest: 'b'.repeat(64),
    runtime: { digest: `sha256:${'c'.repeat(64)}` },
  };
  const file = path.join(
    root,
    '.scratch',
    'peer-review',
    'broker',
    'recovery',
    'review-recovery.json'
  );
  const providerForbidden = () => {
    throw new Error('Recovery-only restoration must not call a provider');
  };
  return {
    registration,
    file,
    bytes: () => readFileSync(file, 'utf8'),
    write: (bytes) => writeFileSync(file, bytes),
    setState: (state) => {
      observedState = state;
    },
    makeWorker: (clock) =>
      createProductionReviewWorker({
        registration,
        project: { physicalRoot: root, digest: registration.project_digest },
        runtimeImage: registration.runtime,
        owner: { verify: () => true },
        platform: { userId: () => 'fixture-user' },
        clock,
        verifyImage: () => true,
        inspect: () => ({
          state: {
            protocol: {
              review_id: registration.review_id,
              startup: {
                runtime: {
                  ownership: 'broker',
                  project_root_digest: registration.project_digest,
                  transport_mode: 'manual',
                },
              },
            },
          },
        }),
        startup: () => ({
          journal: {
            request_digest: registration.request_digest,
            stage: 'manual',
            runtime: registration.runtime,
          },
          recovery: { fenced: false, suspending: false },
        }),
        inspectStatus: () => ({ state: observedState }),
        adapters: new Map(),
        openBinding: providerForbidden,
        openSession: providerForbidden,
        acquireResource: providerForbidden,
        coordinator: providerForbidden,
      }),
  };
}
