import path from 'node:path';
// @story #136
import * as authority from '../startup/authority-fence.mjs';
import { createProtocolService } from './service-core.mjs';
let service;
export function canonicalProjection(...args) {
  service ??= createProtocolService(authority);
  return service.canonicalProjection(...args);
}
export function sealNoCommitHandoff(input) {
  const context = (input?.review?.protocol ?? input?.review)?.startup?.context;
  return authority.withOperationAuthority(
    { operation: 'protocol.snapshot', cwd: context?.repository_root, reviewContext: context },
    (fence) => {
      service ??= createProtocolService(authority);
      return authority.performOperationEffect(fence, () => service.sealNoCommitHandoff(input));
    }
  );
}
export function writeDeliveryReceiptExclusive(file, delivery) {
  return authority.withOperationAuthority(
    { operation: 'protocol.delivery-receipt', cwd: path.dirname(file) },
    (fence) => {
      service ??= createProtocolService(authority);
      return authority.performOperationEffect(fence, () =>
        service.writeDeliveryReceiptExclusive(file, delivery)
      );
    }
  );
}
export function readReview(...args) {
  service ??= createProtocolService(authority);
  return service.readReview(...args);
}
export function repairReview(...args) {
  service ??= createProtocolService(authority);
  return service.repairReview(...args);
}
export function inspectReview(...args) {
  service ??= createProtocolService(authority);
  return service.inspectReview(...args);
}
export function inspectReviewAuthority(...args) {
  service ??= createProtocolService(authority);
  return service.inspectReviewAuthority(...args);
}
export function inspectReviewerExecutionAuthority(...args) {
  service ??= createProtocolService(authority);
  return service.inspectReviewerExecutionAuthority(...args);
}
export function reclaimReviewLock(...args) {
  service ??= createProtocolService(authority);
  return service.reclaimReviewLock(...args);
}
export function statusReview(...args) {
  service ??= createProtocolService(authority);
  return service.statusReview(...args);
}
export function initializeReview(...args) {
  service ??= createProtocolService(authority);
  return service.initializeReview(...args);
}
export function mutateReview(...args) {
  service ??= createProtocolService(authority);
  return service.mutateReview(...args);
}
export function mutateReviewBatch(...args) {
  service ??= createProtocolService(authority);
  return service.mutateReviewBatch(...args);
}
export function mutateProtectedReview(...args) {
  service ??= createProtocolService(authority);
  return service.mutateProtectedReview(...args);
}
