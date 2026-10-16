// @story #190
// Real installed SDK transport; no provider identity or acceptance claim.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { setTimeout as wait } from 'node:timers/promises';
import { installRuntimeFixture } from '../helpers/runtime-package.mjs';
import { event } from '../helpers/review-fixture.mjs';

test(
  'installed MCP receives a pending local handoff after 30s without primary enrollment',
  { timeout: 800000 },
  async (t) => {
    const f = installRuntimeFixture(t);
    const directory = path.join(f.directory, 'ordinary project');
    mkdirSync(directory);
    const root = realpathSync.native(directory);
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
    git('init', '-b', 'trunk');
    git('config', 'user.name', 'MCP local fixture');
    git('config', 'user.email', 'mcp@example.invalid');
    writeFileSync(path.join(root, 'artifact.md'), '# Original\n');
    git('add', 'artifact.md');
    git('commit', '-m', 'fixture');
    writeFileSync(path.join(root, 'artifact.md'), '# Existing author edit\n');
    mkdirSync(path.join(root, '.scratch', 'peer-review'), { recursive: true });
    const legacy = path.join(root, '.scratch', 'peer-review', 'review-01');
    mkdirSync(legacy);
    const created = event('review-created');
    created.payload.startup.context.repository_root = root;
    const journal = path.join(legacy, 'events.jsonl');
    writeFileSync(journal, JSON.stringify(created) + '\n');
    const registrationDirectory = path.join(root, '.git', 'ai-peer-review');
    mkdirSync(registrationDirectory, { mode: 0o700 });
    const registration = path.join(registrationDirectory, 'primary-activation.json');
    // Deliberately stale fixture input, never a current activation claim.
    writeFileSync(
      registration,
      JSON.stringify({
        schema: 'ai-peer-review.primary-activation/v1',
        primary_root: root,
        common_dir: path.join(root, '.git'),
        primary_initialized: true,
        integration_contract: 'ai-peer-review.integration/v1',
        owned_blobs: {
          config: { path: '.ai-peer-review/config.json', blob: 'a'.repeat(40) },
          skill: { path: '.ai-peer-review/skills/peer-review/SKILL.md', blob: 'b'.repeat(40) },
        },
      }) + '\n',
      { mode: 0o600 }
    );
    const prepared = f.execute(
      `
    import {startReview,joinReview} from ${f.module('src/cli/run.mjs')};
    import {participantIdentity} from ${f.module('src/identity/registry.mjs')};
    const identity=(role)=>participantIdentity({role,host:'codex',provider:'openai',modelId:'declared-model',modelDisplay:'Declared MCP fixture',sessionId:'mcp-fixture-'+role,source:'declared',joinedAt:new Date().toISOString()});
    const author=identity('author'),reviewer=identity('reviewer');
    const started=await startReview({cwd:process.cwd(),artifact:'artifact.md',artifactKind:'spec',issue:190,reviewerProvider:'codex',reviewerModel:'declared-model',reviewerEffort:'medium',transportMode:'manual',identity:author});
    const joined=await joinReview({cwd:process.cwd(),invitation:started.paths.reviewer_invitation,identity:reviewer});
    console.log(JSON.stringify({workspace:started.paths.workspace,response:joined.paths.response,reviewer}));
  `,
      { cwd: root }
    );
    assert.equal(prepared.status, 0, prepared.stderr);
    const current = JSON.parse(prepared.stdout);
    let notes = readFileSync(current.response, 'utf8');
    for (const [heading, value] of [
      ['Summary', 'Accepted fixture.'],
      ['Findings', 'None.'],
      ['Required changes', 'None.'],
      ['Optional suggestions', 'None.'],
      ['Decision', 'accepted'],
    ]) {
      const expression = new RegExp('(## ' + heading + '\\n\\n)[\\s\\S]*?(?=\\n\\n## |$)');
      notes = notes.replace(expression, '$1' + value);
    }
    assert.match(notes, /## Decision\s+accepted(?:\s|$)/);
    writeFileSync(current.response, notes);
    const snapshot = () => ({
      head: git('rev-parse', 'HEAD'),
      index: createHash('sha256')
        .update(readFileSync(path.join(root, '.git', 'index')))
        .digest('hex'),
      artifact: readFileSync(path.join(root, 'artifact.md'), 'utf8'),
      status: git('status', '--porcelain'),
      registration: readFileSync(registration, 'utf8'),
      legacyJournal: readFileSync(journal, 'utf8'),
    });
    const before = snapshot();
    const client = new Client({ name: 'installed-local-handoff-test', version: '1' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(f.packageRoot, 'bin', 'peer-review-mcp.mjs')],
      cwd: root,
      stderr: 'pipe',
    });
    let stderr = '';
    transport.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    t.after(() => client.close());
    try {
      await client.connect(transport, { timeout: 30000 });
    } catch (error) {
      assert.fail(`Ordinary project MCP discovery refused: ${stderr || error.message}`);
    }
    const tools = await client.listTools({}, { timeout: 30000 });
    assert.deepEqual(
      tools.tools.map((tool) => tool.name),
      ['wait_for_handoff']
    );
    const refused = await client.callTool(
      {
        name: 'wait_for_handoff',
        arguments: { review_id: 'review-missing', participant: 'author' },
      },
      undefined,
      { timeout: 30000 }
    );
    assert.equal(refused.isError, true);
    assert.equal(
      refused.structuredContent.code,
      'APR_EVENT_LOG_MISSING',
      JSON.stringify(refused.structuredContent)
    );
    const historical = await client.callTool(
      {
        name: 'wait_for_handoff',
        arguments: { review_id: 'review-01', participant: 'reviewer' },
      },
      undefined,
      { timeout: 30000 }
    );
    assert.equal(historical.isError, true);
    assert.equal(
      historical.structuredContent.code,
      'APR_LEGACY_REVIEW_READ_ONLY',
      JSON.stringify(historical.structuredContent)
    );
    assert.equal(existsSync(path.join(legacy, 'deliveries')), false);
    const eventsFile = path.join(current.workspace, 'events.jsonl');
    const readEvents = () =>
      readFileSync(eventsFile, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
    const cursor = readEvents().at(-1).sequence;
    // This is an actual pending SDK wait, with a declared fixture session's
    // production submit publishing the genuine sealed event and receipt later.
    // Passive transport uses the existing total-test allowance, separately from
    // unchanged 30s control operations.
    const pending = client.callTool(
      {
        name: 'wait_for_handoff',
        arguments: {
          review_id: path.basename(current.workspace),
          participant: 'author',
          after_sequence: cursor,
        },
      },
      undefined,
      { timeout: 800000 }
    );
    pending.catch(() => {});
    await wait(31000);
    const submitted = f.execute(
      `
    import {submitReviewTurn} from ${f.module('src/cli/run.mjs')};
    console.log(JSON.stringify(await submitReviewTurn({cwd:process.cwd(),workspace:${JSON.stringify(current.workspace)},identity:${JSON.stringify(current.reviewer)},decision:'accepted'})));
  `,
      { cwd: root }
    );
    assert.equal(submitted.status, 0, submitted.stderr);
    console.error('MCP fixture: late handoff submitted');
    const canonical = await client.callTool(
      {
        name: 'wait_for_handoff',
        arguments: {
          review_id: path.basename(current.workspace),
          participant: 'author',
          after_sequence: cursor,
        },
      },
      undefined,
      { timeout: 30000 }
    );
    assert.equal(canonical.isError, undefined, JSON.stringify(canonical.structuredContent));
    console.error('MCP fixture: independent canonical delivery visible');
    const delivered = await pending;
    console.error('MCP fixture: late handoff received');
    const expected = readEvents().findLast((item) => item.type === 'delivery-written');
    assert.equal(delivered.isError, undefined, JSON.stringify(delivered.structuredContent));
    assert.equal(delivered.structuredContent.status, 'delivered');
    assert.equal(delivered.structuredContent.sequence, expected.sequence);
    assert.equal(delivered.structuredContent.digest, expected.payload.delivery.digest);
    assert.equal(delivered.structuredContent.participant, 'author');
    const cancellation = new AbortController();
    const cancelled = client.callTool(
      {
        name: 'wait_for_handoff',
        arguments: {
          review_id: path.basename(current.workspace),
          participant: 'author',
          after_sequence: expected.sequence,
        },
      },
      undefined,
      { timeout: 30000, signal: cancellation.signal }
    );
    const rejected = assert.rejects(cancelled, /fixture cancellation/);
    await wait(50);
    cancellation.abort(new Error('fixture cancellation'));
    await rejected;
    console.error('MCP fixture: client cancellation observed');
    // Cancellation is a client transport rejection, never an accepted handoff.
    // The same server remains available and can replay the canonical receipt.
    const replay = await client.callTool(
      {
        name: 'wait_for_handoff',
        arguments: {
          review_id: path.basename(current.workspace),
          participant: 'author',
          after_sequence: cursor,
        },
      },
      undefined,
      { timeout: 30000 }
    );
    assert.equal(replay.isError, undefined, JSON.stringify(replay.structuredContent));
    assert.deepEqual(replay.structuredContent, delivered.structuredContent);
    console.error('MCP fixture: canonical receipt replayed');
    // A separate later request also gets a fresh bounded observation.
    const later = await client.callTool(
      {
        name: 'wait_for_handoff',
        arguments: { review_id: 'review-missing', participant: 'reviewer' },
      },
      undefined,
      { timeout: 30000 }
    );
    assert.equal(later.isError, true);
    assert.equal(later.structuredContent.code, 'APR_EVENT_LOG_MISSING');
    assert.equal(existsSync(path.join(root, '.scratch', 'peer-review', 'review-missing')), false);
    assert.equal(existsSync(path.join(root, '.ai-peer-review')), false);
    assert.equal(existsSync(path.join(root, '.git', 'ai-peer-review-primary-admission')), false);
    assert.deepEqual(snapshot(), before);
  }
);
