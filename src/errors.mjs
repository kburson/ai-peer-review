export class AprError extends Error {
  constructor(code, message, { recovery, details = {}, exitCode = 1 } = {}) {
    super(message);
    if (!/^APR_[A-Z0-9_]+$/.test(code) || typeof recovery !== 'string' || !recovery.trim()) {
      throw new TypeError('invalid APR error');
    }
    this.name = 'AprError';
    this.code = code;
    this.recovery = recovery;
    this.details = Object.freeze({ ...details });
    this.exitCode = exitCode;
  }

  toApiJSON({
    next_action = {
      tool: 'get_peer_review_help',
      arguments: {
        schema: 'ai-peer-review.help-request/v1',
        topic: 'errors',
        format: 'structured',
      },
    },
    issues = [],
    truncated_issue_count = 0,
    help_topic = 'errors',
    schema = null,
    examples = [],
  } = {}) {
    const bounded = issues.slice(0, 20);
    const details = {
      issues: bounded,
      truncated_issue_count: truncated_issue_count + issues.length - bounded.length,
      help_topic,
      schema,
      examples,
    };
    return {
      schema: 'ai-peer-review.response/v1',
      ok: false,
      mutation_occurred: false,
      retry_safe: true,
      next_action,
      error: { code: this.code, message: this.message, ...details },
      details,
    };
  }

  toJSON() {
    return {
      schema: 'ai-peer-review.error/v1',
      code: this.code,
      message: this.message,
      recovery: this.recovery,
      details: this.details,
    };
  }
}
