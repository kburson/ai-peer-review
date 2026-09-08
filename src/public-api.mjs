export { AprError } from './errors.mjs';
export { COMMANDS, COMMAND_FLAGS, POSITIONAL_GRAMMAR, parseCommand } from './cli/parse.mjs';
export { run } from './cli/run.mjs';
export {
  createResponseDraft,
  parseResponse,
  reserveCollateral,
  sealResponse,
} from './collateral/responses.mjs';
export { TEMPLATE_NAMES, TEMPLATE_VARIABLES, hydrateTemplate } from './templates/index.mjs';

export function statusReview() {
  return Object.freeze({ status: 'not-implemented' });
}

export function explainError() {
  return Object.freeze({ status: 'not-implemented' });
}
