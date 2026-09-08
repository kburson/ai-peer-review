import path from 'node:path';

import { canonicalChallengeBytes } from '../authority/canonicalize.mjs';
import { requestGrant } from '../authority/challenge.mjs';
import { AprError } from '../errors.mjs';
import { resolveIdentity } from '../identity/registry.mjs';
import { COMMANDS, parseCommand } from './parse.mjs';

function helpText(topic) {
  if (!topic) {
    return `peer-review <command> [arguments]\n\nCommands:\n${COMMANDS.map((command) => `  ${command}`).join('\n')}\n`;
  }
  return `peer-review ${topic}\n`;
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value)}\n`);
}

export async function run(argv, io) {
  try {
    const parsed = parseCommand(argv);
    if (parsed.command === 'help') {
      io.stdout.write(helpText(parsed.args.join(' ')));
      return 0;
    }
    if (parsed.command === 'request-grant') {
      const workspace = path.isAbsolute(parsed.args[0])
        ? parsed.args[0]
        : path.resolve(io.cwd, parsed.args[0]);
      const requesterFingerprint =
        io.requesterFingerprint ??
        resolveIdentity({
          role: 'author',
          env: io.env,
          ...(io.identityContext ?? {}),
        }).session_fingerprint;
      const challenge = await requestGrant(
        workspace,
        parsed.options.action,
        parsed.options.parameters,
        {
          requesterFingerprint,
          now: io.now ?? new Date(),
        }
      );
      writeJson(io.stdout, {
        schema: 'ai-peer-review.request-grant-result/v1',
        challenge,
        canonical_challenge: canonicalChallengeBytes(challenge).toString('base64'),
      });
      return 0;
    }
    throw new AprError('APR_NOT_IMPLEMENTED', `${parsed.command} is not implemented yet`, {
      recovery: `Run peer-review help ${parsed.command} for the planned interface.`,
      details: { command: parsed.command },
    });
  } catch (error) {
    const rendered =
      error instanceof AprError
        ? error
        : new AprError('APR_INTERNAL', 'unexpected peer-review failure', {
            recovery: 'Re-run with the same arguments and report the failure if it persists.',
            details: { cause: String(error?.message ?? error) },
          });
    writeJson(io.stderr, rendered.toJSON());
    return rendered.exitCode;
  }
}
