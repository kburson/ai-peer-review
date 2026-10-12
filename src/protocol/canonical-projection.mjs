// @story #209
// Shared pure canonical bytes, with no protocol initialization or effect dependency.
export function orderedProjectionCore(value) {
  if (Array.isArray(value)) return value.map(orderedProjectionCore);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, orderedProjectionCore(value[key])])
    );
  }
  return value;
}

export function canonicalProjection(value) {
  return `${JSON.stringify(orderedProjectionCore(value), null, 2)}\n`;
}
