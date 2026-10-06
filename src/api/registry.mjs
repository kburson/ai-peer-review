import {
  deepFreeze,
  requestSchemas,
  responseSchema,
  findingGrammar,
  findingIdSchema,
  interventionActions,
  critiqueSchema,
  revisionSchema,
  configExampleSchema,
} from './contracts.mjs';
import { apiErrorCatalog, ApiValidationError, validationIssue } from './errors.mjs';
import { validateContract } from './validate.mjs';

export { responseSchema, findingGrammar };
export function isFindingId(value) {
  if (typeof value !== 'string') return false;
  const match = new RegExp(findingGrammar.pattern, findingGrammar.flags).exec(value);
  return match !== null && match[0].length === value.length;
}
const minimal = {
  schema: requestSchemas.start_review.$id,
  request_id: 'apr-request-example',
  filepath: 'spec.md',
  stages: [{ kind: 'sar', max_rounds: 6 }],
};
const run = 'apr-run-example';
const common = { run_id: run, action_id: 'apr-action-example', expected_revision: 1 };
const turn = {
  schema: requestSchemas.submit_review_turn.$id,
  ...common,
  stage_attempt_id: 'apr-attempt-example',
  round: 1,
  phase: 'critique',
  reviewed_digest: 'a'.repeat(64),
  response_path: '.scratch/peer-review/run/submissions/solo/critique.json',
  response_digest: 'b'.repeat(64),
};
const interventionExamples = interventionActions.map((schema) => {
  const kind = schema.properties.kind.const;
  const parameters = {
    cancel: { reason: 'Requested by the controller' },
    resume: {},
    'replace-participant': {
      participant_id: 'worker-author',
      candidate: { selector: 'codex', model: 'gpt-6-astra', effort: 'high' },
      user_authorization: 'apr-authorization-example',
      reason: 'Verified replacement authorization',
    },
    'extend-cap': {
      requested_stage_id: 'stage-1',
      max_rounds: 12,
      user_authorization: 'apr-authorization-example',
      reason: 'Explicitly authorized additional rounds',
    },
    'reconcile-operation': {
      operation_id: 'operation-1',
      evidence_receipts: ['receipt-1'],
      user_authorization: 'apr-authorization-example',
      reason: 'Inspect exact operation identity and effects',
    },
    'resolve-checkpoint': {
      checkpoint_id: 'checkpoint-1',
      expected_current_digest: 'a'.repeat(64),
      disposition: 'restore-sealed',
      target_sealed_digest: 'b'.repeat(64),
      user_authorization: 'apr-authorization-example',
      reason: 'Restore sealed bytes after proved writer quiescence',
    },
    'acknowledge-unresolved': {
      operation_ids: ['operation-1'],
      user_authorization: 'apr-authorization-example',
      reason: 'End work while retaining every unresolved obligation',
    },
  };
  return {
    schema: requestSchemas.intervene_review.$id,
    ...common,
    action: { kind, ...parameters[kind] },
  };
});
const definitions = [
  ['start_review', 'start', 'start-request', [minimal]],
  ['preview_review', 'preview', 'start-request', [minimal]],
  [
    'wait_for_review',
    'wait',
    'waiting',
    [{ schema: requestSchemas.wait_for_review.$id, run_id: run, after_cursor: null }],
  ],
  [
    'get_review_status',
    'status',
    'status',
    [{ schema: requestSchemas.get_review_status.$id, run_id: run }],
  ],
  ['intervene_review', 'intervene', 'interventions', interventionExamples],
  [
    'submit_review_turn',
    'submit',
    'turns',
    [
      turn,
      {
        ...turn,
        phase: 'revision',
        response_path: '.scratch/peer-review/run/submissions/solo/revision.json',
      },
    ],
  ],
  [
    'get_peer_review_help',
    'help',
    'operations',
    [
      {
        schema: requestSchemas.get_peer_review_help.$id,
        topic: 'operations',
        format: 'structured',
      },
    ],
  ],
  [
    'cleanup_brokers',
    'cleanup',
    'broker',
    [
      { schema: requestSchemas.cleanup_brokers.$id, project: '/example/project', mode: 'dry-run' },
      {
        schema: requestSchemas.cleanup_brokers.$id,
        project: '/example/project',
        mode: 'apply',
        action_id: 'apr-action-cleanup',
      },
    ],
  ],
  [
    'reconcile_review_series',
    'reconcile-series',
    'evidence',
    ['new-lineage', 'repair-pointer', 'repoint'].map((action) => ({
      schema: requestSchemas.reconcile_review_series.$id,
      action_id: 'apr-action-series',
      filepath: 'spec.md',
      expected_pointer_digest: 'absent',
      expected_index_revision: 1,
      user_authorization: 'apr-authorization-series',
      reason: 'Explicit bounded pointer reconciliation',
      action,
      ...(action === 'new-lineage' ? {} : { series_id: 'apr-series-existing' }),
    })),
  ],
];
export const operationRegistry = deepFreeze(
  Object.fromEntries(
    definitions.map(([name, cli, topic, examples]) => {
      const requestSchema = requestSchemas[name === 'preview_review' ? 'start_review' : name];
      const description =
        name === 'preview_review'
          ? 'Validate and disclose the intended sequence without mutation.'
          : 'Use one versioned closed request for ' + name + '.';
      return [
        name,
        {
          name,
          cli,
          topic,
          description,
          requestSchema,
          responseSchema,
          responseSchemaDocument: 'schemas/api-response-v1.json',
          examples,
          errors: Object.keys(apiErrorCatalog),
          mcp: { name, description, inputSchema: requestSchema },
        },
      ];
    })
  )
);
const apiResponseExample = {
  schema: 'ai-peer-review.response/v1',
  ok: true,
  mutation_occurred: false,
  retry_safe: true,
  next_action: {
    tool: 'wait_for_review',
    arguments: operationRegistry.wait_for_review.examples[0],
  },
  summary: 'SAR is running; observations are unavailable until verified.',
  evidence_paths: ['docs/superpowers/peer-reviews/run/manifest.json'],
  run_id: run,
  status: 'running',
  revision: 1,
  cursor: 'cursor-1',
  input_validation: { duplicate_keys: 'not-observable' },
  liveness: {
    broker_heartbeat_age_ms: null,
    broker_health: 'unknown',
    last_protocol_progress_at: null,
    last_successful_observation_at: null,
    observation_age_ms: null,
    monitor_stale: true,
    unavailable_reason: 'not-observed',
  },
  participants: [
    {
      role: 'solo',
      participant_id: 'worker-solo',
      placement: 'headless',
      phase: 'critique',
      role_state: 'unknown',
      process_health: 'unknown',
      last_provider_event_at: null,
      provider_output_age_ms: null,
      unavailable_reason: 'not-observed',
    },
  ],
  fencing: { active: false, entries: [] },
  dispatch_admission: { held: false, reason_code: null, required_action: null },
};
const configExample = {
  schema: 'ai-peer-review.config/v2',
  review: { round_caps: { sar: 6, spr: 10, xpr: 12 }, max_rounds_limit: 1000 },
  orchestration: { default_profile: null, profiles: {} },
  monitoring: {
    liveness_interval_ms: 15000,
    warn_after_ms: 60000,
    reconcile_after_ms: 120000,
    hard_timeout_ms: 1800000,
  },
  broker: { idle_grace_ms: 60000 },
  telemetry: { grace_period_ms: 30000 },
  diagnostics: { retention_ms: 604800000, preserve_clean_logs: false },
  retries: { max_launch_attempts_per_candidate: 2, max_revision_attempts_per_round: 3 },
};
const errorExample = new ApiValidationError(
  'APR_REQUEST_INVALID',
  [
    validationIssue(
      '/stages/0/kind',
      'enum',
      'sra',
      ['sar', 'spr', 'xpr'],
      'Choose sar, spr or xpr.'
    ),
  ],
  { topic: 'start-request', schema: requestSchemas.start_review.$id }
).toJSON();
export const registryExamples = deepFreeze([
  { name: 'status', schema: responseSchema, value: apiResponseExample },
  { name: 'error', schema: responseSchema, value: errorExample },
  { name: 'config', schema: configExampleSchema, value: configExample },
  {
    name: 'critique',
    schema: critiqueSchema,
    value: {
      verdict: 'changes-requested',
      findings: [
        {
          finding_id: 'XPR-001',
          category: 'correctness',
          severity: 'high',
          rationale: 'The boundary requires a closed schema.',
          evidence: ['spec.md:1'],
        },
      ],
      resolutions: [],
    },
  },
  {
    name: 'revision',
    schema: revisionSchema,
    value: {
      dispositions: [
        {
          finding_id: 'XPR-001',
          disposition: 'fixed',
          rationale: 'The closed schema rejects the unexpected field.',
        },
      ],
      revised_digest: 'c'.repeat(64),
    },
  },
]);
export const schemaArtifacts = deepFreeze({
  'start-request-v1.json': requestSchemas.start_review,
  'api-response-v1.json': responseSchema,
  'status-request-v1.json': requestSchemas.get_review_status,
  'wait-request-v1.json': requestSchemas.wait_for_review,
  'intervention-request-v1.json': requestSchemas.intervene_review,
  'submit-turn-request-v1.json': requestSchemas.submit_review_turn,
  'help-request-v1.json': requestSchemas.get_peer_review_help,
  'cleanup-request-v1.json': requestSchemas.cleanup_brokers,
  'series-reconcile-request-v1.json': requestSchemas.reconcile_review_series,
  'finding-id-v1.json': findingIdSchema,
});
export const helpTopics = deepFreeze({
  operations:
    'CLI inline JSON, CLI --request files and MCP objects use identical closed contracts. Parsed-only MCP duplicate_keys is not-observable. Authentication is transport-bound; credentials and raw handles are forbidden.',
  'start-request':
    'stages is required. SAR has solo; SPR/XPR have author and reviewer. Explicit selector/model/effort expresses intent; installed admission separately checks actual provider capabilities. Canonical identity hashes exact submitted filepath and content before defaults.',
  classes:
    'SAR is one solo worker; SPR has distinct same-family author/reviewer sessions; XPR has distinct cross-family sessions. All workers are headless.',
  sequences:
    'Stages run in order; independent or shared prior_evidence is explicit. Non-acceptance stops later stages.',
  fallbacks:
    'fallback_kinds is nonempty, unique, includes the requested class and preserves role count. Profile policy is sealed independently.',
  permissions:
    'Controller intervention and participant submission use distinct sealed role bindings. User authorization is verified separately from its receipt reference.',
  monitoring:
    'monitoring.reconcile_after_ms=120000 is the provider-output liveness threshold for a read-only reconciliation probe, not proof of death. Liveness checks default to 15000ms; warning to 60000ms. A wrapper reconnect window bounds transport reattachment and identity revalidation; it does not reset liveness, hard timeout or stage budgets. Quiet live reasoning continues; unknown effects stay fenced.',
  waiting:
    'Transport timeout detaches the observer; it does not cancel the review. Resume after_cursor outside inference where the host permits it.',
  status:
    'Coarse status is independent of liveness, participants, fencing and dispatch_admission. Unavailable observations are null with a reason. A lost visible observer holds new dispatch until a verified visible surface reattaches.',
  interventions:
    'Every intervention carries action_id and expected_revision plus a closed action. Exact replay returns its receipt. Resume cannot clear unproved effects; unresolved findings cannot become acceptance.',
  turns:
    'submit_review_turn seals role-partition response bytes; critique and revision are separate closed content contracts. Reviewed digest and revision must match authority.',
  evidence:
    'Retain exact sealed responses, digests, patches, manifests and lineage. Pointer reconciliation is bounded and reversible; historical evidence is immutable.',
  broker:
    'Read-only tools do not silently create a run or broker. Cleanup apply requires action_id and revalidates ownership and activity.',
  errors:
    'Errors return bounded JSON Pointer issues with rule, safe received summary, expected shape, correction, truncation count, mutation status, retry safety and an exact help next_action.',
  journeys:
    '1. Construct start request, preview intent, start, then wait with the durable cursor. 2. Handle a typed intervention and resume wait. 3. Inspect retained evidence and explicitly reconcile a series pointer or clean up eligible brokers.',
  findings:
    'Use registry grammar ' +
    findingGrammar.id +
    '; whole-input matching and requested-stage lifetime uniqueness are required. APR_FINDINGS_UNRESOLVED prevents acceptance.',
});
export function renderHelp({ topic = 'operations', format = 'structured' } = {}) {
  if (!Object.hasOwn(helpTopics, topic))
    throw new ApiValidationError('APR_REQUEST_INVALID', [
      validationIssue('/topic', 'enum', topic, Object.keys(helpTopics)),
    ]);
  if (!['structured', 'json', 'text'].includes(format))
    throw new ApiValidationError('APR_REQUEST_INVALID', [
      validationIssue('/format', 'enum', format, ['structured', 'text']),
    ]);
  for (const example of registryExamples) {
    if (validateContract(example.schema, example.value).length)
      throw new Error('Invalid registry example: ' + example.name);
  }
  for (const operation of Object.values(operationRegistry))
    for (const example of operation.examples)
      if (validateContract(operation.requestSchema, example).length)
        throw new Error('Invalid request example: ' + operation.name);
  const envelope = {
    schema: 'ai-peer-review.help/v1',
    ok: true,
    mutation_occurred: false,
    retry_safe: true,
    next_action: null,
    topic,
    summary: helpTopics[topic],
    topics: helpTopics,
    operations: Object.fromEntries(
      Object.entries(operationRegistry).map(([name, operation]) => [
        name,
        {
          name,
          cli: operation.cli,
          topic: operation.topic,
          description: operation.description,
          request_schema: operation.requestSchema.$id,
          response_schema_document: operation.responseSchemaDocument,
          examples: operation.examples,
          errors: operation.errors,
        },
      ])
    ),
    errors: apiErrorCatalog,
    finding_grammar: findingGrammar,
    examples: registryExamples.map(({ name, value }) => ({ name, value })),
    compatibility: responseSchema.description,
  };
  return format === 'text'
    ? {
        ...envelope,
        text:
          topic +
          '\n\n' +
          helpTopics[topic] +
          '\n\nOperations:\n' +
          definitions.map(([name, cli]) => '  ' + name + ' / peer-review ' + cli).join('\n') +
          '\n',
      }
    : envelope;
}
