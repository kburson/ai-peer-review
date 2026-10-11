// @story #198
// Resolve workflow commands through the same fixed lanes the producer executes.
export function expandedCICommands(workflow, scripts, receiptCommands) {
  const commands = new Set();
  function expand(command, visiting = new Set()) {
    commands.add(command);
    const receipt = /^node scripts\/ci\/run-receipt\.mjs ([a-z-]+)$/.exec(command);
    if (receipt) {
      const args = receiptCommands[receipt[1]];
      if (!args) throw Error('unknown receipt lane');
      expand('npm ' + args.join(' '), visiting);
      return;
    }
    const npm = /^npm (?:run ([a-zA-Z0-9:_-]+)|test)$/.exec(command);
    if (!npm) return;
    const name = npm[1] ?? 'test';
    if (visiting.has(name)) throw Error('npm script cycle');
    if (!scripts[name]) return;
    const next = new Set(visiting);
    next.add(name);
    for (const part of scripts[name].split(' && ')) expand(part.trim(), next);
  }
  for (const match of workflow.matchAll(/^\s*(?:-\s*)?run:\s*([^\r\n]+)$/gm))
    expand(match[1].trim());
  return commands;
}
