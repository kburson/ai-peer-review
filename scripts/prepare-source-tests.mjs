// @story #137
// cspell:words nodedir
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const developmentRoot = process.env.APR_NODEDIR_BASE
  ? path.join(process.env.APR_NODEDIR_BASE, process.versions.node)
  : [path.dirname(process.execPath), path.dirname(path.dirname(process.execPath))].find(
      (candidate) => existsSync(path.join(candidate, 'include/node/node_api.h'))
    );

if (!developmentRoot) {
  console.error(
    'Source tests require matching local Node development files before native verification.'
  );
  process.exitCode = 1;
} else {
  // Source-only npm test preparation. The existing builder validates exact
  // headers, local compiler prerequisites and output identity without downloads.
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/build-broker-security.mjs'), '--nodedir', developmentRoot],
    { cwd: root, stdio: 'inherit' }
  );
  if (result.error) {
    console.error(result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
