export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}
// Reused documents are inlined as schemas, not re-declared resource identities.
const inlineSchema = (schema) =>
  JSON.parse(
    JSON.stringify(schema, (key, value) => (key === '$id' || key === '$schema' ? undefined : value))
  );
const string = { type: 'string', minLength: 1, maxLength: 4096 };
const id = { type: 'string', minLength: 1, maxLength: 256 };
const positive = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const age = { type: ['integer', 'null'], minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const digest = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const nullableString = { type: ['string', 'null'], minLength: 1, maxLength: 4096 };
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required,
});
const array = (items, options = {}) => ({ type: 'array', items, ...options });
const enumeration = (...values) => ({ enum: values });
const candidate = object({ selector: id, model: id, effort: id }, ['selector']);
const selection = object({ selector: id, model: id, effort: id }, []);
export const findingGrammar = deepFreeze({
  id: 'ai-peer-review.finding-id/v1',
  pattern: '^[A-Za-z][A-Za-z0-9._-]{0,63}$',
  flags: '',
  minLength: 1,
  maxLength: 64,
});
export const findingIdSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: findingGrammar.id,
  type: 'string',
  pattern: findingGrammar.pattern,
  minLength: 1,
  maxLength: 64,
};
const stages = ['sar', 'spr', 'xpr'].map((kind) =>
  object(
    {
      kind: { const: kind },
      max_rounds: { ...positive, maximum: 1000 },
      profile: id,
      prior_evidence: enumeration('independent', 'shared'),
      fallback_kinds: array(enumeration(...(kind === 'sar' ? ['sar'] : ['spr', 'xpr'])), {
        minItems: 1,
        uniqueItems: true,
        contains: { const: kind },
      }),
      participants: object(
        kind === 'sar' ? { solo: selection } : { author: selection, reviewer: selection },
        []
      ),
    },
    ['kind']
  )
);
const request = (name, properties, required) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'ai-peer-review.' + name + '-request/v1',
  ...object({ schema: { const: 'ai-peer-review.' + name + '-request/v1' }, ...properties }, [
    'schema',
    ...required,
  ]),
});
const userAuthorization = string;
const action = (kind, parameters, required = Object.keys(parameters)) =>
  object({ kind: { const: kind }, ...parameters }, ['kind', ...required]);
export const interventionActions = [
  action('cancel', { reason: string }),
  action('resume', {}),
  action('replace-participant', {
    participant_id: id,
    candidate,
    user_authorization: userAuthorization,
    reason: string,
  }),
  action('extend-cap', {
    requested_stage_id: id,
    max_rounds: { ...positive, maximum: 1000 },
    user_authorization: userAuthorization,
    reason: string,
  }),
  action('reconcile-operation', {
    operation_id: id,
    evidence_receipts: array(id, { minItems: 1 }),
    user_authorization: userAuthorization,
    reason: string,
  }),
  action(
    'resolve-checkpoint',
    {
      checkpoint_id: id,
      expected_current_digest: digest,
      disposition: enumeration('retain-partial', 'restore-sealed'),
      target_sealed_digest: digest,
      user_authorization: userAuthorization,
      reason: string,
    },
    ['checkpoint_id', 'expected_current_digest', 'disposition', 'user_authorization', 'reason']
  ),
  action('acknowledge-unresolved', {
    operation_ids: array(id, { minItems: 1, uniqueItems: true }),
    user_authorization: userAuthorization,
    reason: string,
  }),
];
export const requestSchemas = deepFreeze({
  start_review: request(
    'start',
    {
      request_id: id,
      filepath: string,
      stages: array({ oneOf: stages }, { minItems: 1 }),
      lineage_mode: enumeration('frontmatter', 'sidecar'),
      unattended: { type: 'boolean' },
    },
    ['request_id', 'filepath', 'stages']
  ),
  get_review_status: request('status', { run_id: id }, ['run_id']),
  wait_for_review: request('wait', { run_id: id, after_cursor: nullableString }, [
    'run_id',
    'after_cursor',
  ]),
  intervene_review: request(
    'intervention',
    {
      run_id: id,
      action_id: id,
      expected_revision: positive,
      action: { oneOf: interventionActions },
    },
    ['run_id', 'action_id', 'expected_revision', 'action']
  ),
  submit_review_turn: request(
    'submit-turn',
    {
      run_id: id,
      stage_attempt_id: id,
      round: positive,
      action_id: id,
      expected_revision: positive,
      phase: enumeration('critique', 'revision'),
      reviewed_digest: digest,
      response_path: string,
      response_digest: digest,
    },
    [
      'run_id',
      'stage_attempt_id',
      'round',
      'action_id',
      'expected_revision',
      'phase',
      'reviewed_digest',
      'response_path',
      'response_digest',
    ]
  ),
  get_peer_review_help: request(
    'help',
    { topic: string, format: enumeration('structured', 'text') },
    ['topic']
  ),
  cleanup_brokers: {
    ...request(
      'cleanup',
      { project: string, mode: enumeration('dry-run', 'apply'), action_id: id },
      ['project', 'mode']
    ),
    allOf: [
      { if: { properties: { mode: { const: 'apply' } } }, then: { required: ['action_id'] } },
    ],
  },
  reconcile_review_series: {
    ...request(
      'series-reconcile',
      {
        action_id: id,
        filepath: string,
        expected_pointer_digest: { oneOf: [digest, { const: 'absent' }] },
        expected_index_revision: positive,
        user_authorization: userAuthorization,
        reason: string,
        action: enumeration('repair-pointer', 'repoint', 'new-lineage'),
        series_id: id,
      },
      [
        'action_id',
        'filepath',
        'expected_pointer_digest',
        'expected_index_revision',
        'user_authorization',
        'reason',
        'action',
      ]
    ),
    allOf: [
      {
        if: { properties: { action: enumeration('repair-pointer', 'repoint') } },
        then: { required: ['series_id'] },
      },
    ],
  },
});
export const nextActionSchema = {
  oneOf: Object.entries(requestSchemas).map(([tool, argumentsSchema]) =>
    object({ tool: { const: tool }, arguments: inlineSchema(argumentsSchema) })
  ),
};
export const issueSchema = object({
  pointer: { type: 'string', maxLength: 240 },
  rule: id,
  received: { type: ['string', 'number', 'boolean', 'null'], maxLength: 256 },
  expected: { oneOf: [string, array({ type: ['string', 'number', 'boolean', 'null'] })] },
  correction: string,
});
const diagnostics = object({
  issues: array(issueSchema, { maxItems: 20 }),
  truncated_issue_count: { type: 'integer', minimum: 0 },
  help_topic: string,
  schema: nullableString,
  examples: array({ oneOf: Object.values(requestSchemas).map(inlineSchema) }),
});
const error = object({
  code: { type: 'string', pattern: '^APR_[A-Z0-9_]+$' },
  message: string,
  ...diagnostics.properties,
});
export const responseSchema = deepFreeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'ai-peer-review.api-response/v1',
  description:
    'API registry envelope, transport tag ai-peer-review.response/v1. The historical response-v1.json reader owns legacy participant responses; choose the boundary-specific document, never the tag alone.',
  ...object(
    {
      schema: { const: 'ai-peer-review.response/v1' },
      ok: { type: 'boolean' },
      mutation_occurred: { type: 'boolean' },
      retry_safe: { type: 'boolean' },
      next_action: { oneOf: [nextActionSchema, { type: 'null' }] },
      summary: { type: 'string', maxLength: 1024 },
      evidence_paths: array(string, { maxItems: 32 }),
      run_id: id,
      status: enumeration(
        'starting',
        'running',
        'awaiting-participant',
        'reconciling',
        'intervention-required',
        'accepted',
        'cancelled',
        'failed'
      ),
      revision: positive,
      cursor: id,
      input_validation: object({ duplicate_keys: enumeration('checked', 'not-observable') }),
      liveness: object({
        broker_heartbeat_age_ms: age,
        broker_health: enumeration('live', 'lost', 'recovering', 'unknown', 'not-applicable'),
        last_protocol_progress_at: nullableString,
        last_successful_observation_at: nullableString,
        observation_age_ms: age,
        monitor_stale: { type: 'boolean' },
        unavailable_reason: nullableString,
      }),
      participants: array(
        object({
          role: enumeration('controller', 'solo', 'author', 'reviewer'),
          participant_id: id,
          placement: { const: 'headless' },
          phase: enumeration('launch', 'critique', 'revision', 'waiting', 'terminal'),
          role_state: enumeration(
            'active',
            'awaiting-resume',
            'quiet',
            'stopped',
            'unknown',
            'complete'
          ),
          process_health: enumeration('live', 'dead', 'unknown', 'not-applicable'),
          last_provider_event_at: nullableString,
          provider_output_age_ms: age,
          unavailable_reason: nullableString,
        })
      ),
      fencing: object({
        active: { type: 'boolean' },
        entries: array(
          object({
            participant_id: nullableString,
            operation_id: id,
            reason_code: id,
            outstanding_obligations: array(string),
            recovery_action: nextActionSchema,
          })
        ),
      }),
      dispatch_admission: {
        oneOf: [
          object({
            held: { const: false },
            reason_code: { type: 'null' },
            required_action: { type: 'null' },
          }),
          object({
            held: { const: true },
            reason_code: { const: 'awaiting-visible-observer' },
            required_action: { const: 'reattach-visible-observer' },
          }),
        ],
      },
      error,
      details: diagnostics,
      result: object(
        { action_id: id, mode: enumeration('dry-run', 'apply'), evidence_paths: array(string) },
        ['evidence_paths']
      ),
    },
    ['schema', 'ok', 'mutation_occurred', 'retry_safe', 'next_action']
  ),
  allOf: [
    { if: { properties: { ok: { const: false } } }, then: { required: ['error'] } },
    {
      if: { required: ['run_id'] },
      then: {
        required: [
          'status',
          'revision',
          'cursor',
          'liveness',
          'participants',
          'fencing',
          'dispatch_admission',
          'evidence_paths',
        ],
      },
    },
  ],
});
const resolution = object(
  {
    finding_id: inlineSchema(findingIdSchema),
    state: enumeration(
      'fixed',
      'withdrawn',
      'accepted-rationale',
      'duplicate',
      'superseded',
      'split'
    ),
    rationale: string,
    target_ids: array(inlineSchema(findingIdSchema), { minItems: 1, uniqueItems: true }),
  },
  ['finding_id', 'state', 'rationale']
);
export const critiqueSchema = deepFreeze(
  object({
    verdict: enumeration('clean', 'changes-requested'),
    findings: array(
      object({
        finding_id: inlineSchema(findingIdSchema),
        category: string,
        severity: string,
        rationale: string,
        evidence: array(string, { minItems: 1 }),
      })
    ),
    resolutions: array(resolution),
  })
);
export const revisionSchema = deepFreeze(
  object({
    dispositions: array(
      object({
        finding_id: inlineSchema(findingIdSchema),
        disposition: enumeration(
          'fixed',
          'disputed',
          'withdrawn',
          'duplicate',
          'superseded',
          'split'
        ),
        rationale: string,
      })
    ),
    revised_digest: digest,
  })
);
// Discovery-only structural contract. Task 8 owns runtime config resolution,
// merging, defaults, cross-field limits and the config-v2 artifact.
const classPolicy = object(
  {
    sar: array({ const: 'sar' }, { minItems: 1, uniqueItems: true }),
    spr: array(enumeration('spr', 'xpr'), { minItems: 1, uniqueItems: true }),
    xpr: array(enumeration('spr', 'xpr'), { minItems: 1, uniqueItems: true }),
  },
  []
);
const profile = object(
  {
    solo: array(candidate, { minItems: 1 }),
    author: array(candidate, { minItems: 1 }),
    reviewer: array(candidate, { minItems: 1 }),
    fallback_kinds_by_class: classPolicy,
  },
  []
);
export const configExampleSchema = deepFreeze(
  object({
    schema: { const: 'ai-peer-review.config/v2' },
    review: object({
      round_caps: object({
        sar: { ...positive, maximum: 1000 },
        spr: { ...positive, maximum: 1000 },
        xpr: { ...positive, maximum: 1000 },
      }),
      max_rounds_limit: { ...positive, maximum: 1000 },
    }),
    orchestration: object({
      default_profile: nullableString,
      profiles: { type: 'object', additionalProperties: profile },
    }),
    monitoring: object({
      liveness_interval_ms: positive,
      warn_after_ms: positive,
      reconcile_after_ms: positive,
      hard_timeout_ms: positive,
    }),
    broker: object({ idle_grace_ms: positive }),
    telemetry: object({ grace_period_ms: positive }),
    diagnostics: object({ retention_ms: positive, preserve_clean_logs: { type: 'boolean' } }),
    retries: object({
      max_launch_attempts_per_candidate: { ...positive, maximum: 10 },
      max_revision_attempts_per_round: { ...positive, maximum: 10 },
    }),
  })
);
