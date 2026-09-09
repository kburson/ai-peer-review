import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AprError } from '../errors.mjs';
import { configPaths, validateConfig } from './load.mjs';

const HOST_DIR = Object.freeze({
  codex: '.codex',
  claude: '.claude',
  grok: '.grok',
  generic: '.agents',
});
const SKILL_SOURCE = fileURLToPath(new URL('../../skills/peer-review/SKILL.md', import.meta.url));
const SCRATCH_RULE = '.scratch/peer-review/';

function fail(code, message, recovery, details = {}) {
  throw new AprError(code, message, { recovery, details });
}

function stable(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function planSetup({ scope, host, current = {}, desired = null }) {
  if (!['user', 'project'].includes(scope))
    fail('APR_SETUP_INVALID', 'Setup scope is invalid.', 'Select user or project scope.');
  if (!Object.hasOwn(HOST_DIR, host))
    fail('APR_SETUP_INVALID', 'Setup host is invalid.', 'Select codex, claude, grok, or generic.');
  const before = clone(current);
  const after = clone(current);
  if (desired === null) delete after.ai_peer_review;
  else after.ai_peer_review = clone(desired);
  const changed = stable(before) !== stable(after);
  const operations = changed
    ? [
        Object.freeze({
          kind: Object.keys(before).length ? 'modify' : 'create',
          target: 'provider-config',
          before,
          after,
        }),
      ]
    : [];
  return Object.freeze({
    scope,
    host,
    changed,
    backup_required: operations.some((operation) => operation.kind === 'modify'),
    operations: Object.freeze(operations),
  });
}

function readJson(file, fallback) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('not object');
    return parsed;
  } catch (cause) {
    if (cause?.code === 'ENOENT') return clone(fallback);
    fail(
      'APR_SETUP_INVALID',
      'Existing setup configuration is not a JSON object.',
      'Repair the provider configuration before setup.',
      { file }
    );
  }
}

function atomicWrite(file, contents) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, contents, { mode: 0o600 });
  renameSync(temporary, file);
}

function operation(file, before, after, owner) {
  const beforeText = before === null ? null : typeof before === 'string' ? before : stable(before);
  const afterText = after === null ? null : typeof after === 'string' ? after : stable(after);
  return Object.freeze({
    file,
    owner,
    kind: beforeText === null ? 'create' : afterText === null ? 'remove' : 'modify',
    before: beforeText,
    after: afterText,
  });
}

function providerRoot({ scope, host, cwd, home }) {
  return path.join(scope === 'project' ? cwd : home, HOST_DIR[host]);
}

function defaultExclude(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--git-path', 'info/exclude'], {
      cwd,
      encoding: 'utf8',
    }).trim();
  } catch {
    fail(
      'APR_SETUP_INVALID',
      'Git did not report a repository-local exclude path.',
      'Run project setup from a Git worktree.'
    );
  }
}

function packageConfigAfter(current, agents, remove, configExists) {
  const result = clone(current);
  if (remove) delete result.setup;
  else
    result.setup = {
      owner: 'ai-peer-review',
      version: 1,
      agents: [...agents].sort(),
      config_created: current.setup?.config_created ?? !configExists,
    };
  return result;
}

export function setup(options = {}) {
  const scope = options.scope;
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const home = path.resolve(options.home ?? os.homedir());
  const agents = [...new Set(options.agents ?? ['generic'])].sort();
  if (!['user', 'project'].includes(scope))
    fail(
      'APR_SETUP_INVALID',
      'Setup requires an explicit scope.',
      'Pass --scope user or --scope project.'
    );
  if (!agents.length || agents.some((agent) => !Object.hasOwn(HOST_DIR, agent)))
    fail(
      'APR_SETUP_INVALID',
      'Setup agent selection is invalid.',
      'Select codex, claude, grok, or generic.'
    );
  const remove = Boolean(options.remove);
  const input = Object.freeze({
    scope,
    cwd,
    home,
    agents: Object.freeze(agents),
    confirmScratchExclude: Boolean(options.confirmScratchExclude),
    ...(options.gitExcludePath ? { gitExcludePath: path.resolve(options.gitExcludePath) } : {}),
    ...(options.platform ? { platform: options.platform } : {}),
  });
  const operations = [];
  const configFile = configPaths({ cwd, home, env: options.env ?? {}, platform: options.platform })[
    scope
  ];
  const configExists = existsSync(configFile);
  const currentConfig = readJson(configFile, { schema: 'ai-peer-review.config/v1' });
  validateConfig(currentConfig);
  const nextConfig = packageConfigAfter(currentConfig, agents, remove, configExists);
  validateConfig(nextConfig);
  if (stable(currentConfig) !== stable(nextConfig)) {
    const removeCreatedConfig =
      remove && currentConfig.setup?.config_created && Object.keys(nextConfig).length === 1;
    operations.push(
      operation(
        configFile,
        configExists ? currentConfig : null,
        removeCreatedConfig ? null : nextConfig,
        'package-config'
      )
    );
  }

  const skillBytes = readFileSync(SKILL_SOURCE, 'utf8');
  for (const host of agents) {
    const root = providerRoot({ scope, host, cwd, home });
    const adapterFile = path.join(root, 'config.json');
    const adapterExists = existsSync(adapterFile);
    const current = readJson(adapterFile, {});
    if (current.ai_peer_review && current.ai_peer_review.owner !== 'ai-peer-review') {
      fail(
        'APR_SETUP_CONFLICT',
        'A provider configuration key named ai_peer_review is not package-owned.',
        'Rename or remove the foreign key before setup.',
        { file: adapterFile }
      );
    }
    const desired = remove
      ? null
      : {
          owner: 'ai-peer-review',
          version: 1,
          reviewer_guard: { installed: false, enforcement: 'advisory' },
          resume_adapter: host !== 'generic',
          transport: 'manual',
          config_created: current.ai_peer_review?.config_created ?? !adapterExists,
          skill_created:
            current.ai_peer_review?.skill_created ??
            !existsSync(path.join(root, 'skills', 'peer-review', 'SKILL.md')),
        };
    const planned = planSetup({ scope, host, current, desired });
    if (planned.changed) {
      const after = planned.operations[0].after;
      const removeCreatedAdapter =
        remove && current.ai_peer_review?.config_created && Object.keys(after).length === 0;
      operations.push(
        operation(
          adapterFile,
          adapterExists ? current : null,
          removeCreatedAdapter ? null : after,
          `${host}-adapter`
        )
      );
    }
    const skillFile = path.join(root, 'skills', 'peer-review', 'SKILL.md');
    const existingSkill = existsSync(skillFile) ? readFileSync(skillFile, 'utf8') : null;
    const nextSkill = remove ? null : skillBytes;
    if (!remove && existingSkill !== null && existingSkill !== skillBytes) {
      fail(
        'APR_SETUP_CONFLICT',
        'An existing peer-review skill is not package-owned.',
        'Preserve or relocate the existing skill before setup.',
        { file: skillFile }
      );
    }
    if (
      remove &&
      (!current.ai_peer_review?.skill_created ||
        (existingSkill !== null && existingSkill !== skillBytes))
    )
      continue;
    if (existingSkill !== nextSkill && !(remove && existingSkill === null))
      operations.push(operation(skillFile, existingSkill, nextSkill, `${host}-skill`));
  }

  if (scope === 'project') {
    const excludeFile = path.resolve(options.gitExcludePath ?? defaultExclude(cwd));
    const current = existsSync(excludeFile) ? readFileSync(excludeFile, 'utf8') : '';
    const lines = current.split(/\r?\n/).filter(Boolean);
    const hasRule = lines.includes(SCRATCH_RULE);
    if (!remove && !hasRule && !options.confirmScratchExclude) {
      fail(
        'APR_SETUP_CONFIRMATION_REQUIRED',
        'Scratch exclusion requires explicit confirmation.',
        `Review the plan, then pass --confirm-scratch-exclude to edit ${excludeFile}.`,
        { file: excludeFile }
      );
    }
    const nextLines = remove
      ? lines.filter((line) => line !== SCRATCH_RULE)
      : hasRule
        ? lines
        : [...lines, SCRATCH_RULE];
    const next = nextLines.length ? `${nextLines.join('\n')}\n` : '';
    if (current !== next)
      operations.push(
        operation(excludeFile, existsSync(excludeFile) ? current : null, next, 'scratch-exclude')
      );
  }

  const diff = operations
    .map((entry) => {
      if (entry.owner.endsWith('-adapter')) {
        const before = entry.before === null ? null : JSON.parse(entry.before).ai_peer_review;
        const after = entry.after === null ? null : JSON.parse(entry.after).ai_peer_review;
        return `${entry.kind} ${entry.file}\n- ai_peer_review: ${JSON.stringify(before ?? '<absent>')}\n+ ai_peer_review: ${JSON.stringify(after ?? '<absent>')}`;
      }
      return `${entry.kind} ${entry.file}\n- ${entry.before ?? '<absent>'}\n+ ${entry.after ?? '<absent>'}`;
    })
    .join('\n');
  const publicOperations = Object.freeze(
    operations.map((entry) =>
      Object.freeze({
        file: entry.file,
        owner: entry.owner,
        kind: entry.kind,
        backup_required: entry.before !== null,
      })
    )
  );
  const plan = {
    schema: 'ai-peer-review.setup-plan/v1',
    scope,
    agents,
    changed: operations.length > 0,
    backup_required: operations.some((entry) => entry.before !== null),
    operations: publicOperations,
    diff,
    input,
  };
  if (!options.dryRun) {
    for (const entry of operations) {
      if (entry.before !== null) {
        mkdirSync(path.dirname(`${entry.file}.bak`), { recursive: true });
        copyFileSync(entry.file, `${entry.file}.bak`);
      }
      if (entry.after === null) rmSync(entry.file);
      else atomicWrite(entry.file, entry.after);
    }
  }
  return Object.freeze(plan);
}
