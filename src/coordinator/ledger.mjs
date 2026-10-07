// @story #136
import { performCurrentOperationEffect } from '../startup/authority-fence.mjs';
import { createCoordinatorLedgerOperations } from './ledger-core.mjs';
const operations = createCoordinatorLedgerOperations({ performCurrentOperationEffect });
export const {
  reserveWakeOperation,
  readWakeOperation,
  wakeOperationExists,
  allWakeOperations,
  latestWakeOperation,
  appendWakeOutcome,
} = operations;
