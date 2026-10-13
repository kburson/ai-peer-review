// @story #190
// Conservative capture input metadata, never process-source or runtime authority.
const authorityData =
  /^(?:evidence\/portable-runtime\/process-source\/|docs\/superpowers\/peer-reviews\/).*\.(?:md|json)$/u;
function validFiles(files) {
  if (
    !Array.isArray(files) ||
    files.length > 20000 ||
    files.some(
      (file) =>
        typeof file !== 'string' ||
        !file ||
        file.length > 512 ||
        /[\\\u0000-\u001f\u007f]/u.test(file) ||
        file.split('/').some((part) => !part || part === '.' || part === '..')
    ) ||
    new Set(files).size !== files.length
  )
    throw Error('ci-capture-producer-files-invalid');
}
export function captureProducerFiles(files) {
  validFiles(files);
  if (!files.length) throw Error('ci-capture-producer-files-invalid');
  // Normal registration/class/review data is separately pinned by the immutable
  // ordinary review reader. All other tracked inputs, including unknown future
  // dependencies and executable files inside evidence folders, remain frozen.
  return Object.freeze(files.filter((file) => !authorityData.test(file)).sort());
}
export function assertCaptureProducerFiles(before, after, changed = []) {
  validFiles(before);
  validFiles(after);
  validFiles(changed);
  if (
    !before.length ||
    before.length !== after.length ||
    before.some((file, i) => file !== after[i])
  )
    throw Error('ci-capture-producer-closure-changed');
  const inputs = new Set(before);
  if (changed.some((file) => inputs.has(file))) throw Error('ci-capture-producer-source-changed');
  return true;
}
