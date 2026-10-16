// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
import { AprError } from '../errors.mjs';
import { createReviewRecordOperations } from './review-record-core.mjs';
const operations = createReviewRecordOperations({ performCurrentOperationEffect });
export const { planReviewRecord, renderReviewHistory } = operations;
export function applyReviewRecord(plan, options) {
  return withOperationAuthority(
    { operation: 'record.apply', cwd: plan?.repository_root },
    async () => {
      if (
        options?.mode === 'normal' ||
        (Array.isArray(plan?.attempts) &&
          plan.attempts.some((attempt) => attempt.commit_mode === 'normal'))
      )
        throw new AprError(
          'APR_LEGACY_REVIEW_READ_ONLY',
          'Git-bound review records are read-only in this local runtime.',
          {
            recovery:
              'Preserve the original records and their compatible tool. No conversion or Git write was performed.',
          }
        );
      return await performCurrentOperationEffect(() => operations.applyReviewRecord(plan, options));
    }
  );
}
