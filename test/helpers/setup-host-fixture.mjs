// @story #134
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  realpathSync,
  existsSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSetupMaintenanceCore } from '../../src/config/setup-core.mjs';
export async function setupHostFixture(t) {
  const parent = realpathSync(mkdtempSync(path.join(tmpdir(), 'primary setup ')));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'primary project'),
    linked = path.join(parent, 'linked project'),
    home = path.join(parent, 'account');
  mkdirSync(root);
  mkdirSync(home);
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  git('init', '-b', 'trunk');
  git('config', 'user.name', 'Setup Fixture');
  git('config', 'user.email', 'setup@example.invalid');
  writeFileSync(path.join(root, 'README.md'), '# Fixture\n');
  writeFileSync(path.join(root, 'package.json'), '{"name":"host","private":true}\n');
  git('add', '.');
  git('commit', '-m', 'fixture');
  git('worktree', 'add', '-b', 'linked', linked);
  const commonDir = realpathSync(path.join(root, '.git'));
  const registrationPath = path.join(commonDir, 'ai-peer-review', 'primary-activation.json');
  const sourceRoot = fileURLToPath(new URL('../..', import.meta.url));
  const core = createSetupMaintenanceCore({
    packageRoot: sourceRoot,
    userFile: path.join(home, '.config/ai-peer-review/config.json'),
    home,
    admit: async () => ({ packageRoot: sourceRoot, selection_id: 'fixture-only' }),
  });
  mkdirSync(path.dirname(registrationPath), { mode: 0o700 });
  writeFileSync(
    registrationPath,
    JSON.stringify({
      schema: 'ai-peer-review.primary-activation/v1',
      primary_root: root,
      common_dir: commonDir,
      primary_initialized: false,
      integration_contract: null,
      owned_blobs: null,
    }) + '\n',
    { mode: 0o600 }
  );
  const setupApply = (options = {}) =>
    core.setup({
      scope: 'project',
      agents: ['codex'],
      cwd: root,
      confirmScratchExclude: true,
      ...options,
    });
  const write = (relative, bytes) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    return file;
  };
  const installTool = (name) => {
    const directory = path.join(root, 'node_modules');
    mkdirSync(directory, { recursive: true });
    symlinkSync(path.join(sourceRoot, 'node_modules', name), path.join(directory, name), 'dir');
  };
  return {
    parent,
    root,
    linked,
    home,
    commonDir,
    registrationPath,
    core,
    git,
    write,
    installTool,
    read: (relative) => readFileSync(path.join(root, relative), 'utf8'),
    exists: (relative) => existsSync(path.join(root, relative)),
    setupApply,
  };
}
