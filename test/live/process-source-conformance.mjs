#!/usr/bin/env node
// @story #170
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  packProcessSourceCandidate,
  bindProcessSourceCandidate,
} from './process-source/package.mjs';

import { verifyRegisteredProcessSources } from './process-source/verify.mjs';
import {
  reviewProcessSourceClasses,
  verifyProposedSourceClass,
} from './process-source/class-review.mjs';
import { captureRegisteredAbsence, captureRegisteredCreation } from './process-source/capture.mjs';

export async function runProcessSourceConformance(options = {}) {
  if (!options || Object.getPrototypeOf(options) !== Object.prototype)
    throw Error('driver-options');
  if (options.mode === 'pack' && Object.keys(options).every((k) => ['mode', 'output'].includes(k)))
    return packProcessSourceCandidate(options);
  if (
    options.mode === 'bind' &&
    Object.keys(options).every((k) => ['mode', 'packagePath', 'binding'].includes(k))
  )
    return bindProcessSourceCandidate(options);
  if (
    ['capture-absence', 'capture'].includes(options.mode) &&
    Object.keys(options).every((key) =>
      ['mode', 'binding', 'registrationIndex', 'approvedRef', 'output'].includes(key)
    )
  )
    return (options.mode === 'capture' ? captureRegisteredCreation : captureRegisteredAbsence)(
      options
    );
  if (
    options.mode === 'verify' &&
    Object.keys(options).every((key) =>
      [
        'mode',
        'receipt',
        'receiptRoot',
        'registrationIndex',
        'approvedRef',
        'packageReceipt',
      ].includes(key)
    )
  )
    return verifyRegisteredProcessSources(options);
  if (
    options.mode === 'review-class' &&
    Object.keys(options).every((k) =>
      ['mode', 'receiptRoot', 'registrationIndex', 'approvedRef', 'output'].includes(k)
    )
  )
    return reviewProcessSourceClasses(options);
  if (
    options.mode === 'verify-class' &&
    Object.keys(options).every((k) =>
      [
        'mode',
        'receiptRoot',
        'registrationIndex',
        'approvedRef',
        'classFile',
        'packagePath',
        'installation',
      ].includes(k)
    )
  )
    return verifyProposedSourceClass(options);
  throw Error('driver-mode-unavailable');
}
function args(values) {
  const [mode, ...rest] = values;
  const result = { mode };
  const names =
    mode === 'pack'
      ? { '--output': 'output' }
      : mode === 'bind'
        ? { '--package': 'packagePath', '--binding': 'binding' }
        : ['capture-absence', 'capture'].includes(mode)
          ? {
              '--binding': 'binding',
              '--registration-index': 'registrationIndex',
              '--approved-ref': 'approvedRef',
              '--output': 'output',
            }
          : mode === 'verify'
            ? {
                '--receipt': 'receipt',
                '--receipt-root': 'receiptRoot',
                '--registration-index': 'registrationIndex',
                '--approved-ref': 'approvedRef',
                '--package-receipt': 'packageReceipt',
              }
            : mode === 'review-class'
              ? {
                  '--receipt-root': 'receiptRoot',
                  '--registration-index': 'registrationIndex',
                  '--approved-ref': 'approvedRef',
                  '--output': 'output',
                }
              : mode === 'verify-class'
                ? {
                    '--receipt-root': 'receiptRoot',
                    '--registration-index': 'registrationIndex',
                    '--approved-ref': 'approvedRef',
                    '--class': 'classFile',
                    '--package': 'packagePath',
                    '--installation': 'installation',
                  }
                : {};
  for (let i = 0; i < rest.length; i += 2) {
    const name = names[rest[i]],
      value = rest[i + 1];
    if (!name || !value || value.startsWith('--') || Object.hasOwn(result, name))
      throw Error('driver-arguments');
    result[name] = value;
  }
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await runProcessSourceConformance(args(process.argv.slice(2)))));
  } catch (error) {
    const reason = error.details?.reason;
    const suffix =
      typeof reason === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(reason) ? ': ' + reason : '';
    console.error((error.code ?? error.message) + suffix);
    process.exitCode = 1;
  }
}
