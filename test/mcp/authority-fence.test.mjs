import { event } from '../helpers/review-fixture.mjs';
// @story #136
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHandoffMcpServer } from '../../src/mcp/server.mjs';
test('MCP independently refuses source mutation before a delivery source creates effects', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-mcp-fence-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let handler;
  createHandoffMcpServer({
    repositoryRoot: root,
    createServer: () => ({
      registerTool: (_name, _definition, callback) => {
        handler = callback;
      },
    }),
    createDeliveries: () => {
      writeFileSync(path.join(root, 'effect'), 'unsafe');
      return {};
    },
    wait: async () => ({ schema: 'ai-peer-review.delivery/v1', status: 'delivered' }),
  });
  const result = await handler({ review_id: 'review-01', participant: 'author' });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.code, 'APR_RUNTIME_INSTALLATION_INVALID');
  assert.equal(existsSync(path.join(root, 'effect')), false);
});

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { authorityInstalledFixture } from '../helpers/authority-installed-fixture.mjs';
test('actual MCP stdio refuses source execution through its structured error channel', () => {
  const request = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'fixture', version: '1' },
      },
    },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'wait_for_handoff',
        arguments: { review_id: 'review-01', participant: 'author' },
      },
    },
  ];
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('../../bin/peer-review-mcp.mjs', import.meta.url))],
    {
      cwd: '/',
      encoding: 'utf8',
      input: request.map((value) => JSON.stringify(value)).join('\\n') + '\\n',
    }
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(JSON.parse(result.stderr).code, 'APR_RUNTIME_INSTALLATION_INVALID');
});
test(
  'MCP wait revalidates the selected runtime before returning an awaited delivery',
  { skip: 'Native broker verification paused for #102/#107' },
  async (t) => {
    const f = await authorityInstalledFixture(t);
    const result = f.execute(
      'import {writeFileSync} from "node:fs";import path from "node:path";import {createHandoffMcpServer} from ' +
        f.module('src/mcp/server.mjs') +
        ';let handler;createHandoffMcpServer({repositoryRoot:process.cwd(),createServer:()=>({registerTool:(_name,_definition,callback)=>{handler=callback;}}),createDeliveries:()=>({}),wait:async()=>{await Promise.resolve();writeFileSync(' +
        JSON.stringify(path.join(f.installed, 'src/errors.mjs')) +
        ', "// changed runtime");return {schema:"ai-peer-review.delivery/v1",status:"delivered"};}});const result=await handler({review_id:"review-01",participant:"author"});if(!result.isError)throw Error("stale runtime delivery accepted");console.log("fenced");'
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'fenced');
  }
);

test(
  'MCP refuses foreign review context before delivery-source effects',
  { skip: 'Native broker verification paused for #102/#107' },
  async (t) => {
    const f = await authorityInstalledFixture(t);
    const journal = event('review-created');
    journal.payload.startup.context.repository_root = f.linked;
    const result = f.execute(
      'import {mkdirSync,writeFileSync,existsSync} from "node:fs";import path from "node:path";import {createHandoffMcpServer} from ' +
        f.module('src/mcp/server.mjs') +
        ';const workspace=path.join(process.cwd(),".scratch/peer-review/review-01");mkdirSync(workspace,{recursive:true});writeFileSync(path.join(workspace,"events.jsonl"),JSON.stringify(' +
        JSON.stringify(journal) +
        ')+String.fromCharCode(10));let handler;createHandoffMcpServer({repositoryRoot:process.cwd(),createServer:()=>({registerTool:(_name,_definition,callback)=>{handler=callback;}}),createDeliveries:()=>{writeFileSync("foreign-mcp-effect","unsafe");return {};},wait:async()=>({schema:"ai-peer-review.delivery/v1",status:"delivered"})});const result=await handler({review_id:"review-01",participant:"author"});if(!result.isError||existsSync("foreign-mcp-effect"))throw Error("foreign context admitted");console.log("fenced");'
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'fenced');
  }
);
