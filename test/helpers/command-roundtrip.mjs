import { execFileSync } from 'node:child_process';

export function executeJoinCommand(command) {
  if (process.platform === 'win32') {
    const script = [
      'function peer-review {',
      '  param($verb, $invitation)',
      "  if ($verb -ne 'join' -or $args.Count -ne 0) { exit 71 }",
      '  [Console]::Out.Write($invitation)',
      '}',
      command,
    ].join('\n');
    return execFileSync(
      'pwsh.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      { encoding: 'utf8' }
    );
  }
  return execFileSync(
    '/bin/sh',
    ['-c', `set -- ${command}; [ "$#" -eq 3 ] || exit 71; printf '%s' "$3"`],
    { encoding: 'utf8' }
  );
}

export function executeRecoveryWorkspaceCommand(command) {
  if (process.platform === 'win32') {
    const script = [
      'function peer-review {',
      '  param($verb, $action, $workspace, $flag)',
      "  if ($verb -eq 'broker' -and $action -eq 'reconcile' -and $flag -eq '--json' -and $args.Count -eq 0) { [Console]::Out.Write($workspace); return }",
      "  if ($verb -eq 'status' -and $workspace -eq '--next' -and $null -eq $flag -and $args.Count -eq 0) { [Console]::Out.Write($action); return }",
      '  exit 71',
      '}',
      command,
    ].join('\n');
    return execFileSync(
      'pwsh.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      { encoding: 'utf8' }
    );
  }
  return execFileSync(
    '/bin/sh',
    [
      '-c',
      `set -- ${command}; if [ "$#" -eq 5 ] && [ "$2" = broker ] && [ "$3" = reconcile ] && [ "$5" = --json ]; then printf '%s' "$4"; elif [ "$#" -eq 4 ] && [ "$2" = status ] && [ "$4" = --next ]; then printf '%s' "$3"; else exit 71; fi`,
    ],
    { encoding: 'utf8' }
  );
}
