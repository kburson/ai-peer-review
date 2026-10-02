// @story #136
// Explicit inert source command engine; never the installed executable.
import { run } from './operations-api.mjs';
process.exitCode = await run(process.argv.slice(2), {
  cwd: process.cwd(),
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
});
