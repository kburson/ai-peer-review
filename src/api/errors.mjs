import { AprError } from '../errors.mjs';

export const apiErrorCatalog = Object.freeze({
  APR_REQUEST_INVALID: Object.freeze({
    message: 'Review request is malformed.',
    recovery: 'Correct the reported fields and retry the exact registered operation.',
  }),
  APR_OPERATION_UNKNOWN: Object.freeze({
    message: 'The operation is not registered.',
    recovery: 'Read the operation registry and choose a registered operation.',
  }),
  APR_FINDINGS_UNRESOLVED: Object.freeze({
    message: 'Unresolved findings prevent acceptance.',
    recovery: 'Resolve every open finding through the registered critique and revision contract.',
  }),
  APR_FINDING_ID_CONFLICT: Object.freeze({
    message: 'A finding ID is already used in this requested-stage ledger.',
    recovery: 'Choose fresh finding IDs and resubmit the same phase and revision.',
  }),
  APR_FALLBACK_TOPOLOGY_INVALID: Object.freeze({
    message: 'Fallback classes change the requested role count.',
    recovery: 'Use a separate requested stage for a different role count.',
  }),
});

export function safeReceived(value) {
  if (value === undefined) return 'absent';
  if (value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 'non-finite number';
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string')
    return 'string (' + value.length + ' UTF-16 units; value withheld)';
  return Array.isArray(value)
    ? 'array (' + value.length + ' entries; values withheld)'
    : typeof value + ' (value withheld)';
}

export function validationIssue(
  pointer,
  rule,
  value,
  expected,
  correction = 'Use the registered field shape.'
) {
  return {
    pointer: String(pointer).slice(0, 240),
    rule,
    received: safeReceived(value),
    expected,
    correction,
  };
}

export class ApiValidationError extends AprError {
  constructor(code, issues, { topic = 'operations', schema = null, examples = [] } = {}) {
    const entry = apiErrorCatalog[code];
    const bounded = issues.slice(0, 20);
    super(code, entry.message, {
      recovery: entry.recovery,
      exitCode: 2,
      details: {
        issues: bounded,
        truncated_issue_count: Math.max(0, issues.length - bounded.length),
        help_topic: topic,
        schema,
        examples,
      },
    });
    this.next_action = {
      tool: 'get_peer_review_help',
      arguments: { schema: 'ai-peer-review.help-request/v1', topic, format: 'structured' },
    };
  }
  toJSON() {
    return this.toApiJSON({ ...this.details, next_action: this.next_action });
  }
}
