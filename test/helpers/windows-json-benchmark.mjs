// @story #190
// cspell:words fsmonitor textconv
// Read-only comparison of the exact stock script; private records never leave this process.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
if (
  process.platform !== 'win32' ||
  process.argv.length !== 2 ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.GITHUB_WORKFLOW !== 'Installed portable journeys' ||
  process.env.GITHUB_REF_NAME !== 'codex/190-installed-journeys' ||
  process.env.NODE_OPTIONS
)
  throw Error('benchmark-host-unavailable');
const source = execFileSync(
  'git',
  [
    '-c',
    'core.fsmonitor=false',
    'show',
    '--no-ext-diff',
    '--no-textconv',
    '11c83fa0c1b01448719bbbb336d41296fd17ec91:src/broker/storage-protection.mjs',
  ],
  { encoding: 'utf8', timeout: 30000 }
);
const matches = [...source.matchAll(/const windowsScript = String\.raw`([\s\S]*?)`;/gu)];
if (matches.length !== 1) throw Error('benchmark-script-unavailable');
const original = matches[0][1];
const replacements = [
  [
    '$inputRecord = [Console]::In.ReadToEnd() | ConvertFrom-Json',
    "[Reflection.Assembly]::Load('System.Web.Extensions, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35') | Out-Null\n$json = [System.Web.Script.Serialization.JavaScriptSerializer]::new()\n$inputRecord = $json.DeserializeObject([Console]::In.ReadToEnd())",
  ],
  [
    "[ordered]@{schema='ai-peer-review.windows-protection-observation/v1'; records=@($records)} | ConvertTo-Json -Depth 8 -Compress",
    "[Console]::Out.Write($json.Serialize([ordered]@{schema='ai-peer-review.windows-protection-observation/v1'; records=@($records)}))",
  ],
  [
    "[ordered]@{schema='ai-peer-review.windows-protection-error/v1'; exception=$_.Exception.GetType().Name; line=$_.InvocationInfo.ScriptLineNumber; stage=$stage} | ConvertTo-Json -Compress",
    "[Console]::Out.Write($json.Serialize([ordered]@{schema='ai-peer-review.windows-protection-error/v1'; exception=$_.Exception.GetType().Name; line=$_.InvocationInfo.ScriptLineNumber; stage=$stage}))",
  ],
];
let alternative = original;
for (const [before, after] of replacements) {
  if (alternative.split(before).length !== 2) throw Error('benchmark-script-shape');
  alternative = alternative.replace(before, after);
}
const canonical = (value) =>
  JSON.stringify(value, function (_, item) {
    return item && !Array.isArray(item) && typeof item === 'object'
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]])
        )
      : item;
  });
const base = await mkdtemp(path.join(tmpdir(), 'apr190-json-'));
const output = path.join(process.cwd(), '.scratch/190-json-benchmark-public');
let status = 'unavailable',
  equal = true;
const timings = [];
try {
  const directory = path.join(base, 'directory'),
    file = path.join(base, 'record.json');
  await mkdir(directory);
  await writeFile(file, '{}\n', { flag: 'wx' });
  const input = JSON.stringify({ mode: 'inspect', paths: [directory, file] });
  const run = (script) => {
    const started = performance.now();
    const raw = execFileSync(
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
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
        timeout: 15000,
        maxBuffer: 1048576,
        env: {
          ...process.env,
          PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules',
        },
      }
    );
    const elapsedMs = Math.round(performance.now() - started),
      record = JSON.parse(raw);
    if (
      record.schema !== 'ai-peer-review.windows-protection-observation/v1' ||
      record.records?.length !== 2
    )
      throw Error('benchmark-record-unavailable');
    return { elapsedMs, record };
  };
  for (let index = 0; index < 10; index++) {
    const first = run(original),
      second = run(alternative);
    equal = equal && canonical(first.record) === canonical(second.record);
    timings.push({ originalMs: first.elapsedMs, frameworkMs: second.elapsedMs });
  }
  status = equal ? 'equal' : 'different';
} catch {
  // No original exception, stdout, stderr, descriptor, path or identity is published.
  equal = false;
} finally {
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, 'comparison.json'),
    JSON.stringify(
      {
        schema: 'ai-peer-review.stock-json-comparison/v1',
        verified: false,
        operationalAuthority: 'unavailable',
        status,
        recordsEqual: equal,
        pairs: timings.length,
        timings,
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  );
  await rm(base, { recursive: true });
}
if (status !== 'equal') process.exitCode = 1;
