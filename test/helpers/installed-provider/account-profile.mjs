// Explicit test-only OS-account substitution. Authentication environment stays intact.
import os from 'node:os';
import { syncBuiltinESMExports } from 'node:module';
const originalUserInfo = os.userInfo;
if (process.env.APR_FIXTURE_ACCOUNT_HOME) {
  os.userInfo = (options) => ({
    ...originalUserInfo(options),
    homedir: process.env.APR_FIXTURE_ACCOUNT_HOME,
  });
  syncBuiltinESMExports();
}
