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
    process.stderr.write(
      `${error.code ?? 'APR_BROKER_START_FAILED'}: Portable broker startup or cleanup failed.\n`
    );
    process.exitCode = 1;
  });
}
