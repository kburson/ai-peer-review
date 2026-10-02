// @story #136
import { createProductionWorkerOperations } from '../../src/broker/worker-factory-core.mjs';
import { runCoordinator } from './coordinator-service-api.mjs';
import { reconcileReviewerLaunch } from './broker-launch-api.mjs';
const operations = createProductionWorkerOperations({
  performCurrentOperationEffect: (operation) => operation(),
});
export function createProductionReviewWorker(input = {}) {
  return operations.createProductionReviewWorker({
    coordinator: runCoordinator,
    reconcileLaunch: reconcileReviewerLaunch,
    ...input,
  });
}
