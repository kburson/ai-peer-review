// @story #198
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function assertMeasurementHost({
  environment = process.env,
  platform = process.platform,
} = {}) {
  if (
    platform !== 'win32' ||
    environment.GITHUB_ACTIONS !== 'true' ||
    environment.RUNNER_ENVIRONMENT !== 'github-hosted' ||
    environment.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
    environment.GITHUB_WORKFLOW !== 'Windows probe measurement' ||
    !['codex/198-draft', 'trunk'].includes(environment.GITHUB_REF_NAME) ||
    environment.NODE_OPTIONS
  )
    throw Error('measurement-host-unavailable');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  assertMeasurementHost();
