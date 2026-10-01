import assert from 'node:assert/strict';
import test from 'node:test';
import * as config from '../../src/config/load.mjs';

const primary = () => ({
  schema: 'ai-peer-review.primary-config/v2',
  authority: { authority_policy: 'unavailable', challenge_ttl_ms: 900000, verifier: null },
  review: { max_turns: 4 },
  hosts: {
    codex: {
      reviewer_guard: { enabled: true },
      automatic: { adapter_version: '2.0.0', capability: 'live-wait' },
    },
  },
});
const user = () => ({
  schema: 'ai-peer-review.user-config/v2',
  hosts: {
    codex: {
      identity: { provider: 'openai', host: 'codex', model_id: 'hint', model_display: 'Hint' },
      resume: { command: ['codex', 'resume'] },
      reviewer_guard: { command: ['peer-review-codex-hook'] },
      automatic: {
        server_command: ['peer-review-mcp'],
        tool_timeout_ms: 1000,
        heartbeat_interval_ms: 10,
        lease_ttl_ms: 20,
      },
    },
  },
});

test('primary policy permits a partial automatic contract without machine bindings', () => {
  assert.doesNotThrow(() => config.validateConfig(primary()));
});

test('classified assembly combines owned fields and explicit identity wins over hints', () => {
  const explicitIdentity = {
    codex: { ...user().hosts.codex.identity, model_id: 'selected', model_display: 'Selected' },
  };
  const p = primary();
  const u = user();
  const resolved = config.resolveConfigFields({ primary: p, user: u, explicitIdentity });
  assert.equal(resolved.review.max_turns, 4);
  assert.equal(resolved.hosts.codex.reviewer_guard.enabled, true);
  assert.deepEqual(resolved.hosts.codex.resume.command, ['codex', 'resume']);
  assert.deepEqual(resolved.hosts.codex.automatic, {
    ...p.hosts.codex.automatic,
    ...u.hosts.codex.automatic,
  });
  assert.equal(resolved.hosts.codex.identity.model_id, 'selected');
  u.hosts.codex.resume.command.push('new');
  assert.deepEqual(resolved.hosts.codex.resume.command, ['codex', 'resume']);
  assert.equal(p.hosts.codex.identity, undefined);
});

for (const [name, value] of Object.entries({
  authority: primary().authority,
  review: { max_turns: 9 },
})) {
  test(`user ${name} cannot override or fill primary policy`, () => {
    assert.throws(
      () => config.resolveConfigFields({ primary: primary(), user: { ...user(), [name]: value } }),
      { code: 'APR_CONFIG_INVALID' }
    );
  });
}
for (const [field, value] of Object.entries({
  identity: user().hosts.codex.identity,
  resume: { command: ['foreign'] },
  reviewer_guard: { enabled: true, command: ['foreign'] },
  automatic: { ...primary().hosts.codex.automatic, server_command: ['foreign'] },
})) {
  test(`primary ${field} cannot contain machine preferences`, () => {
    const p = primary();
    p.hosts.codex[field] = value;
    assert.throws(() => config.resolveConfigFields({ primary: p, user: user() }), {
      code: 'APR_CONFIG_INVALID',
    });
  });
}
for (const [field, value] of Object.entries({
  reviewer_guard: { enabled: false },
  automatic: { ...user().hosts.codex.automatic, capability: 'live-wait' },
})) {
  test(`user ${field} cannot carry policy fields`, () => {
    const u = user();
    u.hosts.codex[field] = value;
    assert.throws(() => config.resolveConfigFields({ primary: primary(), user: u }), {
      code: 'APR_CONFIG_INVALID',
    });
  });
}

test('each partial store and final automatic assembly are closed and validated', () => {
  const p = primary();
  const u = user();
  assert.throws(
    () =>
      config.resolveConfigFields({
        primary: { ...p, tool: { required_version: '1.0.0' } },
        user: u,
      }),
    { code: 'APR_CONFIG_INVALID' }
  );
  u.hosts.codex.automatic.lease_ttl_ms = 10;
  assert.throws(() => config.resolveConfigFields({ primary: p, user: u }), {
    code: 'APR_CONFIG_INVALID',
  });
  delete u.hosts.codex.automatic.lease_ttl_ms;
  assert.throws(() => config.resolveConfigFields({ primary: p, user: u }), {
    code: 'APR_CONFIG_INVALID',
  });
  assert.throws(() => config.resolveConfigFields({ primary: p, user: null }), {
    code: 'APR_CONFIG_INVALID',
  });
});

test('user setup ownership does not replace portable primary setup metadata', () => {
  const p = primary();
  const u = user();
  p.setup = {
    owner: 'ai-peer-review',
    version: 3,
    skill_sha256: 'a'.repeat(64),
    agents: ['codex'],
  };
  u.setup = { owner: 'ai-peer-review', version: 3, agents: ['claude'] };
  assert.deepEqual(config.resolveConfigFields({ primary: p, user: u }).setup, p.setup);
  p.setup.package_version = '1.0.0';
  assert.throws(() => config.resolveConfigFields({ primary: p, user: u }), {
    code: 'APR_CONFIG_INVALID',
  });
});

test('classified result declares its assembled schema and remains valid after portable setup assembly', () => {
  const p = primary();
  p.setup = { owner: 'ai-peer-review', version: 3, agents: ['codex'] };
  const resolved = config.resolveConfigFields({ primary: p, user: user() });
  assert.equal(resolved.schema, 'ai-peer-review.config/v2');
  assert.doesNotThrow(() => config.validateConfig(resolved));
  resolved.hosts.codex.automatic.extra = true;
  assert.throws(() => config.validateConfig(resolved), { code: 'APR_CONFIG_INVALID' });
});

test('shipped partial and assembled schemas independently enforce field ownership', async () => {
  const { readFileSync } = await import('node:fs');
  const { AjvJsonSchemaValidator } =
    await import('@modelcontextprotocol/sdk/validation/ajv-provider.js');
  const validator = new AjvJsonSchemaValidator();
  const validate = (file) => {
    const schema = JSON.parse(readFileSync(new URL(`../../schemas/${file}`, import.meta.url)));
    // These schemas use the shared draft-7/2020 subset; SDK Ajv uses draft 7.
    delete schema.$schema;
    return validator.getValidator(schema);
  };
  const p = validate('primary-config-v2.json');
  const u = validate('user-config-v2.json');
  const assembled = validate('config-v2.json');
  assert.equal(p(primary()).valid, true);
  assert.equal(u(user()).valid, true);
  assert.equal(
    p({ ...primary(), hosts: { codex: { resume: { command: ['foreign'] } } } }).valid,
    false
  );
  assert.equal(u({ ...user(), review: { max_turns: 5 } }).valid, false);
  assert.equal(
    assembled(config.resolveConfigFields({ primary: primary(), user: user() })).valid,
    true
  );
  assert.equal(
    assembled({
      schema: 'ai-peer-review.config/v2',
      hosts: { codex: { automatic: primary().hosts.codex.automatic } },
    }).valid,
    false
  );
});
