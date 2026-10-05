import { createHash } from 'node:crypto';

export function assertScalarString(value) {
  for (let i = 0; i < value.length; i += 1) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError('lone-surrogate');
    } else if (unit >= 0xdc00 && unit <= 0xdfff) throw new TypeError('lone-surrogate');
  }
}

export function assertJsonValue(value, ancestors = new Set(), pointer = '') {
  try {
    return checkJsonValue(value, ancestors, pointer);
  } catch (error) {
    error.pointer ??= pointer;
    throw error;
  }
}

function checkJsonValue(value, ancestors, pointer) {
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') return assertScalarString(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0 || Object.is(value, -0))
      throw new TypeError('positive-safe-integer');
    return;
  }
  if (typeof value !== 'object') throw new TypeError('json-type');
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype))
    throw new TypeError('json-prototype');
  if (ancestors.has(value)) throw new TypeError('json-cycle');
  ancestors.add(value);
  const keys = Reflect.ownKeys(value);
  if (array && (keys.length !== value.length + 1 || !keys.includes('length')))
    throw new TypeError('json-array');
  for (const key of keys) {
    if (array && key === 'length') continue;
    if (typeof key !== 'string') throw new TypeError('json-key');
    assertScalarString(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))
      throw new TypeError('json-accessor');
    if (array && !/^(?:0|[1-9][0-9]*)$/.test(key)) throw new TypeError('json-array');
    assertJsonValue(
      descriptor.value,
      ancestors,
      pointer + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1')
    );
  }
  ancestors.delete(value);
}

export function encodeRequestCanonical(value) {
  assertJsonValue(value);
  const encode = (item) => {
    if (item === null) return 'null';
    if (typeof item === 'boolean' || typeof item === 'number') return String(item);
    if (typeof item === 'string') return JSON.stringify(item);
    if (Array.isArray(item)) return '[' + item.map(encode).join(',') + ']';
    return (
      '{' +
      Object.keys(item)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + encode(item[key]))
        .join(',') +
      '}'
    );
  };
  return Buffer.from(encode(value), 'utf8');
}

export function requestDigest(value) {
  const bytes = encodeRequestCanonical(value);
  return createHash('sha256').update(bytes).digest('hex');
}

// Recursive lexical parsing keeps decoded object-key sets at every depth.
// JSON.parse is used only on one scanned string token, never an entire object.
export function parseRawJson(text) {
  if (typeof text !== 'string') throw new TypeError('raw-json-type');
  let position = 0;
  const fail = (rule, pointer) => {
    const error = new SyntaxError(rule);
    error.rule = rule;
    error.pointer = pointer;
    throw error;
  };
  const space = () => {
    while (/[\x20\t\r\n]/.test(text[position] ?? '') && position < text.length) position += 1;
  };
  const string = (pointer) => {
    const start = position++;
    let escaped = false;
    while (position < text.length) {
      const char = text[position++];
      if (!escaped && char === '"') {
        try {
          return JSON.parse(text.slice(start, position));
        } catch {
          return fail('json-string', pointer);
        }
      }
      if (!escaped && char === '\\') escaped = true;
      else escaped = false;
    }
    return fail('json-string', pointer);
  };
  const escapePointer = (key) => key.replaceAll('~', '~0').replaceAll('/', '~1');
  const value = (pointer, depth = 0) => {
    if (depth > 128) return fail('json-depth', pointer);
    space();
    const char = text[position];
    if (char === '"') return string(pointer);
    if (char === '{') {
      position += 1;
      const object = {};
      const seen = new Set();
      space();
      if (text[position] === '}') {
        position += 1;
        return object;
      }
      for (;;) {
        space();
        if (text[position] !== '"') return fail('json-key', pointer);
        const key = string(pointer);
        const path = pointer + '/' + escapePointer(key);
        if (seen.has(key)) return fail('duplicate-key', path);
        seen.add(key);
        space();
        if (text[position++] !== ':') return fail('json-colon', path);
        Object.defineProperty(object, key, {
          value: value(path, depth + 1),
          writable: true,
          configurable: true,
          enumerable: true,
        });
        space();
        const separator = text[position++];
        if (separator === '}') return object;
        if (separator !== ',') return fail('json-separator', pointer);
      }
    }
    if (char === '[') {
      position += 1;
      const array = [];
      space();
      if (text[position] === ']') {
        position += 1;
        return array;
      }
      for (;;) {
        array.push(value(pointer + '/' + array.length, depth + 1));
        space();
        const separator = text[position++];
        if (separator === ']') return array;
        if (separator !== ',') return fail('json-separator', pointer);
      }
    }
    for (const [token, parsed] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ]) {
      if (text.startsWith(token, position)) {
        position += token.length;
        return parsed;
      }
    }
    const token = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(
      text.slice(position)
    );
    if (!token) return fail('json-value', pointer);
    position += token[0].length;
    return Number(token[0]);
  };
  const result = value('');
  space();
  if (position !== text.length) fail('json-trailing', '');
  return result;
}
