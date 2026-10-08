// @story #187
// Test-runner scheduling data only; every active file retains one real execution.
export const WINDOWS_PORTABLE_UNIT_GROUPS = Object.freeze([
  'selection',
  'authority',
  'storage',
  'identity',
]);
export const RUNTIME_SELECTION_AGGREGATE = 'test/unit/runtime-selection.test.mjs';
export function runtimeSelectionCaseFile(group) {
  if (!WINDOWS_PORTABLE_UNIT_GROUPS.includes(group)) throw new Error('Unknown portable unit group');
  return 'test/unit/runtime-selection-cases/' + group + '.mjs';
}
function portableUnitGroup(file) {
  if (file === 'test/unit/portable-authority-fences.test.mjs') return 'authority';
  if (
    /[\/](?:storage-protection|ownership-election|portable-(?:storage|election)[^\/]*)\.test\.mjs$/.test(
      file
    )
  )
    return 'storage';
  if (file === 'test/unit/ci-native-build-policy.test.mjs' || /[\/]broker-http/.test(file))
    return 'selection';
  return 'identity';
}

export function classifySuiteFiles(discovered) {
  const portable = discovered.filter(
    (file) =>
      file === 'test/unit/ci-native-build-policy.test.mjs' ||
      file === 'test/unit/runtime-selection.test.mjs' ||
      /[\/]broker-http(?:-concurrency)?\.test\.mjs$/.test(file) ||
      /[\/](?:portable-[^\/]+|windows-portable-bootstrap|storage-protection|ownership-election|process-source-[^\/]+)\.test\.mjs$/.test(
        file
      )
  );
  const excluded = discovered.filter(
    (file) =>
      !portable.includes(file) &&
      (/[\\/]broker-[^\\/]+\.test\.mjs$/.test(file) ||
        file === 'test/smoke/cli.test.mjs' ||
        file === 'test/unit/source-test-preparation.test.mjs')
  );
  const ordinary = discovered.filter(
    (file) => !excluded.includes(file) && !portable.includes(file)
  );
  const groups = [
    { files: ordinary, filtered: true },
    { files: portable, filtered: false },
  ].filter((group) => group.files.length);
  const windowsPortableShards = WINDOWS_PORTABLE_UNIT_GROUPS.map((name) => ({
    name,
    files: [
      ...portable.filter(
        (file) => file !== RUNTIME_SELECTION_AGGREGATE && portableUnitGroup(file) === name
      ),
      runtimeSelectionCaseFile(name),
    ].sort(),
    filtered: false,
  }));
  return { groups, excluded, windowsPortableShards };
}
export function suiteCommandArguments({ files, filtered }, { suite, platform, hosted }) {
  return [
    '--test',
    ...(filtered
      ? [
          '--test-skip-pattern=/broker|native helper|native exclusive|standalone production worker/i',
        ]
      : []),
    ...(suite === 'integration' ? ['--test-concurrency=2'] : []),
    ...(suite === 'unit' && !filtered && platform === 'win32' && hosted
      ? ['--test-concurrency=1']
      : []),
    ...files,
  ];
}
