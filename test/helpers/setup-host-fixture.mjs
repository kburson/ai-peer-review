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
  let root = path.join(parent, 'primary project'),
    linked = path.join(parent, 'linked project');
  const home = path.join(parent, 'account');
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
  // Git for Windows expands 8.3 temp paths. Match physical authority discovery.
  root = realpathSync(git('rev-parse', '--show-toplevel'));
  linked = realpathSync(
    execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: linked,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  );
  const commonDir = realpathSync(path.resolve(root, git('rev-parse', '--git-common-dir')));
  const registrationPath = path.join(commonDir, 'ai-peer-review', 'primary-activation.json');
  const sourceRoot = fileURLToPath(new URL('../..', import.meta.url));
  const core = createSetupMaintenanceCore({
    packageRoot: sourceRoot,
    userFile: path.join(home, '.config/ai-peer-review/config.json'),
    home,
    admit: async () => ({ packageRoot: sourceRoot, selection_id: 'fixture-only' }),
  });
  const registrationBytes =
    JSON.stringify({
      schema: 'ai-peer-review.primary-activation/v1',
      primary_root: root,
      common_dir: commonDir,
      primary_initialized: false,
      integration_contract: null,
      owned_blobs: null,
    }) + '\n';
  if (process.platform === 'win32') {
    const { platformSecurity } = await import('../../src/broker/platform.mjs');
    const directory = platformSecurity().openPrivateDirectory(path.dirname(registrationPath));
    try {
      directory.create(path.basename(registrationPath), registrationBytes);
    } finally {
      directory.close();
    }
  } else {
    mkdirSync(path.dirname(registrationPath), { mode: 0o700 });
    writeFileSync(registrationPath, registrationBytes, { mode: 0o600 });
  }
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
