// @story #134
export function hostWrapper(host) {
  return `---\nname: peer-review\ndescription: Load the registered primary peer review procedure.\n---\n\n# Peer review for ${host}\n\nRun \`peer-review primary inspect --json\` from the active project. The selected\nglobal tool verifies the registered primary and current integration contract.\nRead the returned \`skillPath\` in full before review work. If verification fails,\nstop and follow its recovery command. This wrapper contains no review procedure.\n`;
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
