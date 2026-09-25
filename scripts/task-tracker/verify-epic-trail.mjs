#!/usr/bin/env node

// Development-only adapter for the epic DoD command rendered by AITM. The
// verifier and its authority checks remain owned by the installed package.
import { main } from '@kburson/ai-task-manager/scripts/task-tracker/verify-epic-trail.mjs';

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(`verify-epic-trail: ${error.message}`);
  process.exitCode = 1;
}
