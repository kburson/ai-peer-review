// Source CLI tests must not inherit another installed package's setup.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setup } from '../../src/config/setup.mjs';

export function sourceCliProject(t) {
  const root = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'apr-source-cli-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git(['init', '-b', 'trunk']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs/example.md'), '# Example\n');
  setup({
    scope: 'project',
    cwd: root,
    home: path.join(root, '.fixture-home'),
    env: {},
    agents: ['codex'],
    confirmScratchExclude: true,
  });
  git(['add', '.']);
  git(['commit', '-m', 'source-compatible fixture']);
  const workspace = path.join(root, '.scratch/peer-review/fixture');
  mkdirSync(path.join(workspace, 'deliveries'), { recursive: true });
  return { root, workspace };
}
