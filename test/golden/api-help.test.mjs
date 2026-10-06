import test from 'node:test';
import MarkdownIt from 'markdown-it';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const registry = await import('../../src/api/registry.mjs').catch(() => ({}));
test('[#145] schemas and help are exact generated registry artifacts', () => {
  assert.equal(typeof registry.renderHelp, 'function');
  for (const [file, schema] of Object.entries(registry.schemaArtifacts))
    assert.deepEqual(
      JSON.parse(readFileSync(new URL('../../schemas/' + file, import.meta.url))),
      schema
    );
  const expected = JSON.parse(readFileSync(new URL('../fixtures/api-help.json', import.meta.url)));
  assert.deepEqual(registry.renderHelp({ format: 'json' }), expected);
  assert.match(
    registry.renderHelp({ topic: 'monitoring', format: 'text' }).text,
    /reconcile_after_ms.*120000/
  );
  assert.match(
    registry.renderHelp({ topic: 'monitoring', format: 'text' }).text,
    /reconnect.window/
  );
});
test('[#145] Markdown literals, rendered code and numbered gate ownership match registry', () => {
  const markdown = readFileSync(
    new URL(
      '../../docs/superpowers/specs/2026-09-27-107-agent-first-review-runtime-design.md',
      import.meta.url
    ),
    'utf8'
  );
  assert.deepEqual(validateHelpMarkdown(markdown), []);
  const pattern = registry.findingGrammar.pattern;
  const corruptions = [
    markdown.replace('with `APR_FINDINGS_UNRESOLVED`', 'with `APR*FINDINGS*UNRESOLVED`'),
    markdown.replace(pattern, pattern.replace('A-Za-z', 'A-Z')),
    markdown.replace('   Registry fixtures resolve grammar', 'Registry fixtures resolve grammar'),
    markdown.replace(
      'With `max_revision_attempts_per_round=3`, exhaust',
      'With`max_revision_attempts_per_round=3`, exhaust'
    ),
  ];
  for (const [index, mutation] of corruptions.entries())
    assert.ok(validateHelpMarkdown(mutation).length > 0, 'corruption ' + index);
});

function validateHelpMarkdown(markdown) {
  const parser = new MarkdownIt();
  const tokens = parser.parse(markdown, {});
  const issues = [];
  const codeNodes = tokens
    .flatMap((token) => token.children ?? [])
    .filter((token) => token.type === 'code_inline');
  const pattern = registry.findingGrammar.pattern;
  let findings = false;
  const findingCodes = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].type === 'heading_open' && tokens[i].tag === 'h2')
      findings = tokens[i + 1]?.content === 'Findings and Debate';
    if (findings)
      findingCodes.push(
        ...(tokens[i].children ?? [])
          .filter((token) => token.type === 'code_inline')
          .map((token) => token.content)
      );
  }
  if (
    findingCodes.filter((text) => text.startsWith('^')).length !== 1 ||
    !findingCodes.includes(pattern)
  )
    issues.push('finding-pattern-code');
  const html = parser.render(markdown);
  if (html.split('<code>' + pattern + '</code>').length !== 2)
    issues.push('finding-pattern-render');
  const lines = markdown.split('\n');
  const open = tokens.findIndex(
    (token) =>
      token.type === 'ordered_list_open' &&
      lines[token.map?.[0]]?.startsWith('1. Equivalent CLI/MCP')
  );
  let number = 0;
  let depth = 0;
  let gate = '';
  let gateCodes = [];
  if (open < 0) issues.push('gates-missing');
  else {
    for (let i = open; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token.type === 'ordered_list_open') depth += 1;
      if (token.type === 'ordered_list_close' && --depth === 0) break;
      if (depth === 1 && token.type === 'list_item_open') number += 1;
      if (depth === 1 && number === 2 && token.type === 'inline') {
        gate += token.content + '\n';
        gateCodes = gateCodes.concat(
          (token.children ?? [])
            .filter((child) => child.type === 'code_inline')
            .map((child) => child.content)
        );
      }
    }
  }
  for (const literal of [
    registry.findingGrammar.id,
    'APR_FINDINGS_UNRESOLVED',
    'max_revision_attempts_per_round=3',
  ])
    if (!gateCodes.includes(literal)) issues.push('gate2-code-' + literal);
  if (
    !gate.includes('its allowance is three attempts including the initial') ||
    !gate.includes('Round N remains exhausted')
  )
    issues.push('gate2-revision-allowance');
  const gateStart = lines.findIndex((line) => line.startsWith('2. Clean review'));
  const gateEnd = lines.findIndex((line, i) => i > gateStart && line.startsWith('3. Mutating'));
  if (lines.slice(gateStart + 1, gateEnd).some((line) => line.trim() && !line.startsWith('   ')))
    issues.push('gate2-continuation-indent');
  if (gate.includes(pattern)) issues.push('gate2-second-pattern');
  for (const token of codeNodes) {
    if (token.content.includes('APR*') || token.content.includes('max*revision*'))
      issues.push('literal-spelling');
  }
  // Source separators are independent of rendering: Markdown accepts joined
  // prose/code, so inspect the exact canonical inline source as well.
  for (const literal of [
    'max_revision_attempts_per_round=3',
    registry.findingGrammar.id,
    'APR_FINDINGS_UNRESOLVED',
  ]) {
    const marker = '\`' + literal + '\`';
    let position = -1;
    while ((position = markdown.indexOf(marker, position + 1)) >= 0) {
      const before = markdown[position - 1] ?? '';
      const after = markdown[position + marker.length] ?? '';
      if (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after)) issues.push('code-separator');
    }
  }
  return issues;
}
