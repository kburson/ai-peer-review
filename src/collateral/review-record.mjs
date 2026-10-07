// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
import { createReviewRecordOperations } from './review-record-core.mjs';
const operations = createReviewRecordOperations({ performCurrentOperationEffect });
export const { planReviewRecord, renderReviewHistory } = operations;
export function applyReviewRecord(plan, options) {
  return withOperationAuthority({ operation: 'record.apply', cwd: plan?.repository_root }, () =>
    performCurrentOperationEffect(() => operations.applyReviewRecord(plan, options))
  );
}
