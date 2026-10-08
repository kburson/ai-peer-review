// cspell:ignore hidepid
// @story #170
// Runs only in a fresh mount namespace on an expressly permitted CI worker.
import { execFileSync } from 'node:child_process';
import { readFileSync, readlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [installation, parentNamespace] = process.argv.slice(2);
let mounted = false;
try {
  const childNamespace = readlinkSync('/proc/self/ns/mnt');
  if (!/^mnt:\[[0-9]+\]$/u.test(parentNamespace ?? '') || childNamespace === parentNamespace)
    throw Error('source-error-namespace-unproved');
  const status = readFileSync('/proc/self/status', 'utf8');
  const effective = status.match(/^CapEff:\s*([a-f0-9]+)$/mu)?.[1];
  if (!effective || (BigInt('0x' + effective) & (1n << 21n)) === 0n)
    throw Error('source-error-privilege-unproved');
  execFileSync('/usr/bin/mount', ['-t', 'proc', '-o', 'hidepid=2', 'proc', '/proc'], {
    stdio: 'pipe',
  });
  mounted = true;
  const identity = await import(
    pathToFileURL(path.join(installation, 'src/protocol/process-identity.mjs')).href
  );
  const context = { signal: new AbortController().signal, deadline: performance.now() + 10000 };
  const probe = await identity.observeProcessSourceContext(context);
  const result = await identity.observeProcessIdentityCore({
    pid: process.pid,
    platform: 'linux',
    hostname: 'isolated-control',
    probeObservation: probe,
    ...context,
  });
  if (probe !== null || result.status !== 'unknown' || result.reason !== 'probe-unclassified')
    throw Error('source-error-visibility-control-failed');
  execFileSync('/usr/bin/umount', ['/proc'], { stdio: 'pipe' });
  mounted = false;
  if (readlinkSync('/proc/self/ns/mnt') !== childNamespace)
    throw Error('source-error-restoration-unproved');
  const restored = await identity.observeProcessSourceContext(context);
  if (!restored) throw Error('source-error-restoration-unproved');
  console.log(
    JSON.stringify({
      schema: 'ai-peer-review.process-source-error-control/v1',
      status: 'unknown',
      reason: 'probe-unclassified',
      privilege: 'cap-sys-admin',
      parentNamespace,
      childNamespace,
      restored: true,
    })
  );
} catch (error) {
  if (mounted) {
    try {
      execFileSync('/usr/bin/umount', ['/proc'], { stdio: 'pipe' });
    } catch {
      console.error('source-error-restoration-unproved');
      process.exitCode = 1;
    }
  }
  console.error(error.message);
  process.exitCode = 1;
}
