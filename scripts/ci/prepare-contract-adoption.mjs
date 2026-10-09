// @story #144
// Verification setup only: reproduce public data, never mint approval or replay private events.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectApprovedAdoption } from '../check-runtime-contract-adoption.mjs';

const SOURCE = 'evidence/portable-runtime/contracts/approved-reference.json';
const RECORD = 'evidence/portable-runtime/contracts/runtime-contract-adoption.json';
const OUTPUT = '.scratch/peer-review/evidence-approved-ref.json';
function observedPath(cwd, relative, createParents = false) {
  let current = cwd;
  const parts = relative.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (i === parts.length - 1 || !createParents) return null;
      fs.mkdirSync(current, { mode: 0o700 });
      stat = fs.lstatSync(current);
    }
    if (
      stat.isSymbolicLink() ||
      (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)
    )
      throw Error('approved-reference-path-unsafe');
  }
  return current;
}
export function prepareContractAdoption({ cwd = process.cwd() } = {}) {
  cwd = fs.realpathSync(cwd);
  const source = observedPath(cwd, SOURCE);
  if (!source) throw Error('approved-reference-source-missing');
  const bytes = fs.readFileSync(source);
  const destination = observedPath(cwd, OUTPUT);
  if (destination && !bytes.equals(fs.readFileSync(destination)))
    throw Error('approved-reference-output-conflict');
  const report = inspectApprovedAdoption({
    cwd,
    record: RECORD,
    approvedRef: source,
    mode: 'adoption-only',
  });
  if (!report.contractAdopted || report.activationAuthorized || report.publicationAllowed)
    throw Error('approved-reference-adoption-refused');
  if (!bytes.equals(fs.readFileSync(source))) throw Error('approved-reference-source-changed');
  const existing = observedPath(cwd, OUTPUT, true);
  if (existing) {
    if (!bytes.equals(fs.readFileSync(existing))) throw Error('approved-reference-output-conflict');
  } else {
    fs.writeFileSync(path.join(cwd, OUTPUT), bytes, { flag: 'wx', mode: 0o600 });
  }
  return { prepared: true, output: OUTPUT, ...report };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw Error('usage-invalid');
    console.log(JSON.stringify(prepareContractAdoption()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
