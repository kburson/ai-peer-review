// @story #162
// Test-only suspension; this is never production runtime or release authority.
export function nativeBrokerSkipReason(env = process.env) {
  return env.APR_SKIP_NATIVE_BROKER_TESTS === '1'
    ? 'Native broker verification suspended during JavaScript-only migration'
    : false;
}
