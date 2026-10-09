// @story #134
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const input = JSON.parse(readFileSync(0, 'utf8'));
const module = await import(
  input.module
    ? pathToFileURL(input.module)
    : import.meta.resolve(
        input.moduleName,
        pathToFileURL(path.join(input.resolutionRoot, 'package.json')).href
      )
);
let exit = 0,
  diagnostics = [];
if (input.kind === 'eslint') {
  const checker = new module.ESLint({ cwd: input.root, fix: false });
  const results = await checker.lintText(input.bytes, { filePath: input.file, warnIgnored: false });
  diagnostics = results.flatMap((result) =>
    result.messages.map((error) => ({
      file: result.filePath,
      rule: error.ruleId ?? 'parse',
      detail: error.message,
      context: input.bytes.split('\n')[error.line - 1] ?? '',
      severity: error.severity === 2 ? 'error' : 'warning',
    }))
  );
  exit = diagnostics.some((error) => error.severity === 'error') ? 1 : 0;
} else if (input.kind === 'cspell') {
  const result = await module.spellCheckDocument(
    { uri: pathToFileURL(input.file).href, text: input.bytes },
    { noConfigSearch: false, generateSuggestions: false },
    {}
  );
  if (result.errors?.length)
    throw new Error(result.errors.map((error) => error.message).join('; '));
  diagnostics = result.issues.map((error) => ({
    file: input.file,
    rule: 'cspell',
    detail: error.text,
    context: error.text,
    severity: 'error',
  }));
  exit = diagnostics.length ? 1 : 0;
} else {
  const errors = [];
  exit = await module.main({
    directory: input.root,
    argv: [],
    noGlobs: true,
    nonFileContents: { [input.file.replaceAll(path.sep, '/')]: input.bytes },
    optionsDefault: input.reference ? { config: input.reference } : undefined,
    optionsOverride: {
      fix: false,
      globs: [],
      outputFormatters: [
        [
          (options) => {
            errors.push(...options.results);
          },
        ],
      ],
    },
    logMessage: () => {},
    logError: (message) => {
      throw new Error(message);
    },
  });
  diagnostics = errors.map((error) => ({
    file: path.resolve(input.root, error.fileName),
    rule: error.ruleNames?.[0],
    detail: error.errorDetail ?? '',
    context: error.errorContext ?? '',
    severity: error.severity ?? 'error',
  }));
}
for (const error of diagnostics) error.file = path.resolve(error.file).replaceAll(path.sep, '/');
if (diagnostics.some((error) => error.file !== path.resolve(input.file).replaceAll(path.sep, '/')))
  throw new Error('Host lint attempted an undeclared destination.');
process.stdout.write(JSON.stringify({ exit, diagnostics }));
