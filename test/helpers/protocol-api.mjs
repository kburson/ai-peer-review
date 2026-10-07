// @story #136
// Explicit inert source protocol fixture: this core never launches providers.
import { createProtocolService } from '../../src/protocol/service-core.mjs';
const noop = () => Object.freeze({ fixture: true });
const api = createProtocolService({
  assertOperationAuthority: async () => noop(),
  revalidateOperationAuthority: async () => noop(),
  assertOperationAuthorityNow: noop,
  performOperationEffect: (_fence, operation) => operation(),
});
export const {
  canonicalProjection,
  sealNoCommitHandoff,
  writeDeliveryReceiptExclusive,
  readReview,
  repairReview,
  inspectReview,
  inspectReviewAuthority,
  inspectReviewerExecutionAuthority,
  reclaimReviewLock,
  statusReview,
  initializeReview,
  mutateReview,
  mutateReviewBatch,
  mutateProtectedReview,
} = api;
