export { AprError } from './errors.mjs';
export { COMMANDS, COMMAND_FLAGS, POSITIONAL_GRAMMAR, parseCommand } from './cli/parse.mjs';
export { run } from './cli/run.mjs';

export function statusReview() {
  return Object.freeze({ status: 'not-implemented' });
}

export function explainError() {
  return Object.freeze({ status: 'not-implemented' });
}
