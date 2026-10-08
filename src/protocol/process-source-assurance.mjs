import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeRequestCanonical, parseRawJson } from '../api/canonical-json.mjs';
import { assertSelectedRuntime } from '../config/runtime-selection.mjs';
import { observeProcessSourceContext } from './process-identity.mjs';

const INSTALLATION = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
const CONTRACT_MANIFEST = 'src/protocol/process-source-contract-files.json';
const CLASS_SCHEMA = 'schemas/process-source-class-v1.json';
const SOURCE_ENTRY = 'src/protocol/process-source-assurance.mjs';
function contractFiles(installation) {
  const file = path.join(installation, CONTRACT_MANIFEST);
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536 || realpathSync(file) !== file)
    throw new TypeError('source-contract-manifest-invalid');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  if (
    !exactKeys(manifest, ['schema', 'entry', 'files']) ||
    manifest.schema !== 'ai-peer-review.process-source-contract-files/v1' ||
    manifest.entry !== SOURCE_ENTRY ||
    !Array.isArray(manifest.files) ||
    manifest.files.length < 3 ||
    manifest.files.length > 512 ||
    ![SOURCE_ENTRY, CLASS_SCHEMA, CONTRACT_MANIFEST].every((value) =>
      manifest.files.includes(value)
    ) ||
    manifest.files.some(
      (value, index) =>
        typeof value !== 'string' ||
        value.includes('\\') ||
        value.split('/').some((part) => !part || part === '.' || part === '..') ||
        (!value.startsWith('src/') && value !== CLASS_SCHEMA) ||
        (!/\.(?:mjs|js)$/u.test(value) && ![CLASS_SCHEMA, CONTRACT_MANIFEST].includes(value)) ||
        (index > 0 && manifest.files[index - 1] >= value)
    )
  )
    throw new TypeError('source-contract-manifest-invalid');
  return manifest.files;
}
const HASH = /^sha256:[a-f0-9]{64}$/u;
const BOOT = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
const installedAssurances = new WeakSet();
const installedAssuranceRecords = new WeakMap();

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}

function exactKeys(value, keys) {
  return (
    value &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function finiteStrings(values) {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.length <= 64 &&
    values.every((v) => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(v)) &&
    new Set(values).size === values.length
  );
}

function capability(name, detail = 'class-missing') {
  return {
    status: 'unavailable',
    reason: name === 'absence' ? 'source-class-unavailable' : 'creation-stamp-unavailable',
    detail,
    recovery:
      'Run peer-review doctor and inspect the supported process-source classes before retrying; preserve ownership.',
  };
}

function unavailable(detail) {
  return freeze({
    verified: false,
    absence: capability('absence', detail),
    creation: capability('creation', detail),
  });
}

function hash(bytes) {
  return 'sha256:' + createHash('sha256').update(bytes).digest('hex');
}

// This is a data digest, including when called on a fixture installation.
// Operational loading below always pins its own installation.
export async function processSourceContractDigest({ installation = INSTALLATION } = {}) {
  installation = realpathSync(installation);
  const records = contractFiles(installation).map((relative) => {
    const file = path.join(installation, relative);
    const st = lstatSync(file);
    if (!st.isFile() || st.isSymbolicLink() || st.size > 2097152 || realpathSync(file) !== file)
      throw new TypeError('source-file-invalid');
    return { path: relative, digest: hash(readFileSync(file)) };
  });
  return hash(
    encodeRequestCanonical({ schema: 'ai-peer-review.process-source-contract/v1', files: records })
  );
}

function validClass(record) {
  if (
    !exactKeys(record, [
      'schema',
      'classId',
      'capability',
      'scope',
      'contractDigest',
      'semantics',
      'precision',
      'acceptance',
      'approvalDigest',
    ]) ||
    record.schema !== 'ai-peer-review.process-source-class/v1' ||
    !/^[a-z0-9][a-z0-9-]{0,95}$/u.test(record.classId) ||
    !['absence', 'creation'].includes(record.capability) ||
    !HASH.test(record.contractDigest) ||
    !HASH.test(record.approvalDigest)
  )
    return false;
  const scope = record.scope;
  if (
    !exactKeys(scope, ['platform', 'builds', 'architectures', 'nodeMajors', 'probe']) ||
    !['linux', 'darwin', 'win32'].includes(scope.platform) ||
    !finiteStrings(scope.builds) ||
    !finiteStrings(scope.architectures) ||
    !scope.architectures.every((a) => ['x64', 'arm64'].includes(a)) ||
    !Array.isArray(scope.nodeMajors) ||
    !scope.nodeMajors.length ||
    scope.nodeMajors.length > 16 ||
    !scope.nodeMajors.every((n) => Number.isSafeInteger(n) && n >= 24 && n <= 128) ||
    new Set(scope.nodeMajors).size !== scope.nodeMajors.length ||
    !exactKeys(scope.probe, ['path', 'version', 'visibility', 'errorContract'])
  )
    return false;
  const probes = {
    linux: {
      path: '/proc',
      visibility: 'full-pid-namespace',
      errorContract: 'exact-pid-directory-v1',
    },
    darwin: {
      path: '/bin/ps',
      visibility: 'same-user-full-selection',
      errorContract: 'exact-ps-selection-v1',
    },
    win32: {
      path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      visibility: 'local-cim-query',
      errorContract: 'completed-cim-query-v1',
    },
  };
  const expected = probes[scope.platform];
  if (
    Object.keys(expected).some((key) => scope.probe[key] !== expected[key]) ||
    typeof scope.probe.version !== 'string' ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(scope.probe.version)
  )
    return false;
  const semantics = {
    linux: {
      absence: ['linux-pid-directory-v1', 'not-applicable'],
      creation: ['linux-start-ticks-v1', 'one-tick'],
    },
    darwin: {
      absence: ['darwin-ps-selection-v1', 'not-applicable'],
      creation: ['darwin-lstart-utc-v1', 'one-second'],
    },
    win32: {
      absence: ['windows-cim-completed-v1', 'not-applicable'],
      creation: ['windows-utc-v1', 'one-hundred-nanoseconds'],
    },
  };
  const [meaning, precision] = semantics[scope.platform][record.capability];
  if (
    record.semantics !== meaning ||
    record.precision !== precision ||
    !exactKeys(record.acceptance, ['status', 'evidenceDigest', 'reviewDigest']) ||
    record.acceptance.status !== 'accepted' ||
    !HASH.test(record.acceptance.evidenceDigest) ||
    !HASH.test(record.acceptance.reviewDigest)
  )
    return false;
  const { approvalDigest, ...approved } = record;
  return hash(encodeRequestCanonical(approved)) === approvalDigest;
}

// Pure structure/scope evaluation. Even a matching fixture remains unverified;
// C5 must produce the genuine accepted class before shipping it.
export function verifyProcessSourceClass({ ledger, host, adapterHashes, probeObservation } = {}) {
  try {
    if (
      !exactKeys(ledger, ['schema', 'classes']) ||
      ledger.schema !== 'ai-peer-review.process-source-ledger/v1' ||
      !Array.isArray(ledger.classes) ||
      ledger.classes.length > 128 ||
      !ledger.classes.every(validClass) ||
      new Set(ledger.classes.map((r) => r.classId)).size !== ledger.classes.length ||
      !exactKeys(host, ['platform', 'build', 'architecture', 'nodeMajor']) ||
      !exactKeys(adapterHashes, ['contractDigest']) ||
      !HASH.test(adapterHashes.contractDigest) ||
      !exactKeys(probeObservation, ['path', 'version', 'visibility', 'errorContract'])
    )
      return unavailable('class-invalid');
    const result = {
      verified: false,
      absence: capability('absence'),
      creation: capability('creation'),
    };
    for (const kind of ['absence', 'creation']) {
      const matches = ledger.classes.filter(
        (r) =>
          r.capability === kind &&
          r.contractDigest === adapterHashes.contractDigest &&
          r.scope.platform === host.platform &&
          r.scope.builds.includes(host.build) &&
          r.scope.architectures.includes(host.architecture) &&
          r.scope.nodeMajors.includes(host.nodeMajor) &&
          Object.keys(probeObservation).every((key) => r.scope.probe[key] === probeObservation[key])
      );
      if (matches.length > 1) return unavailable('ambiguous-class');
      if (matches.length === 1) {
        const r = matches[0];
        result[kind] = {
          status: 'matched',
          classId: r.classId,
          contractDigest: r.contractDigest,
          approvalDigest: r.approvalDigest,
          evidenceDigest: r.acceptance.evidenceDigest,
          reviewDigest: r.acceptance.reviewDigest,
          semantics: r.semantics,
          precision: r.precision,
        };
      }
    }
    return freeze(result);
  } catch {
    return unavailable('class-invalid');
  }
}

export async function loadProcessSourceAssurance(options = {}) {
  try {
    if (
      Object.keys(options).some(
        (key) => !['installation', 'host', 'probe', 'signal', 'deadline'].includes(key)
      ) ||
      options.host !== undefined ||
      options.probe !== undefined ||
      realpathSync(options.installation ?? INSTALLATION) !== INSTALLATION
    )
      return unavailable('injected-context');
    if (
      options.signal?.aborted ||
      (options.deadline !== undefined && performance.now() >= options.deadline)
    )
      return unavailable('observation-budget');
    const contractDigest = await processSourceContractDigest();
    const ledgerFile = path.join(INSTALLATION, 'src/protocol/process-source-contracts.json');
    const st = lstatSync(ledgerFile);
    if (!st.isFile() || st.isSymbolicLink() || st.size > 1024 * 1024)
      return unavailable('ledger-invalid');
    const ledger = parseRawJson(readFileSync(ledgerFile, 'utf8'));
    if (!Array.isArray(ledger?.classes) || !ledger.classes.length)
      return unavailable('class-missing');
    let runtime;
    try {
      runtime = await assertSelectedRuntime({ signal: options.signal, deadline: options.deadline });
    } catch {
      return unavailable('installed-authority-unavailable');
    }
    if (
      runtime.packageRoot !== INSTALLATION ||
      !runtime.inventory.entries.some(
        (entry) =>
          entry.path === 'src/protocol/process-source-contracts.json' &&
          entry.sha256 === hash(readFileSync(ledgerFile)).slice(7)
      )
    )
      return unavailable('installed-authority-unavailable');
    const ledgerDigest = hash(readFileSync(ledgerFile));
    const context = await observeProcessSourceContext({
      signal: options.signal,
      deadline: options.deadline,
    });
    if (!context) return unavailable('probe-unclassified');
    const structural = verifyProcessSourceClass({
      ledger,
      host: {
        platform: process.platform,
        build: os.release(),
        architecture: process.arch,
        nodeMajor: Number(process.versions.node.split('.')[0]),
      },
      adapterHashes: { contractDigest },
      probeObservation: context,
    });
    const fresh = await assertSelectedRuntime({
      previousObservation: runtime,
      signal: options.signal,
      deadline: options.deadline,
    });
    if (
      fresh.inventoryDigest !== runtime.inventoryDigest ||
      (await processSourceContractDigest()) !== contractDigest ||
      hash(readFileSync(ledgerFile)) !== ledgerDigest
    )
      return unavailable('installed-authority-unavailable');
    // Identity of this object, not its serializable fields, is the permission.
    const loaded = freeze({
      verified: true,
      probeObservation: context,
      ...Object.fromEntries(
        ['absence', 'creation'].map((kind) => [
          kind,
          structural[kind].status === 'matched'
            ? { ...structural[kind], status: 'available' }
            : structural[kind],
        ])
      ),
    });
    installedAssurances.add(loaded);
    installedAssuranceRecords.set(loaded, { runtime: fresh, contractDigest, ledgerDigest });
    return loaded;
  } catch {
    return unavailable('installed-observation-failed');
  }
}

export function isInstalledProcessSourceAssurance(assurance) {
  return installedAssurances.has(assurance);
}

function utcInterval(text, fractionDigits) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/u.exec(text);
  if (!match) return null;
  const fraction = match[7] ?? '';
  if (fraction.length !== fractionDigits) return null;
  const seconds = Date.parse(
    match.slice(1, 7).slice(0, 3).join('-') + 'T' + match.slice(4, 7).join(':') + 'Z'
  );
  if (!Number.isSafeInteger(seconds)) return null;
  const canonical = new Date(seconds).toISOString().slice(0, 19) + 'Z';
  if (
    canonical !==
    match[1] +
      '-' +
      match[2] +
      '-' +
      match[3] +
      'T' +
      match[4] +
      ':' +
      match[5] +
      ':' +
      match[6] +
      'Z'
  )
    return null;
  const lower = BigInt(seconds) * 1000000n + BigInt(fraction.padEnd(9, '0') || '0');
  return freeze({
    unit: 'utc-nanoseconds',
    lower: String(lower),
    upper: String(lower + 10n ** BigInt(9 - fractionDigits)),
  });
}

export function parseCreationStamp({ value, semantics, bootId } = {}) {
  if (typeof value !== 'string' || value.length > 128) return null;
  if (semantics === 'linux-start-ticks-v1') {
    if (!BOOT.test(bootId) || !/^(?:0|[1-9]\d{0,29})$/u.test(value)) return null;
    return freeze({
      unit: 'linux-ticks:' + bootId,
      lower: value,
      upper: String(BigInt(value) + 1n),
    });
  }
  if (semantics === 'windows-utc-v1') return utcInterval(value, 7);
  if (semantics === 'darwin-lstart-utc-v1') {
    const match =
      /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) {1,2}(\d{1,2}) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/u.exec(
        value
      );
    if (!match) return null;
    const month = String(
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(
        match[2]
      ) + 1
    ).padStart(2, '0');
    const text =
      match[7] +
      '-' +
      month +
      '-' +
      match[3].padStart(2, '0') +
      'T' +
      match[4] +
      ':' +
      match[5] +
      ':' +
      match[6] +
      'Z';
    const interval = utcInterval(text, 0);
    if (
      !interval ||
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(text).getUTCDay()] !== match[1]
    )
      return null;
    return interval;
  }
  return null;
}

function validInterval(interval) {
  return (
    exactKeys(interval, ['unit', 'lower', 'upper']) &&
    typeof interval.unit === 'string' &&
    /^(utc-nanoseconds|linux-ticks:[a-f0-9-]{36})$/u.test(interval.unit) &&
    typeof interval.lower === 'string' &&
    typeof interval.upper === 'string' &&
    /^-?\d{1,30}$/u.test(interval.lower) &&
    /^-?\d{1,30}$/u.test(interval.upper) &&
    BigInt(interval.upper) > BigInt(interval.lower)
  );
}

function sealedCreation(original, observation, assurance) {
  const source = assurance?.creation;
  if (!['matched', 'available'].includes(source?.status)) return false;
  const keys = ['classId', 'contractDigest', 'approvalDigest', 'precision'];
  for (const seal of [original.creationSource, observation.creationSource]) {
    if (!exactKeys(seal, keys) || keys.some((key) => seal[key] !== source[key])) return false;
  }
  const width = { 'one-tick': 1n, 'one-second': 1000000000n, 'one-hundred-nanoseconds': 100n }[
    source.precision
  ];
  if (!width) return false;
  const expected = source.semantics === 'linux-start-ticks-v1' ? 'linux-ticks:' : 'utc-nanoseconds';
  for (const interval of [original.creation, observation.creation]) {
    if (
      !validInterval(interval) ||
      (expected === 'linux-ticks:'
        ? !interval.unit.startsWith(expected)
        : interval.unit !== expected) ||
      BigInt(interval.upper) - BigInt(interval.lower) !== width
    )
      return false;
  }
  return true;
}

// This pure assessment describes a candidate only; never an operational death.
export function assessOriginalProcess({ original, observation, assurance } = {}) {
  const result = { verified: false, candidate: 'unknown' };
  if (
    !original ||
    !observation ||
    typeof original.host !== 'string' ||
    !original.host ||
    original.host !== observation.host ||
    !Number.isSafeInteger(original.pid) ||
    original.pid <= 0 ||
    original.pid !== observation.pid
  )
    return freeze(result);
  if (
    observation.status === 'absent' &&
    ['matched', 'available'].includes(assurance?.absence?.status)
  )
    return freeze({ ...result, candidate: 'absent' });
  if (
    observation.status !== 'live' ||
    !['matched', 'available'].includes(assurance?.creation?.status) ||
    !sealedCreation(original, observation, assurance) ||
    original.creation.unit !== observation.creation.unit
  )
    return freeze(result);
  const a = original.creation,
    b = observation.creation;
  return freeze({
    ...result,
    candidate:
      BigInt(a.upper) <= BigInt(b.lower) || BigInt(b.upper) <= BigInt(a.lower)
        ? 'different-process'
        : 'same-or-overlapping',
  });
}

export async function revalidateInstalledProcessSourceAssurance(assurance, options = {}) {
  const prior = installedAssuranceRecords.get(assurance);
  if (!prior) return false;
  try {
    const current = await assertSelectedRuntime({
      previousObservation: prior.runtime,
      signal: options.signal,
      deadline: options.deadline,
    });
    if (
      current.packageRoot !== INSTALLATION ||
      current.inventoryDigest !== prior.runtime.inventoryDigest ||
      (await processSourceContractDigest()) !== prior.contractDigest ||
      hash(readFileSync(path.join(INSTALLATION, 'src/protocol/process-source-contracts.json'))) !==
        prior.ledgerDigest
    )
      return false;
    if (
      options.signal?.aborted ||
      (options.deadline !== undefined && performance.now() >= options.deadline)
    )
      return false;
    const context = await observeProcessSourceContext(options);
    return (
      context &&
      Object.keys(context).every((key) => context[key] === assurance.probeObservation[key])
    );
  } catch {
    return false;
  }
}
