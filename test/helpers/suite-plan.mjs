// @story #187
// Test-runner scheduling data only; every active file retains one real execution.
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
  return { groups, excluded };
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
