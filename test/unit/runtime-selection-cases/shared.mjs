// @story #187
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCommand } from '../../../src/cli/parse.mjs';
import {
  chmodSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
  renameSync,
} from 'node:fs';
import path from 'node:path';
import { runtimeFixture } from '../../helpers/runtime-selection-fixture.mjs';
import { helpRequest } from '../../../src/cli/help-data.mjs';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
async function core() {
  const loaded = await import('../../../src/config/runtime-selection-core.mjs').catch(() => ({}));
  assert.equal(
    typeof loaded.createSelectionStore,
    'function',
    'account-bound selection store exists'
  );
  return loaded;
}
export {
  assert,
  test,
  parseCommand,
  chmodSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
  renameSync,
  path,
  runtimeFixture,
  helpRequest,
  randomUUID,
  performance,
  core,
};
