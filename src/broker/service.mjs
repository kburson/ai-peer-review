import { createPortableServiceLifecycleAdmission } from './owner-readiness.mjs';
import { assertBrokerTransport, brokerError } from './broker-protocol.mjs';
import {
  createPreparedPortableBrokerServer,
  isPreparedPortableOwner,
} from './portable-ownership.mjs';
// @story #136
import {
  withOperationAuthority,
  assertCurrentOperationAuthority,
  currentOperationAuthorityContext,
  withPortableBrokerRequestAuthority,
} from '../startup/authority-fence.mjs';
import { reserveReviewerLaunch, settleReservedReviewerLaunch } from './launch.mjs';
import { createBrokerService } from './service-core.mjs';
const service = createBrokerService({
  withOperationAuthority,
  assertCurrentOperationAuthority,
  currentOperationAuthorityContext,
  reserveReviewerLaunch,
  settleReservedReviewerLaunch,
});
const portableServers = new WeakMap();
export function runBroker(...args) {
  return service.runBroker(...args);
}

export const IDLE_MILLISECONDS = service.IDLE_MILLISECONDS;
export function createPortableBrokerServer(input = {}) {
  assertBrokerTransport('portable');
  if (Object.keys(input).join(',') !== 'owner' || !isPreparedPortableOwner(input.owner))
    throw brokerError(
      'APR_BROKER_PROTECTION_UNAVAILABLE',
      'Portable service requires genuine prepared ownership.'
    );
  const server = createPreparedPortableBrokerServer(input);
  const handle = Object.freeze({
    async start(dispatch) {
      await assertCurrentOperationAuthority();
      await server.start((message, admission) => {
        const command = Object.freeze({ ...message });
        return withPortableBrokerRequestAuthority(admission, (request) => {
          if (
            command.id !== request.actionId ||
            command.command !== request.operation ||
            command.workspace !== (request.body.workspace ?? null)
          )
            throw brokerError('APR_BROKER_PROTOCOL', 'Authenticated command binding changed.');
          return dispatch(command);
        });
      });
      await assertCurrentOperationAuthority();
    },
    async close() {
      const context = await currentOperationAuthorityContext();
      await server.close(context);
      await assertCurrentOperationAuthority();
    },
  });
  portableServers.set(handle, server);
  return handle;
}
export function portableBrokerLifecycleAdmission(server, phase) {
  const service = portableServers.get(server);
  if (!service) throw brokerError('APR_BROKER_STALE', 'Genuine portable service is required.');
  return createPortableServiceLifecycleAdmission({ service, phase });
}
