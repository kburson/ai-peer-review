import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';

import { canonicalProjectIdentity, rootDigest } from '../../src/broker/identity.mjs';
import { brokerPaths } from '../../src/broker/paths.mjs';

function platform({ kind = 'linux', locations = {}, canonical = {}, userId = '501', limit } = {}) {
  return Object.freeze({
    kind,
    userId: () => userId,
    canonicalPath: (value) => canonical[value] ?? value,
    repository: Object.freeze({
      physicalLocation: (cwd) => locations[cwd] ?? null,
    }),
    ...(limit === undefined ? {} : { maxEndpointLength: limit }),
  });
}

function identityFor(digest) {
  return Object.freeze({ digest });
}

test('rootDigest hashes the literal versioned physical-root tuple', () => {
  const tuple = [
    'ai-peer-review.broker-root/v1',
    '/physical/project',
    '/physical/project/.git',
    '501',
  ];

  assert.equal(
    rootDigest(tuple),
    createHash('sha256').update(JSON.stringify(tuple), 'utf8').digest('hex')
  );
  assert.notEqual(
    rootDigest(tuple),
    rootDigest([tuple[0], '/physical/linked', tuple[2], tuple[3]])
  );
});

test('canonicalProjectIdentity collapses symlink aliases to one physical Git worktree', () => {
  const identity = canonicalProjectIdentity({
    cwd: '/logical/project-alias',
    platform: platform({
      locations: {
        '/logical/project-alias': {
          physicalRoot: '/physical/project',
          commonDirectory: '/physical/project/.git',
        },
      },
      canonical: {
        '/physical/project': '/physical/project',
        '/physical/project/.git': '/physical/project/.git',
      },
    }),
  });

  assert.deepEqual(identity.tuple, [
    'ai-peer-review.broker-root/v1',
    '/physical/project',
    '/physical/project/.git',
    '501',
  ]);
  assert.equal(identity.physicalRoot, '/physical/project');
  assert.equal(identity.commonDirectory, '/physical/project/.git');
  assert.equal(identity.userId, '501');
});

test('canonicalProjectIdentity keeps linked worktrees separate while retaining shared Git storage', () => {
  const shared = '/physical/repository/.git';
  const first = canonicalProjectIdentity({
    cwd: '/worktrees/one',
    platform: platform({
      locations: {
        '/worktrees/one': { physicalRoot: '/worktrees/one', commonDirectory: shared },
      },
    }),
  });
  const second = canonicalProjectIdentity({
    cwd: '/worktrees/two',
    platform: platform({
      locations: {
        '/worktrees/two': { physicalRoot: '/worktrees/two', commonDirectory: shared },
      },
    }),
  });

  assert.equal(first.commonDirectory, second.commonDirectory);
  assert.notEqual(first.physicalRoot, second.physicalRoot);
  assert.notEqual(first.digest, second.digest);
});

test('canonicalProjectIdentity keeps a canonical non-Git root with null common storage', () => {
  const identity = canonicalProjectIdentity({
    cwd: '/logical/non-git',
    platform: platform({
      canonical: { '/logical/non-git': '/physical/non-git' },
      userId: 'S-1-5-21-42',
    }),
  });

  assert.deepEqual(identity.tuple, [
    'ai-peer-review.broker-root/v1',
    '/physical/non-git',
    null,
    'S-1-5-21-42',
  ]);
  assert.equal(identity.commonDirectory, null);
});

test('canonicalProjectIdentity preserves Unicode and filesystem-canonical Windows paths', () => {
  const identity = canonicalProjectIdentity({
    cwd: 'c:\\Users\\Kendrick\\Café',
    platform: platform({
      kind: 'win32',
      userId: 'S-1-5-21-9000',
      locations: {
        'c:\\Users\\Kendrick\\Café': {
          physicalRoot: 'C:\\Users\\Kendrick\\Café',
          commonDirectory: 'C:\\Users\\Kendrick\\Café\\.git',
        },
      },
      canonical: {
        'C:\\Users\\Kendrick\\Café': 'C:\\Users\\Kendrick\\Café',
        'C:\\Users\\Kendrick\\Café\\.git': 'C:\\Users\\Kendrick\\Café\\.git',
      },
    }),
  });

  assert.deepEqual(identity.tuple.slice(1), [
    'C:\\Users\\Kendrick\\Café',
    'C:\\Users\\Kendrick\\Café\\.git',
    'S-1-5-21-9000',
  ]);
});

test('brokerPaths selects macOS and Linux cache roots without version routing inputs', () => {
  const digest = 'a'.repeat(64);
  const mac = brokerPaths({
    identity: identityFor(digest),
    platform: platform({ kind: 'darwin' }),
    env: {},
    home: '/Users/alex',
  });
  const linux = brokerPaths({
    identity: identityFor(digest),
    platform: platform({ kind: 'linux' }),
    env: { XDG_CACHE_HOME: '/var/cache/alex' },
    home: '/home/alex',
    versions: { package_version: '0.2.2', broker_protocol_version: '1', node_major: 24 },
  });
  const upgraded = brokerPaths({
    identity: identityFor(digest),
    platform: platform({ kind: 'linux' }),
    env: { XDG_CACHE_HOME: '/var/cache/alex' },
    home: '/home/alex',
    versions: { package_version: '0.3.0', broker_protocol_version: '2', node_major: 26 },
  });

  assert.deepEqual(mac, {
    directory: `/Users/alex/Library/Caches/ai-peer-review/brokers/${digest}`,
    endpoint: `/Users/alex/Library/Caches/ai-peer-review/brokers/${digest}/broker.sock`,
    lock: `/Users/alex/Library/Caches/ai-peer-review/brokers/${digest}/broker.lock`,
    metadata: `/Users/alex/Library/Caches/ai-peer-review/brokers/${digest}/broker.json`,
  });
  assert.equal(linux.directory, `/var/cache/alex/ai-peer-review/brokers/${digest}`);
  assert.equal(linux.endpoint, upgraded.endpoint);
});

test('brokerPaths uses the logical Windows socket label and a digest-bearing named pipe', () => {
  const digest = 'b'.repeat(64);
  const paths = brokerPaths({
    identity: identityFor(digest),
    platform: platform({ kind: 'win32' }),
    env: { LOCALAPPDATA: 'C:\\Users\\Alex\\AppData\\Local' },
    home: 'C:\\Users\\Alex',
  });

  assert.deepEqual(paths, {
    directory: `C:\\Users\\Alex\\AppData\\Local\\ai-peer-review\\brokers\\${digest}`,
    endpoint: `\\\\.\\pipe\\ai-peer-review-brokers-${digest}-broker.sock`,
    lock: `C:\\Users\\Alex\\AppData\\Local\\ai-peer-review\\brokers\\${digest}\\broker.lock`,
    metadata: `C:\\Users\\Alex\\AppData\\Local\\ai-peer-review\\brokers\\${digest}\\broker.json`,
  });
});

test('brokerPaths falls back to the Linux home cache only when XDG_CACHE_HOME is absent', () => {
  const paths = brokerPaths({
    identity: identityFor('c'.repeat(64)),
    platform: platform({ kind: 'linux' }),
    env: {},
    home: '/home/alex',
  });

  assert.equal(paths.directory, `/home/alex/.cache/ai-peer-review/brokers/${'c'.repeat(64)}`);
  assert.throws(
    () =>
      brokerPaths({
        identity: identityFor('c'.repeat(64)),
        platform: platform({ kind: 'linux' }),
        env: { XDG_CACHE_HOME: 'relative-cache' },
        home: '/home/alex',
      }),
    (error) => error.code === 'APR_BROKER_PATH_INVALID'
  );
});

test('brokerPaths isolates project B and refuses unsupported or overlong endpoints before opening one', () => {
  const projectA = brokerPaths({
    identity: identityFor('d'.repeat(64)),
    platform: platform({ kind: 'linux' }),
    env: { XDG_CACHE_HOME: '/cache' },
    home: '/home/alex',
  });
  const projectB = brokerPaths({
    identity: identityFor('e'.repeat(64)),
    platform: platform({ kind: 'linux' }),
    env: { XDG_CACHE_HOME: '/cache' },
    home: '/home/alex',
  });

  assert.notEqual(projectA.endpoint, projectB.endpoint);
  assert.match(projectB.endpoint, /e{64}\/broker\.sock$/);
  assert.throws(
    () =>
      brokerPaths({
        identity: identityFor('f'.repeat(64)),
        platform: platform({ kind: 'freebsd' }),
        env: {},
        home: '/home/alex',
      }),
    (error) => error.code === 'APR_BROKER_ENDPOINT_UNSUPPORTED'
  );
  assert.throws(
    () =>
      brokerPaths({
        identity: identityFor('f'.repeat(64)),
        platform: platform({ kind: 'linux', limit: 20 }),
        env: { XDG_CACHE_HOME: '/cache' },
        home: '/home/alex',
      }),
    (error) => error.code === 'APR_BROKER_ENDPOINT_TOO_LONG'
  );
});
