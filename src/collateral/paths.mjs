import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';

const PLACEHOLDERS = Object.freeze(['issue', 'kind', 'name', 'date', 'review-id']);

function pathError(label, candidate) {
  return new AprError('APR_PATH_OUTSIDE_REPOSITORY', `${label} path escapes the repository.`, {
    recovery: `Choose a ${label} path whose physical parent is inside the repository.`,
    details: { label, path: candidate },
  });
}

function nearestExistingParent(candidate) {
  let current = candidate;
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

function isInsideOrEqual(root, candidate) {
  const relative = path.relative(root, candidate);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
}

export function resolveContainedPath(root, candidate, label) {
  const physicalRoot = realpathSync(root);
  const absolute = path.resolve(physicalRoot, candidate);
  const relative = path.relative(physicalRoot, absolute);
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`)
  ) {
    throw pathError(label, candidate);
  }
  const physicalParent = realpathSync(nearestExistingParent(absolute));
  if (!isInsideOrEqual(physicalRoot, physicalParent)) throw pathError(label, candidate);
  return Object.freeze({ absolute, relative: relative.split(path.sep).join('/') });
}

function safeSegment(value, label, { slug = false } = {}) {
  if (
    typeof value !== 'string' ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('\0')
  ) {
    throw new AprError('APR_PATH_TEMPLATE_INVALID', `${label} is not a safe path segment.`, {
      recovery: `Provide a non-empty ${label} without path separators.`,
      details: { label, value },
    });
  }
  const normalized = value.normalize('NFC').trim();
  const segment = slug
    ? normalized
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : normalized;
  if (
    !segment ||
    segment === '.' ||
    segment === '..' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)
  ) {
    throw new AprError('APR_PATH_TEMPLATE_INVALID', `${label} is not a safe path segment.`, {
      recovery: `Provide a canonical ${label} using letters, digits, dots, underscores, or hyphens.`,
      details: { label, value },
    });
  }
  return segment;
}

function positiveTurn(turn) {
  if (!Number.isSafeInteger(turn) || turn <= 0) {
    throw new AprError('APR_PATH_TEMPLATE_INVALID', 'Review turn must be a positive integer.', {
      recovery: 'Provide a positive safe integer for the review turn.',
      details: { turn },
    });
  }
  return turn;
}

export function resolveReviewPaths({
  root,
  reviewsRoot = 'docs/peer-reviews',
  reviewPathTemplate = '<kind>/<date>-<name>-<review-id>',
  issue = null,
  kind,
  name,
  date,
  reviewId,
} = {}) {
  if (typeof reviewPathTemplate !== 'string' || !reviewPathTemplate.trim()) {
    throw new AprError('APR_PATH_TEMPLATE_INVALID', 'Review path template is empty.', {
      recovery: 'Provide a template using only supported peer-review placeholders.',
    });
  }
  const found = [...reviewPathTemplate.matchAll(/<([^>]+)>/g)].map((match) => match[1]);
  const unknown = found.filter((placeholder) => !PLACEHOLDERS.includes(placeholder));
  if (unknown.length > 0 || /[<>]/.test(reviewPathTemplate.replace(/<[^>]+>/g, ''))) {
    throw new AprError(
      'APR_PATH_TEMPLATE_INVALID',
      'Review path template has an unsupported placeholder.',
      {
        recovery: `Use only ${PLACEHOLDERS.map((value) => `<${value}>`).join(', ')}.`,
        details: { unknown },
      }
    );
  }
  if (found.includes('issue') && (!Number.isSafeInteger(issue) || issue <= 0)) {
    throw new AprError(
      'APR_ISSUE_REQUIRED',
      'The review path template requires a positive issue ID.',
      {
        recovery:
          'Provide --issue with a positive safe integer or choose a template without <issue>.',
        details: { issue },
      }
    );
  }
  const values = {
    issue: issue === null ? null : String(issue),
    kind: safeSegment(kind, 'kind', { slug: true }),
    name: safeSegment(name, 'name', { slug: true }),
    date: safeSegment(date, 'date'),
    'review-id': safeSegment(reviewId, 'review-id'),
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) {
    throw new AprError('APR_PATH_TEMPLATE_INVALID', 'Review date must use YYYY-MM-DD.', {
      recovery: 'Provide the canonical UTC review date in YYYY-MM-DD form.',
      details: { date },
    });
  }

  let rendered = reviewPathTemplate;
  for (const placeholder of found) {
    rendered = rendered.replaceAll(`<${placeholder}>`, values[placeholder]);
  }
  if (/[<>]/.test(rendered)) {
    throw new AprError(
      'APR_PATH_TEMPLATE_INVALID',
      'Review path template was not fully expanded.',
      {
        recovery: 'Use only supported placeholders with all required values.',
      }
    );
  }

  const rootPath = realpathSync(root);
  const reviews = resolveContainedPath(rootPath, reviewsRoot, 'reviews root');
  const destination = resolveContainedPath(
    rootPath,
    path.join(reviews.relative, rendered),
    'review'
  );
  const scratch = resolveContainedPath(
    rootPath,
    path.join('.scratch', 'peer-review', values['review-id']),
    'scratch'
  );
  const reviewScoped = found.includes('review-id');
  const prefix = reviewScoped ? '' : `${values.date}-${values.name}-${values['review-id']}-`;
  const output = (file) =>
    resolveContainedPath(rootPath, path.join(destination.relative, `${prefix}${file}`), 'response');

  return Object.freeze({
    root: rootPath,
    reviewsRoot: reviews,
    destination,
    scratch,
    reviewScoped,
    reviewerResponse: (turn) => output(`reviewer-response-${positiveTurn(turn)}.md`),
    authorResponse: (turn) => output(`author-response-${positiveTurn(turn)}.md`),
    humanDecision: output('human-decision.md'),
    manifest: output('review-manifest.md'),
  });
}
