#!/usr/bin/env node
// @story #137
import { verifyDeployment } from '../src/installed/verify-deployment.mjs';
try {
  if (process.argv.slice(2).some((arg) => arg !== '--json') || process.argv.length > 3)
    throw new Error('Use verify-deployment [--json].');
  const result = verifyDeployment();
  console.log(
    process.argv.includes('--json')
      ? JSON.stringify(result)
      : 'Verified installed runtime ' +
          result.packageVersion +
          ' at ' +
          result.packageRoot +
          ' (native: ' +
          result.nativeStatus +
          ', inventory: ' +
          result.runtimeInventoryStatus +
          ')'
  );
} catch (error) {
  console.error((error.code ?? 'APR_DEPLOYMENT_INVALID') + ': ' + error.message);
  process.exitCode = 1;
}
