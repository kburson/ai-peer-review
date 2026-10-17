// @story #212
// Native project gate: explicit #190 POSIX deferral, all-platform proof elsewhere.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { resolveVerificationScope } from './verification-scope.mjs';
import { verifyCloudReceipts } from './verify-receipts.mjs';

export function projectReceiptScope(branch) {
  return resolveVerificationScope({ eventName: 'push', branch });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('usage: verify-project-receipts');
  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  console.log(JSON.stringify(verifyCloudReceipts({ scope: projectReceiptScope(branch) }), null, 2));
}
