export const CONCEPT_HELP_TOPICS = Object.freeze(['spr', 'xpr']);

export const CONCEPT_HELP = Object.freeze({
  spr: Object.freeze({
    schema: 'ai-peer-review.help-concept/v1',
    topic: 'spr',
    summary:
      'SPR is single-provider review: author and reviewer use distinct sessions in the same provider family; their models may differ. Native orchestration is eligible only when that provider can launch and resume the second session; otherwise the project-local broker is required.',
    examples: Object.freeze([
      'peer-review start docs/spec.md --artifact-kind spec --reviewer-provider codex --reviewer-model gpt-6-astra --reviewer-effort medium',
      'peer-review broker status --json',
    ]),
    related_commands: Object.freeze(['start', 'broker', 'status', 'resume']),
  }),
  xpr: Object.freeze({
    schema: 'ai-peer-review.help-concept/v1',
    topic: 'xpr',
    summary:
      'XPR is cross-provider review. New XPR starts require the authenticated project-local broker even with manual transport. Broker failure is a refusal, not an automatic fallback to another reviewer or runtime.',
    examples: Object.freeze([
      'peer-review start docs/spec.md --artifact-kind spec --reviewer-provider claude --reviewer-model claude-opus-5 --reviewer-effort medium --transport-mode manual',
      'peer-review broker status --json',
      'peer-review broker reconcile /absolute/review/workspace --json',
    ]),
    related_commands: Object.freeze(['start', 'broker', 'status', 'resume']),
  }),
});
