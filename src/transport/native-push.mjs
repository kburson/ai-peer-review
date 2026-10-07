// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
import { createNativePushOperations } from './native-push-core.mjs';
export const { createNativePushTransport } = createNativePushOperations({
  withOperationAuthority,
  performCurrentOperationEffect,
});
