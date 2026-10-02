import {
  withOperationAuthority,
  performCurrentOperationEffect,
  classifyOperation,
} from '../startup/authority-fence.mjs';
import { parseCommand } from './parse.mjs';
import { AprError } from '../errors.mjs';
// @story #136
import * as protocol from '../protocol/service.mjs';
import * as startup from '../startup/runtime.mjs';
import { productionProviderAdapters } from '../providers/registry.mjs';
import { createClaudeStreamingExec } from '../providers/claude-stream.mjs';
import { runClaudeReviewerLaunch } from '../provider/claude-launch.mjs';
import { applyReviewRecord } from '../collateral/review-record.mjs';
import { requestGrant } from '../authority/challenge.mjs';
import { createReviewOperations } from './run-core.mjs';
let operations;
const current = () =>
  (operations ??= createReviewOperations({
    protocol,
    startup,
    productionProviderAdapters,
    createClaudeStreamingExec,
    performCurrentOperationEffect,
    requestGrant,
    runClaudeReviewerLaunch,
    applyReviewRecord,
  }));
export function startReview(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'start',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().startReview(input, ...args)
  );
}
export function joinReview(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'join',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().joinReview(input, ...args)
  );
}
export function statusReview(...args) {
  return current().statusReview(...args);
}
export function resumeReview(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'resume',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().resumeReview(input, ...args)
  );
}
export function continueReview(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'continue',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().continueReview(input, ...args)
  );
}
export function registerSupplement(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'supplement',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().registerSupplement(input, ...args)
  );
}
export function abandonReview(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'abandon',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().abandonReview(input, ...args)
  );
}
export function supersedeReview(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'supersede',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().supersedeReview(input, ...args)
  );
}
export function recoverReview(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'recover',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().recoverReview(input, ...args)
  );
}
export function advanceReview(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'advance',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().advanceReview(input, ...args)
  );
}
export function submitReviewTurn(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'submit',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().submitReviewTurn(input, ...args)
  );
}
export function submitAuthorTurn(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'submit',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().submitAuthorTurn(input, ...args)
  );
}
export function finalizeReview(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'finalize',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().finalizeReview(input, ...args)
  );
}
export function runHandoffMcpStdio(input, ...args) {
  return withOperationAuthority(
    {
      operation: 'mcp.wait',
      cwd:
        (typeof input === 'string' ? input : input?.cwd) ??
        input?.repositoryRoot ??
        input?.workspace ??
        process.cwd(),
      reviewWorkspace: input?.workspace,
    },
    () => current().runHandoffMcpStdio(input, ...args)
  );
}
export async function run(argv, io) {
  try {
    const parsed = parseCommand(argv);
    const operation =
      parsed.command === 'primary'
        ? 'primary.' + parsed.args[0]
        : parsed.command === 'broker'
          ? 'broker.' + parsed.args[0]
          : parsed.command;
    const kind = classifyOperation(operation);
    if (
      kind === 'read' ||
      kind === 'maintenance' ||
      (parsed.command === 'consolidate' && parsed.options.dryRun)
    )
      return current().run(argv, io);
    return await withOperationAuthority({ operation, cwd: io?.cwd ?? process.cwd() }, () =>
      current().run(argv, io)
    );
  } catch (error) {
    if (!(error instanceof AprError)) throw error;
    io.stderr.write(JSON.stringify(error.toJSON()) + '\n');
    return error.exitCode;
  }
}
