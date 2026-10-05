import { isDeepStrictEqual } from 'node:util';
import {
  assertJsonValue,
  assertScalarString,
  parseRawJson,
  requestDigest,
} from './canonical-json.mjs';
import { ApiValidationError, validationIssue } from './errors.mjs';
import { operationRegistry, findingGrammar } from './registry.mjs';

const pointerKey = (key) => key.replaceAll('~', '~0').replaceAll('/', '~1');
const kind = (value) =>
  value === null
    ? 'null'
    : Array.isArray(value)
      ? 'array'
      : typeof value === 'number' && Number.isInteger(value)
        ? 'integer'
        : typeof value;
const expected = (schema) =>
  schema.const !== undefined ? [schema.const] : (schema.enum ?? schema.type ?? 'registered union');
export function validateContract(schema, value, pointer = '') {
  const issues = [];
  const add = (rule, shape = expected(schema), correction) =>
    issues.push(validationIssue(pointer, rule, value, shape, correction));
  if (schema.oneOf) {
    const results = schema.oneOf.map((branch) => validateContract(branch, value, pointer));
    if (results.filter((result) => result.length === 0).length !== 1) {
      const selected = schema.oneOf.findIndex(
        (branch) =>
          branch.properties?.kind?.const === value?.kind ||
          branch.properties?.tool?.const === value?.tool
      );
      if (selected >= 0) issues.push(...results[selected]);
      else add('oneOf');
    }
    return issues;
  }
  if (Object.hasOwn(schema, 'const') && !isDeepStrictEqual(value, schema.const)) add('const');
  if (schema.enum && !schema.enum.some((item) => isDeepStrictEqual(item, value)))
    add('enum', schema.enum, 'Choose a registered enum value.');
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.includes(kind(value)) && !(kind(value) === 'integer' && types.includes('number'))) {
      add('type', types);
      return issues;
    }
  }
  if (typeof value === 'string') {
    try {
      assertScalarString(value);
    } catch {
      add('unicode-scalar', 'Unicode scalar string');
    }
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength)
      add('minLength', 'length >= ' + schema.minLength);
    if (schema.maxLength !== undefined && length > schema.maxLength)
      add('maxLength', 'length <= ' + schema.maxLength);
    if (schema.pattern) {
      const match = new RegExp(schema.pattern).exec(value);
      if (!match || match[0].length !== value.length) add('pattern', schema.pattern);
    }
    if (schema.$id === findingGrammar.id && !/^[\x00-\x7f]*$/.test(value))
      add('ascii', findingGrammar.id);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (schema.type === 'integer' && !Number.isSafeInteger(value)))
      add('safe-number', 'finite safe number');
    if (schema.minimum !== undefined && value < schema.minimum)
      add('minimum', 'value >= ' + schema.minimum);
    if (schema.maximum !== undefined && value > schema.maximum)
      add('maximum', 'value <= ' + schema.maximum);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      add('minItems', 'items >= ' + schema.minItems);
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      add('maxItems', 'items <= ' + schema.maxItems);
    if (
      schema.uniqueItems &&
      new Set(value.map((item) => JSON.stringify(item))).size !== value.length
    )
      add('uniqueItems', 'unique entries');
    if (
      schema.contains &&
      !value.some((item) => validateContract(schema.contains, item).length === 0)
    )
      add('contains', expected(schema.contains));
    if (schema.items)
      value.forEach((item, index) =>
        issues.push(...validateContract(schema.items, item, pointer + '/' + index))
      );
  } else if (value && typeof value === 'object') {
    for (const key of schema.required ?? [])
      if (!Object.hasOwn(value, key))
        issues.push(
          validationIssue(
            pointer + '/' + pointerKey(key),
            'required',
            undefined,
            'required field',
            'Supply this required field.'
          )
        );
    for (const key of Object.keys(value)) {
      const path = pointer + '/' + pointerKey(key);
      if (schema.properties && Object.hasOwn(schema.properties, key))
        issues.push(...validateContract(schema.properties[key], value[key], path));
      else if (schema.additionalProperties === false)
        issues.push(
          validationIssue(
            path,
            'additionalProperties',
            value[key],
            'no unknown fields',
            'Remove this field; credentials and raw handles are forbidden.'
          )
        );
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object')
        issues.push(...validateContract(schema.additionalProperties, value[key], path));
    }
  }
  for (const clause of schema.allOf ?? []) {
    if (!clause.if || validateContract(clause.if, value, pointer).length === 0)
      issues.push(...validateContract(clause.then ?? clause, value, pointer));
  }
  return issues;
}

export function validateOperation(name, input, { rawText } = {}) {
  const operation = Object.hasOwn(operationRegistry, name) ? operationRegistry[name] : null;
  if (!operation)
    throw new ApiValidationError('APR_OPERATION_UNKNOWN', [
      validationIssue('', 'operation', name, Object.keys(operationRegistry)),
    ]);
  const options = {
    topic: operation.topic,
    schema: operation.requestSchema.$id,
    examples: operation.examples,
  };
  let value = input;
  if (rawText !== undefined) {
    try {
      const rawValue = parseRawJson(rawText);
      assertJsonValue(input);
      assertJsonValue(rawValue);
      if (!isDeepStrictEqual(rawValue, input)) throw new TypeError('raw-parsed-disagreement');
      value = rawValue;
    } catch (error) {
      throw new ApiValidationError(
        'APR_REQUEST_INVALID',
        [
          validationIssue(
            error.pointer ?? '',
            error.rule ?? error.message,
            undefined,
            'one unambiguous closed JSON value',
            'Correct the original raw JSON, then parse and resubmit the same value.'
          ),
        ],
        options
      );
    }
  }
  try {
    assertJsonValue(value);
  } catch (error) {
    throw new ApiValidationError(
      'APR_REQUEST_INVALID',
      [
        validationIssue(
          error.pointer ?? '',
          error.message,
          undefined,
          'plain scalar JSON with positive safe integers'
        ),
      ],
      options
    );
  }
  const issues = validateContract(operation.requestSchema, value);
  if (issues.length) {
    const topology = issues.some((issue) =>
      /^\/stages\/\d+\/fallback_kinds(?:\/|$)/.test(issue.pointer)
    );
    throw new ApiValidationError(
      topology ? 'APR_FALLBACK_TOPOLOGY_INVALID' : 'APR_REQUEST_INVALID',
      issues,
      options
    );
  }
  return {
    operation: name,
    value: structuredClone(value),
    digest: requestDigest(value),
    input_validation: { duplicate_keys: rawText === undefined ? 'not-observable' : 'checked' },
  };
}
