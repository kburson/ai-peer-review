// @story #134
export function hostWrapper(host) {
  return `---\nname: peer-review\ndescription: Use when two agents exchange local review artifact and response-note filepaths.\n---\n\n# Peer review for ${host}\n\nRun \`peer-review help --json\` from the actual project and read the returned\n\`skillPath\` in full. This ordinary installed help lookup needs no runtime\nenrollment, primary activation or broker. Existing sessions are instruction-bound.\nKeep legacy maintenance and unresolved reviews on their recorded compatible path.\n`;
}
export const INTEGRATION_CONTRACT = 'ai-peer-review.integration/v1';
export const HOST_DIRECTORIES = Object.freeze({
  codex: '.codex',
  claude: '.claude',
  grok: '.grok',
  generic: '.agents',
});
export const HOST_HOOKS = Object.freeze({
  codex: 'peer-review-codex-hook',
  claude: 'peer-review-claude-hook',
});
