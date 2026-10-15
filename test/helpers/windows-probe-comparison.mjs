// @story #209
// Diagnostic only: compare fresh real native observations; never issue authority.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { provisionProtectedRoot, openProtectedRoot } from '../../src/broker/storage-protection.mjs';
const context = () => ({
  signal: new AbortController().signal,
  deadline: performance.now() + 30000,
});
let root;
try {
  if (process.platform !== 'win32') throw Error('windows-required');
  const executable = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  assert.equal(fs.lstatSync(executable).isFile(), true);
  assert.equal(fs.realpathSync(executable).toLowerCase(), executable.toLowerCase());
  const source = fs.readFileSync(
    new URL('../../src/broker/storage-protection.mjs', import.meta.url),
    'utf8'
  );
  const marker = 'const windowsScript = String.raw`';
  const start = source.indexOf(marker) + marker.length;
  const end = source.indexOf('\n`;', start);
  assert.ok(start >= marker.length && end > start);
  const baseline = source.slice(start, end);
  let candidate = baseline;
  for (const [before, after] of [
    [
      "[Reflection.Assembly]::Load('System.Web.Extensions, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35') | Out-Null",
      "$null = [Reflection.Assembly]::Load('System.Web.Extensions, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35')",
    ],
    [
      '$member = @($identity.Groups | ForEach-Object { $_.Value }) -contains $adminSid.Value',
      '$member = $identity.Groups.Contains($adminSid)',
    ],
  ]) {
    assert.equal(candidate.split(before).length, 2);
    candidate = candidate.replace(before, after);
  }
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'apr-probe-comparison-')));
  const original = context();
  const receipt = await provisionProtectedRoot({ root, ...original });
  const guard = await openProtectedRoot({ receipt, ...original });
  try {
    await guard.writeExclusive('sample.json', Buffer.from('{"diagnostic":true}\n'));
  } finally {
    await guard.close();
  }
  const input = JSON.stringify({ mode: 'observe', paths: [root, path.join(root, 'sample.json')] });
  function observe(script) {
    const started = performance.now();
    const bytes = execFileSync(
      executable,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64'),
      ],
      {
        input,
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 1048576,
        windowsHide: true,
        env: {
          ...process.env,
          PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    return {
      elapsedMs: Math.round(performance.now() - started),
      value: JSON.parse(bytes.replace(/^\uFEFF/, '').trim()),
    };
  }
  const pairs = [];
  for (let index = 0; index < 12; index += 1) {
    const first = observe(index % 2 ? candidate : baseline);
    const second = observe(index % 2 ? baseline : candidate);
    assert.deepEqual(first.value, second.value);
    assert.equal(first.value.schema, 'ai-peer-review.windows-protection-observation/v1');
    assert.equal(first.value.records.length, 2);
    pairs.push({
      baselineMs: (index % 2 ? second : first).elapsedMs,
      candidateMs: (index % 2 ? first : second).elapsedMs,
    });
  }
  console.log(
    JSON.stringify({
      verified: false,
      operationalAuthority: 'unavailable',
      outputsEqual: true,
      pairs,
    })
  );
} catch {
  console.error(
    JSON.stringify({
      verified: false,
      operationalAuthority: 'unavailable',
      reason: 'comparison-incomplete',
    })
  );
  process.exitCode = 1;
} finally {
  if (root)
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      console.error(
        JSON.stringify({
          verified: false,
          operationalAuthority: 'unavailable',
          reason: 'cleanup-incomplete',
        })
      );
      process.exitCode = 1;
    }
}
