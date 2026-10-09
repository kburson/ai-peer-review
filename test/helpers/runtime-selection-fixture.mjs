// @story #133
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
export function runtimeFixture(t) {
  const root = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'peer account ')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const home = path.join(root, 'account');
  const packageRoot = path.join(root, 'global package');
  mkdirSync(home);
  mkdirSync(packageRoot);
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({ name: '@kburson/ai-peer-review', version: '1.0.0', engines: { node: '>=24' } })
  );
  writeFileSync(path.join(packageRoot, 'runner.mjs'), 'export const version = 1;\n');
  const seal = () =>
    writeFileSync(
      path.join(packageRoot, 'runtime-inventory.json'),
      JSON.stringify({
        schema: 'ai-peer-review.runtime-inventory/v1',
        files: ['package.json', 'runner.mjs'].map((file) => ({
          path: file,
          sha256: createHash('sha256')
            .update(readFileSync(path.join(packageRoot, file)))
            .digest('hex'),
        })),
      })
    );
  seal();
  return {
    root,
    home,
    packageRoot,
    seal,
    account: () => ({ homedir: home, uid: userInfo().uid }),
  };
}
