// @story #136
import { createReviewRecordOperations } from '../../src/collateral/review-record-core.mjs';
const operations = createReviewRecordOperations({
  performCurrentOperationEffect: (effect) => effect(),
});
export const { planReviewRecord, renderReviewHistory, applyReviewRecord } = operations;
