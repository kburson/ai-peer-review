// @story #136
import { createCoordinatorLedgerOperations } from '../../src/coordinator/ledger-core.mjs';
export const {
  reserveWakeOperation,
  readWakeOperation,
  wakeOperationExists,
  allWakeOperations,
  latestWakeOperation,
  appendWakeOutcome,
} = createCoordinatorLedgerOperations({
  performCurrentOperationEffect: (operation) => operation(),
});
