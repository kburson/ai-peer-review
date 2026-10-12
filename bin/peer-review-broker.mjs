#!/usr/bin/env node
// @story #189
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AprError } from '../src/errors.mjs';
import { assertBrokerTransport } from '../src/broker/broker-protocol.mjs';
import {
  readPortableBrokerBootstrap,
  closePortableBrokerBootstrap,
} from '../src/broker/portable-bootstrap.mjs';
import { startPortableBrokerService } from '../src/broker/portable-service.mjs';
import {
  withOperationAuthority,
  currentOperationAuthorityContext,
} from '../src/startup/authority-fence.mjs';

const diagnosticReasons = new Set([
  'bootstrap-budget-unproved',
  'bootstrap-generation-changed',
  'bootstrap-locator-changed',
  'bootstrap-file-missing',
  'executing-bootstrap-provenance-required',
  'bootstrap-executing-runtime-changed',
  'bootstrap-project-changed',
  'bootstrap-cleanup-unproved',
  'source-class-unavailable',
  'root-protection-changed',
  'private-file-unproved',
  'operation-deadline',
  'operation-aborted',
  'service-startup-context-mismatch',
  'service-project-changed',
  'another-owner-already-live',
  'prepared-cleanup-owner-unproved',
  'owner-operation-not-admitted',
  'owner-guard-budget-mismatch',
  'operation-budget-unproved',
  'protected-snapshot-changed',
  'snapshot-ancestor-changed',
  'genuine-protected-snapshot-required',
  'credential-observation-budget-mismatch',
  'credential-observation-busy',
  'credential-observation-changed',
  'credential-observation-options-invalid',
  'credential-observation-unavailable',
  'credential-publication-invalid',
  'genuine-mutation-snapshot-required',
  'genuine-private-guard-required',
  'genuine-protected-guard-required',
  'genuine-quarantine-receipt-required',
  'lease-budget-mismatch',
  'mutation-release-unproved',
  'mutation-resource-busy',
  'operation-clock-unproved',
  'owned-publication-busy',
  'owned-publication-changed',
  'owned-publication-fenced',
  'owned-publication-generation-changed',
  'owned-publication-retired',
  'owned-withdrawal-unproved',
  'private-bytes-changed',
  'private-file-changed',
  'private-generation-changed',
  'private-read-bound-changed',
  'protected-root-closed',
  'publication-budget-mismatch',
  'quarantine-destination-occupied',
  'quarantine-generation-changed',
  'retired-publication-generation-changed',
  'root-descriptor-changed',
  'slot-count-unproved',
  'stock-replacement-unconfirmed',
]);
export function brokerStartupDiagnostic(error) {
  const reasons = [],
    seen = new Set();
  let current = error;
  for (let depth = 0; current && depth < 4 && !seen.has(current); depth++) {
    seen.add(current);
    const reason = current.details?.reason;
    if (diagnosticReasons.has(reason) && !reasons.includes(reason)) reasons.push(reason);
    current = current.cause;
  }
  return {
    schema: 'ai-peer-review.broker-startup-diagnostic/v1',
    verified: false,
    code:
      typeof error?.code === 'string' && /^APR_[A-Z_]{1,64}$/u.test(error.code)
        ? error.code
        : 'APR_BROKER_START_FAILED',
    reasons,
  };
}

export async function runBrokerEntrypoint(file, options = {}) {
  assertBrokerTransport(options.transport ?? 'portable');
  if (Object.keys(options).some((key) => key !== 'transport'))
    throw new AprError('APR_BROKER_PROTOCOL', 'Broker entry options are unsupported.', {
      recovery: 'Create a fresh protected bootstrap through the selected portable package.',
    });
  if (
    typeof file !== 'string' ||
    !path.isAbsolute(file) ||
    path.normalize(file) !== file ||
    !/^bootstrap-[a-f0-9-]+\.json$/u.test(path.basename(file))
  )
    throw new AprError('APR_BROKER_START_FAILED', 'Broker bootstrap path is unproved.', {
      recovery: 'Create a fresh protected bootstrap through the selected portable package.',
    });
  const directory = path.dirname(file);
  const cwd = path.dirname(path.dirname(path.dirname(directory)));
  if (directory !== path.join(cwd, '.scratch', 'peer-review', 'broker'))
    throw new AprError('APR_BROKER_START_FAILED', 'Broker bootstrap root is unproved.', {
      recovery: 'Create a fresh protected bootstrap through the selected portable package.',
    });
  const run = await withOperationAuthority({ operation: 'broker.start', cwd }, async () => {
    const context = await currentOperationAuthorityContext();
    const bootstrap = await readPortableBrokerBootstrap({ file, ...context });
    try {
      const service = await startPortableBrokerService({ bootstrap });
      await service.ready;
      return { untilStopped: service.untilStopped };
    } finally {
      await closePortableBrokerBootstrap(bootstrap);
    }
  });
  // The startup deadline ends at readiness. Independent authenticated requests
  // and owned cleanup each have their own sealed operation admission.
  return await run.untilStopped;
}

async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1)
    throw new AprError('APR_BROKER_PROTOCOL', 'Expected one absolute bootstrap file.', {
      recovery: 'Create a fresh protected bootstrap through the selected portable package.',
    });
  await runBrokerEntrypoint(argv[0]);
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(JSON.stringify(brokerStartupDiagnostic(error)) + '\n');
    process.stderr.write(
      `${error.code ?? 'APR_BROKER_START_FAILED'}: Portable broker startup or cleanup failed.\n`
    );
    process.exitCode = 1;
  });
}
