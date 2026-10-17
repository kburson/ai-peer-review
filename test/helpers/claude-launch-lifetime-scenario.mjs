// @story #190
// Declared inert Node child; no actual provider or review acceptance claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
const [installed, project, mode] = process.argv.slice(2);
const load = (name) => import(pathToFileURL(path.join(installed, name)).href);
const { run, startReview } = await load('src/cli/run.mjs');
const { participantIdentity } = await load('src/identity/registry.mjs');
const { currentOperationAuthorityContext, withOperationAuthority } = await load(
  'src/startup/authority-fence.mjs'
);
const { buildClaudeReviewerLaunch, claudeJoinCommand } = await load(
  'src/provider/claude-launch.mjs'
);
fs.mkdirSync(project);
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !key.startsWith('GIT_') &&
      !/^(CODEX|CLAUDE|GROK|APR|ANTHROPIC|OPENAI)_/.test(key) &&
      key !== 'NODE_OPTIONS'
  )
);
const git = (...args) =>
  execFileSync('git', args, {
    cwd: project,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
git('init', '-b', 'trunk');
git('config', 'user.name', 'Declared lifetime fixture');
git('config', 'user.email', 'fixture@example.invalid');
fs.writeFileSync(path.join(project, 'artifact.md'), '# Declared artifact\n');
fs.writeFileSync(path.join(project, 'unrelated.md'), 'Unrelated sentinel\n');
git('add', 'artifact.md', 'unrelated.md');
git('commit', '-m', 'fixture');
const digest = (name) => createHash('sha256').update(fs.readFileSync(name)).digest('hex');
const snapshot = () => ({
  head: git('rev-parse', 'HEAD'),
  index: digest(path.join(project, '.git/index')),
  artifact: digest(path.join(project, 'artifact.md')),
  unrelated: digest(path.join(project, 'unrelated.md')),
});
const before = snapshot();
const identity = participantIdentity({
  role: 'author',
  host: 'codex',
  provider: 'openai',
  modelId: 'declared-fixture-model',
  modelDisplay: 'Declared lifetime fixture',
  sessionId: 'declared-lifetime-' + mode,
  source: 'declared',
  joinedAt: new Date().toISOString(),
});
const started = await startReview({
  cwd: project,
  artifact: 'artifact.md',
  artifactKind: 'spec',
  issue: 190,
  reviewerProvider: 'claude',
  reviewerModel: 'declared-fixture-model',
  reviewerEffort: 'high',
  transportMode: 'manual',
  identity,
});
const workspace = started.paths.workspace,
  invitation = started.paths.reviewer_invitation;
const journal = path.join(workspace, 'events.jsonl'),
  journalBefore = digest(journal);
const reviewId = JSON.parse(fs.readFileSync(journal, 'utf8').split('\n')[0]).review_id;
const encoded = fs
  .readFileSync(invitation, 'utf8')
  .match(/^<!-- ai-peer-review-invitation data="([A-Za-z0-9_-]+)" -->$/m)[1];
const routing = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
const contract = buildClaudeReviewerLaunch({
  repositoryRoot: project,
  invitation,
  routing,
  model: 'declared-fixture-model',
  effort: 'high',
});
const joinCommand = claudeJoinCommand(contract);
const slow = mode.startsWith('slow');
const delayMs = slow || mode === 'provider-deadline' ? 31000 : 2000;
const signal = new AbortController();
const explicitDeadline = ['caller-deadline', 'nested-deadline'].includes(mode)
  ? performance.now() + 1500
  : undefined;
if (mode === 'already-aborted') signal.abort();
if (mode === 'provider-deadline') env.APR_PROVIDER_DEADLINE_MS = String(Date.now() + 2000);
let stdout = '',
  stderr = '',
  context = null,
  spawns = 0;
const children = [];
const pending = [];
const timer = mode === 'cancelled' ? setTimeout(() => signal.abort(), 1500) : null;
const childCode = `const emit=x=>process.stdout.write(JSON.stringify(x)+'\\n');const session='declared-lifetime-reviewer';emit({type:'system',subtype:'init',session_id:session,model:'declared-fixture-model',claude_code_version:'declared-fixture'});setTimeout(()=>{if(process.env.APR_FIXTURE_LATE_OBSERVATION==='yes')emit({type:'assistant',session_id:session,timestamp:new Date().toISOString(),message:{model:'declared-fixture-model',content:[{type:'tool_use',id:'declared-join-tool',name:'Bash',input:{command:process.env.APR_FIXTURE_JOIN_COMMAND}}]}});emit({type:'result',session_id:session,permission_denials:[],is_error:false,result:'Declared terminal only; no reviewer join or acceptance.'});},Number(process.env.APR_FIXTURE_DELAY));`;
const begin = performance.now();
const invoke = () =>
  run(
    [
      'launch-reviewer',
      invitation,
      '--host',
      'claude',
      '--model',
      'declared-fixture-model',
      '--effort',
      'high',
      '--json',
    ],
    {
      cwd: project,
      env,
      signal: signal.signal,
      ...(explicitDeadline === undefined || mode === 'nested-deadline'
        ? {}
        : { deadline: explicitDeadline }),
      stdout: { write: (x) => (stdout += x) },
      stderr: { write: (x) => (stderr += x) },
      spawnProcess(file, args, options) {
        assert.equal(file, 'claude');
        spawns++;
        pending.push(
          currentOperationAuthorityContext().then(
            (c) =>
              (context = {
                remaining: c.deadline - performance.now(),
                sameSignal: c.signal === signal.signal,
                deadline: c.deadline,
              })
          )
        );
        const child = spawn(process.execPath, ['-e', childCode], {
          ...options,
          env: {
            ...options.env,
            APR_FIXTURE_DELAY: String(delayMs),
            APR_FIXTURE_JOIN_COMMAND: joinCommand,
            APR_FIXTURE_LATE_OBSERVATION: mode === 'slow-observation' ? 'yes' : 'no',
          },
        });
        children.push({ child, providerDeadline: options.env.APR_PROVIDER_DEADLINE_MS ?? null });
        return child;
      },
    }
  );
let code;
try {
  code =
    mode === 'nested-deadline'
      ? await withOperationAuthority(
          {
            operation: 'launch-reviewer',
            cwd: project,
            reviewWorkspace: workspace,
            signal: signal.signal,
            deadline: explicitDeadline,
          },
          invoke
        )
      : await invoke();
} catch (error) {
  if (!error.toJSON) throw error;
  stderr += JSON.stringify(error.toJSON()) + '\n';
  code = error.exitCode;
}
clearTimeout(timer);
await Promise.all(pending);
const observation = path.join(
  workspace,
  'provider',
  'claude',
  'observations',
  createHash('sha256')
    .update('join:' + reviewId)
    .digest('hex') + '.json'
);
const result = {
  mode,
  code,
  elapsed: performance.now() - begin,
  stdout,
  stderr,
  spawns,
  context,
  explicitDeadline: explicitDeadline ?? null,
  inheritedProviderDeadline: env.APR_PROVIDER_DEADLINE_MS ?? null,
  observationExists: fs.existsSync(observation),
  journalUnchanged: journalBefore === digest(journal),
  gitUnchanged: JSON.stringify(before) === JSON.stringify(snapshot()),
  children: children.map(({ child, providerDeadline }) => ({
    exitCode: child.exitCode,
    signalCode: child.signalCode,
    providerDeadline,
  })),
  actualProvider: false,
};
console.log(JSON.stringify(result));
