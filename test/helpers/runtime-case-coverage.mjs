// cspell:words quasis
// @story #187
// Development-only case preservation inspection. Never imports analyzed code or grants authority.
import { Linter } from 'eslint';
import { createHash } from 'node:crypto';
import path from 'node:path';
export function runtimeTestProgram(source) {
  let program;
  const messages = new Linter().verify(source, [
    {
      plugins: {
        inspection: {
          rules: {
            program: {
              create() {
                return {
                  Program(node) {
                    program = node;
                  },
                };
              },
            },
          },
        },
      },
      rules: { 'inspection/program': 'error' },
    },
  ]);
  if (!program || messages.some((message) => message.fatal)) throw Error('invalid case source');
  return program;
}
function normalized(node, file) {
  if (Array.isArray(node)) return node.map((value) => normalized(value, file));
  if (!node || typeof node !== 'object') return node;
  const result = {};
  for (const key of Object.keys(node).sort()) {
    if (['start', 'end', 'loc', 'range', 'raw', 'parent'].includes(key)) continue;
    result[key] = normalized(node[key], file);
  }
  if (
    node.type === 'ImportExpression' &&
    node.source?.type === 'Literal' &&
    node.source.value.startsWith('.')
  )
    result.source.value = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), node.source.value)
    );
  return result;
}
function literal(node, bindings) {
  if (node.type === 'Literal') return node.value;
  if (node.type === 'Identifier' && Object.hasOwn(bindings, node.name)) return bindings[node.name];
  if (node.type === 'TemplateLiteral')
    return node.quasis
      .map(
        (part, i) =>
          part.value.cooked + (node.expressions[i] ? literal(node.expressions[i], bindings) : '')
      )
      .join('');
  throw Error('unresolved case name');
}
export function runtimeCaseRecords(source, file) {
  const records = [];
  function visit(node, bindings = {}) {
    if (
      node.type === 'ExpressionStatement' &&
      node.expression?.type === 'CallExpression' &&
      node.expression.callee?.name === 'test'
    ) {
      const args = node.expression.arguments,
        callback = args.at(-1);
      if (!['ArrowFunctionExpression', 'FunctionExpression'].includes(callback.type))
        throw Error('unresolved case callback');
      records.push({
        name: literal(args[0], bindings),
        bodySha256: createHash('sha256')
          .update(JSON.stringify({ callback: normalized(callback, file), bindings }))
          .digest('hex'),
      });
    } else if (node.type === 'ForOfStatement') {
      const variables = node.left.declarations?.[0]?.id?.elements;
      if (!variables || node.right.type !== 'ArrayExpression')
        throw Error('unresolved generated cases');
      for (const row of node.right.elements) {
        if (row.type !== 'ArrayExpression' || row.elements.length !== variables.length)
          throw Error('invalid generated case row');
        const values = Object.fromEntries(
          variables.map((variable, i) => [variable.name, literal(row.elements[i], bindings)])
        );
        for (const statement of node.body.body) visit(statement, { ...bindings, ...values });
      }
    }
  }
  for (const node of runtimeTestProgram(source).body) visit(node);
  if (new Set(records.map((record) => record.name)).size !== records.length)
    throw Error('duplicate runtime case');
  return records.sort((a, b) => a.name.localeCompare(b.name));
}
