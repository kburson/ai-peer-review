import { AprError } from '../errors.mjs';
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
