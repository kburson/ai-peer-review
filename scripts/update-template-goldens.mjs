import { writeFileSync } from 'node:fs';
import { TEMPLATE_NAMES, TEMPLATE_VARIABLES, hydrateTemplate } from '../src/templates/index.mjs';
import { TEMPLATE_FIXTURE_VALUES } from '../test/helpers/template-values.mjs';

for (const name of TEMPLATE_NAMES) {
  const variables = Object.fromEntries(
    TEMPLATE_VARIABLES[name].map((key) => [key, TEMPLATE_FIXTURE_VALUES[key]])
  );
  writeFileSync(
    new URL(`../test/golden/templates/${name}.md`, import.meta.url),
    hydrateTemplate(name, variables)
  );
}
