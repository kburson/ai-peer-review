// @story #209
// Unverified external-process scheduling only; this fixture never supplies source proof.
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
if (['gh', 'gh.exe'].includes(path.basename(process.execPath))) {
  const directory = process.env.APR_CONTRACT_TIMEOUT_FIXTURE;
  const file = path.join(directory, 'calls.json');
  const calls = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
  calls.push({
    mode: process.env.APR_CONTRACT_TIMEOUT_MODE,
    args: process.argv.slice(2),
    explicitCredential: process.env.GH_TOKEN === 'unverified-timeout-fixture',
    fixedHost: process.env.GH_HOST === 'github.com',
  });
  fs.writeFileSync(file, JSON.stringify(calls));
  const mode = process.env.APR_CONTRACT_TIMEOUT_MODE;
  if (mode === 'partial') process.stdout.write('unverified partial bytes');
  if (mode === 'http-error') process.stderr.write('HTTP 401 unverified fixture refusal');
  if (mode === 'malformed') {
    process.stdout.write('unverified malformed bytes');
    process.exit(0);
  }
  if (mode === 'wrong-repository') {
    process.stdout.write('{"full_name":"unverified/foreign","id":1}');
    process.exit(0);
  }
  if (mode === 'wrong-signal') process.kill(process.pid, 'SIGKILL');
  if (mode === 'overflow') {
    process.stdout.write(Buffer.alloc(33 * 1024 * 1024, 120));
    await setTimeout(40000);
  }
  if (mode === 'silent-first' && calls.length === 1) await setTimeout(12000);
  if (mode === 'always-pending') await setTimeout(40000);
  if (['partial', 'http-error'].includes(mode)) await setTimeout(12000);
  process.exit(9);
} else if (process.env.APR_CONTRACT_TIMEOUT_FIXTURE) {
  const original = childProcess.execFileSync;
  childProcess.execFileSync = function (...args) {
    if (args[0] === 'gh' && args[1]?.[0] === 'api') {
      const file = path.join(process.env.APR_CONTRACT_TIMEOUT_FIXTURE, 'attempts.json');
      const attempts = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
      const item = {
        args: args[1],
        explicitCredential: args[2]?.env?.GH_TOKEN === 'unverified-timeout-fixture',
        fixedHost: args[2]?.env?.GH_HOST === 'github.com',
        timeout: args[2]?.timeout,
      };
      attempts.push(item);
      fs.writeFileSync(file, JSON.stringify(attempts));
      try {
        const result = original.apply(this, args);
        item.returned = true;
        item.stdoutEmpty = result.length === 0;
        try {
          const value = JSON.parse(result);
          item.jsonObject = value !== null && typeof value === 'object' && !Array.isArray(value);
        } catch {
          item.jsonObject = false;
        }
        fs.writeFileSync(file, JSON.stringify(attempts));
        return result;
      } catch (error) {
        item.code = error.code ?? null;
        item.signal = error.signal ?? null;
        item.status = error.status ?? null;
        item.stdoutEmpty = error.stdout?.length === 0;
        item.stderrEmpty = error.stderr?.length === 0;
        fs.writeFileSync(file, JSON.stringify(attempts));
        throw error;
      }
    }
    return original.apply(this, args);
  };
  syncBuiltinESMExports();
}
