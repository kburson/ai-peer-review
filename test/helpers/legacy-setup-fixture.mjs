// Test-only historical v1/v2 setup fixture builder; never shipped or used by production maintenance.
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
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AprError } from '../../src/errors.mjs';
import { configPaths, validateConfig } from '../../src/config/load.mjs';
import { installedPackageIdentity } from '../../src/config/installation-identity.mjs';

const PRETTIER_CLI = createRequire(import.meta.url).resolve('prettier/bin/prettier.cjs');

const HOST_DIR = Object.freeze({
  codex: '.codex',
  claude: '.claude',
  grok: '.grok',
  generic: '.agents',
});
const SKILL_SOURCE = fileURLToPath(new URL('../../skills/peer-review/SKILL.md', import.meta.url));
const SCRATCH_RULE = '.scratch/peer-review/';
const START_HOOK = Object.freeze({
  codex: 'peer-review-codex-hook',
  claude: 'peer-review-claude-hook',
});
const HOOK_FILE = Object.freeze({ codex: 'hooks.json', claude: 'settings.json' });
const OFFICIAL_RESUME = Object.freeze({
  codex: ['codex', 'resume'],
  claude: ['claude', '--resume'],
  grok: ['grok', 'resume'],
});
const AUTOMATIC_ADAPTER = Object.freeze({
  codex: Object.freeze({
    adapter_version: '2.0.0',
    capability: 'live-wait',
    server_command: Object.freeze(['peer-review-mcp']),
    tool_timeout_ms: 28_800_000,
    heartbeat_interval_ms: 15_000,
    lease_ttl_ms: 60_000,
  }),
  claude: Object.freeze({
    adapter_version: '2.0.0',
    capability: 'live-wait',
    server_command: Object.freeze(['peer-review-mcp']),
    tool_timeout_ms: 28_800_000,
    heartbeat_interval_ms: 15_000,
    lease_ttl_ms: 60_000,
  }),
});

function fail(code, message, recovery, details = {}) {
  throw new AprError(code, message, { recovery, details });
}

function stable(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatJson(value, file) {
  try {
    return execFileSync(
      process.execPath,
      [PRETTIER_CLI, '--parser', 'json', '--stdin-filepath', file, '--ignore-path', os.devNull],
      {
        input: stable(value),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 4 * 1024 * 1024,
        timeout: 30_000,
      }
    );
  } catch (cause) {
    fail(
      'APR_SETUP_INVALID',
      'Setup JSON formatting failed.',
      'Repair the destination Prettier configuration, then retry setup.',
      { file, reason: String(cause.stderr ?? cause.message).trim() }
    );
  }
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
  const beforeText =
    before === null ? null : typeof before === 'string' ? before : readFileSync(file, 'utf8');
  const afterText =
    after === null ? null : typeof after === 'string' ? after : formatJson(after, file);
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

function startHookOperation({ root, host, remove, ownership }) {
  if (!START_HOOK[host]) return { operation: null, hookAdded: false, hookFileCreated: false };
  const file = path.join(root, HOOK_FILE[host]);
  const fileExists = existsSync(file);
  const before = readJson(file, {});
  const after = clone(before);
  const hook = { matcher: 'Bash', hooks: [{ type: 'command', command: START_HOOK[host] }] };
  const groups = before.hooks?.PreToolUse ?? [];
  if (!Array.isArray(groups))
    fail(
      'APR_SETUP_INVALID',
      'PreToolUse hooks must be an array.',
      'Repair the host hook settings.',
      { file }
    );
  const matching = groups.filter((group) => stable(group) === stable(hook));
  const localHook = groups.some(
    (group) =>
      group?.matcher === 'Bash' &&
      group.hooks?.length === 1 &&
      group.hooks[0]?.type === 'command' &&
      group.hooks[0].command === `node bin/${START_HOOK[host]}.mjs`
  );
  if (matching.length > 1)
    fail(
      'APR_SETUP_CONFLICT',
      'Duplicate package start hooks exist.',
      'Remove the duplicate hook.',
      { file }
    );
  if (remove) {
    if (!ownership?.hook_added)
      return { operation: null, hookAdded: false, hookFileCreated: false };
    if (!matching.length)
      fail(
        'APR_SETUP_CONFLICT',
        'Package start hook changed since setup.',
        'Restore the hook before teardown.',
        { file }
      );
    after.hooks.PreToolUse = groups.filter((group) => stable(group) !== stable(hook));
    if (!after.hooks.PreToolUse.length) delete after.hooks.PreToolUse;
    if (!Object.keys(after.hooks).length) delete after.hooks;
    const removeFile = ownership.hook_file_created && !Object.keys(after).length;
    return {
      operation: operation(file, before, removeFile ? null : after, `${host}-start-hook`),
      hookAdded: false,
      hookFileCreated: false,
    };
  }
  if (matching.length)
    return {
      operation: null,
      hookAdded: Boolean(ownership?.hook_added),
      hookFileCreated: Boolean(ownership?.hook_file_created),
    };
  if (localHook) return { operation: null, hookAdded: false, hookFileCreated: false };
  after.hooks ??= {};
  after.hooks.PreToolUse = [...groups, hook];
  return {
    operation: operation(file, fileExists ? before : null, after, `${host}-start-hook`),
    hookAdded: true,
    hookFileCreated: !fileExists,
  };
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

function packageConfigAfter(current, agents, remove, configExists, scope, scratchRuleExists) {
  const result = clone(current);
  const selected = new Set(agents);
  const ownedResume = new Set(current.setup?.resume_commands_added ?? []);
  const ownedAutomatic = new Set(current.setup?.automatic_adapters_added ?? []);
  result.hosts ??= {};
  if (remove) {
    for (const agent of agents) {
      if (ownedResume.has(agent) && result.hosts[agent]?.resume) {
        delete result.hosts[agent].resume;
        ownedResume.delete(agent);
      }
      if (ownedAutomatic.has(agent) && result.hosts[agent]?.automatic) {
        delete result.hosts[agent].automatic;
        ownedAutomatic.delete(agent);
      }
      if (result.hosts[agent] && Object.keys(result.hosts[agent]).length === 0)
        delete result.hosts[agent];
    }
  } else {
    for (const agent of agents) {
      if (!OFFICIAL_RESUME[agent] || result.hosts[agent]?.resume) continue;
      result.hosts[agent] ??= {};
      result.hosts[agent].resume = { command: [...OFFICIAL_RESUME[agent]] };
      ownedResume.add(agent);
    }
    for (const agent of agents) {
      if (!AUTOMATIC_ADAPTER[agent] || result.hosts[agent]?.automatic) continue;
      result.hosts[agent] ??= {};
      result.hosts[agent].automatic = clone(AUTOMATIC_ADAPTER[agent]);
      ownedAutomatic.add(agent);
    }
  }
  if (Object.keys(result.hosts).length === 0) delete result.hosts;
  const nextAgents = remove
    ? (current.setup?.agents ?? []).filter((agent) => !selected.has(agent))
    : [...new Set([...(current.setup?.agents ?? []), ...agents])].sort();
  if (remove && nextAgents.length === 0) delete result.setup;
  else
    result.setup = {
      owner: 'ai-peer-review',
      version: 2,
      ...installedPackageIdentity(),
      agents: nextAgents,
      config_created: current.setup?.config_created ?? !configExists,
      scratch_exclude_added:
        current.setup?.scratch_exclude_added ?? (scope === 'project' && !scratchRuleExists),
      resume_commands_added: [...ownedResume].sort(),
      automatic_adapters_added: [...ownedAutomatic].sort(),
    };
  return result;
}

export function updateSetup(options = {}) {
  if (options.remove || options.agents?.length)
    fail(
      'APR_SETUP_INVALID',
      'Update cannot be combined with removal or explicit agents.',
      'Use setup --update alone, or use setup --remove for teardown.'
    );
  const scope = options.scope ?? 'project';
  if (!['user', 'project'].includes(scope))
    fail('APR_SETUP_INVALID', 'Setup update scope is invalid.', 'Select user or project scope.');
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const home = path.resolve(options.home ?? os.homedir());
  const configFile = configPaths({ cwd, home, env: options.env ?? {}, platform: options.platform })[
    scope
  ];
  const current = readJson(configFile, { schema: 'ai-peer-review.config/v1' });
  validateConfig(current);
  if (current.setup?.owner !== 'ai-peer-review' || !current.setup.agents?.length)
    fail(
      'APR_SETUP_INVALID',
      'No prior package-owned setup exists in this scope.',
      'Run peer-review setup with an explicit --agent and --scope first.'
    );
  return setup({ ...options, scope, agents: current.setup.agents });
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
  const excludeFile =
    scope === 'project' ? path.resolve(cwd, options.gitExcludePath ?? defaultExclude(cwd)) : null;
  const currentExclude =
    excludeFile && existsSync(excludeFile) ? readFileSync(excludeFile, 'utf8') : '';
  const scratchRuleExists = currentExclude.split(/\r?\n/).includes(SCRATCH_RULE);
  const configFile = configPaths({ cwd, home, env: options.env ?? {}, platform: options.platform })[
    scope
  ];
  const configExists = existsSync(configFile);
  const currentConfig = readJson(configFile, { schema: 'ai-peer-review.config/v1' });
  validateConfig(currentConfig);
  const nextConfig = packageConfigAfter(
    currentConfig,
    agents,
    remove,
    configExists,
    scope,
    scratchRuleExists
  );
  validateConfig(nextConfig);
  const removeCreatedConfig =
    remove && currentConfig.setup?.config_created && Object.keys(nextConfig).length === 1;
  const configChanged = stable(currentConfig) !== stable(nextConfig);
  const nextConfigText =
    removeCreatedConfig || (!configExists && !configChanged)
      ? null
      : formatJson(nextConfig, configFile);
  const currentConfigText = configExists ? readFileSync(configFile, 'utf8') : null;
  if (configChanged || (configExists && currentConfigText !== nextConfigText)) {
    operations.push(operation(configFile, currentConfigText, nextConfigText, 'package-config'));
  }

  const skillBytes = readFileSync(SKILL_SOURCE, 'utf8');
  for (const host of agents) {
    const root = providerRoot({ scope, host, cwd, home });
    const adapterFile = path.join(root, 'config.json');
    const adapterExists = existsSync(adapterFile);
    const current = readJson(adapterFile, {});
    const hookResult = startHookOperation({
      root,
      host,
      remove,
      ownership: current.ai_peer_review,
    });
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
          version: 2,
          adapter_version: '2.0.0',
          reviewer_guard: { installed: false, enforcement: 'advisory' },
          resume_adapter: host !== 'generic',
          transport: nextConfig.setup?.automatic_adapters_added.includes(host)
            ? 'live-wait'
            : 'manual',
          mcp: nextConfig.setup?.automatic_adapters_added.includes(host)
            ? clone(AUTOMATIC_ADAPTER[host])
            : null,
          config_created: current.ai_peer_review?.config_created ?? !adapterExists,
          skill_created:
            current.ai_peer_review?.skill_created ??
            !existsSync(path.join(root, 'skills', 'peer-review', 'SKILL.md')),
          ...(START_HOOK[host]
            ? {
                hook_added: hookResult.hookAdded,
                hook_file_created: hookResult.hookFileCreated,
              }
            : {}),
        };
    const planned = planSetup({ scope, host, current, desired });
    let adapterOperation = null;
    if (planned.changed) {
      const after = planned.operations[0].after;
      const removeCreatedAdapter =
        remove && current.ai_peer_review?.config_created && Object.keys(after).length === 0;
      adapterOperation = operation(
        adapterFile,
        adapterExists ? current : null,
        removeCreatedAdapter ? null : after,
        `${host}-adapter`
      );
    }
    const skillFile = path.join(root, 'skills', 'peer-review', 'SKILL.md');
    const existingSkill = existsSync(skillFile) ? readFileSync(skillFile, 'utf8') : null;
    const nextSkill = remove ? null : skillBytes;
    const packageOwnedSkill =
      current.ai_peer_review?.owner === 'ai-peer-review' &&
      current.ai_peer_review.skill_created === true &&
      currentConfig.setup?.owner === 'ai-peer-review' &&
      currentConfig.setup.agents?.includes(host);
    if (!remove && existingSkill !== null && existingSkill !== skillBytes && !packageOwnedSkill) {
      fail(
        'APR_SETUP_CONFLICT',
        'An existing peer-review skill is not package-owned.',
        'Preserve or relocate the existing skill before setup.',
        { file: skillFile }
      );
    }
    if (!remove && adapterOperation) operations.push(adapterOperation);
    if (!remove && hookResult.operation) operations.push(hookResult.operation);
    const preserveSkillOnRemoval = remove && !packageOwnedSkill;
    if (
      !preserveSkillOnRemoval &&
      existingSkill !== nextSkill &&
      !(remove && existingSkill === null)
    )
      operations.push(operation(skillFile, existingSkill, nextSkill, `${host}-skill`));
    if (remove && adapterOperation) operations.push(adapterOperation);
    if (remove && hookResult.operation) operations.push(hookResult.operation);
  }

  if (scope === 'project') {
    const current = currentExclude;
    const lines = current.split(/\r?\n/).filter(Boolean);
    const hasRule = lines.includes(SCRATCH_RULE);
    if (!remove && !hasRule && !options.confirmScratchExclude && !options.dryRun) {
      fail(
        'APR_SETUP_CONFIRMATION_REQUIRED',
        'Scratch exclusion requires explicit confirmation.',
        `Review the plan, then pass --confirm-scratch-exclude to edit ${excludeFile}.`,
        { file: excludeFile }
      );
    }
    const removeScratchRule =
      remove && currentConfig.setup?.scratch_exclude_added && !nextConfig.setup?.agents.length;
    const nextLines = remove
      ? removeScratchRule
        ? lines.filter((line) => line !== SCRATCH_RULE)
        : lines
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
      if (entry.owner === 'scratch-exclude') {
        return `${entry.kind} ${entry.file}\n${entry.after?.includes(SCRATCH_RULE) ? '+' : '-'} ${SCRATCH_RULE}`;
      }
      return `${entry.kind} ${entry.file}\n- ${entry.before ?? '<absent>'}\n+ ${entry.after ?? '<absent>'}`;
    })
    .join('\n');
  const backupRequired = (entry) =>
    entry.kind === 'modify' ||
    (entry.kind === 'remove' && entry.owner.endsWith('-skill') && entry.before !== skillBytes);
  const publicOperations = Object.freeze(
    operations.map((entry) =>
      Object.freeze({
        file: entry.file,
        owner: entry.owner,
        kind: entry.kind,
        backup_required: backupRequired(entry),
      })
    )
  );
  const plan = {
    schema: 'ai-peer-review.setup-plan/v1',
    scope,
    agents,
    changed: operations.length > 0,
    backup_required: operations.some(backupRequired),
    operations: publicOperations,
    diff,
    input,
  };
  if (!options.dryRun) {
    const applicationOrder = remove
      ? [
          ...operations.filter((entry) => entry.owner !== 'package-config'),
          ...operations.filter((entry) => entry.owner === 'package-config'),
        ]
      : operations;
    for (const entry of applicationOrder) {
      if (backupRequired(entry)) {
        mkdirSync(path.dirname(`${entry.file}.bak`), { recursive: true });
        copyFileSync(entry.file, `${entry.file}.bak`);
      }
      if (entry.after === null) rmSync(entry.file);
      else atomicWrite(entry.file, entry.after);
    }
  }
  if (options.dryRun) return Object.freeze(plan);
  return Object.freeze({
    schema: 'ai-peer-review.setup-result/v1',
    status: operations.length ? 'applied' : 'no-changes',
    scope,
    agents,
    changed: operations.length > 0,
    operations: publicOperations,
    backups: operations.filter(backupRequired).map((entry) => `${entry.file}.bak`),
  });
}
