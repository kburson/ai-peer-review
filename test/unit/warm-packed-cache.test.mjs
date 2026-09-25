import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { warmPackedCache } from '../helpers/warm-packed-cache.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
for (const format of ['npm-11-single.json', 'npm-12-single.json', 'missing-filename.json']) {
  test(`cache warm installs the exact archive or refuses before install: ${format}`, (t) => {
    mkdirSync(path.join(root, '.scratch/test'), { recursive: true });
    const scratch = mkdtempSync(path.join(root, '.scratch/test/warm-cache-'));
    t.after(() => rmSync(scratch, { recursive: true, force: true }));
    const filename = 'kburson-ai-peer-review-0.2.2.tgz';
    writeFileSync(path.join(scratch, filename), 'archive fixture');
    const calls = [];
    const npm = (tool, args, options) => {
      calls.push({ tool, args, cwd: options.cwd });
      if (args[0] === 'pack')
        return readFileSync(path.join(root, 'test/fixtures/npm-pack-report', format), 'utf8');
      assert.equal(
        readFileSync(path.join(options.cwd, 'package.json'), 'utf8'),
        '{"private":true}\n'
      );
      return '';
    };
    if (format === 'missing-filename.json') {
      assert.throws(
        () => warmPackedCache({ root, scratch, npm }),
        /filename must be a non-empty string/
      );
      assert.equal(calls.length, 1);
    } else {
      assert.equal(warmPackedCache({ root, scratch, npm }), path.join(scratch, filename));
      assert.deepEqual(calls[1], {
        tool: 'npm',
        args: [
          'install',
          '--omit=dev',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          path.join(scratch, filename),
        ],
        cwd: path.join(scratch, 'host'),
      });
    }
  });
}
