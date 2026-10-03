# SAR Round 2 Actual Patch

Before: `6e011dd12b644f6d4af377e92130fa51dd9a41d3c6f9e812193195f2884b9a90`
After: `44c41fb83e86a205d72cdd58ff62a8ebee46cae14a3b25631e95ce532bfc5c1c`

```diff
--- docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-1-after-plan.md	2026-10-03 11:58:04
+++ docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-final-plan.md	2026-10-03 11:58:09
@@ -287,7 +287,7 @@
 
 #### Implementation Scope
 
-**Files:** Create `scripts/audit-production-closure.mjs`, `test/unit/production-closure.test.mjs`, `test/integration/portable-installed-broker.test.mjs`, `test/helpers/portable-network-policy.mjs`. Modify `package.json`, `package-lock.json`, `test/packaging/package.test.mjs`, `test/integration/broker-release.test.mjs`, `test/unit/broker-build.test.mjs`, `test/unit/broker-build-command.test.mjs`, `test/helpers/warm-packed-cache.mjs`, `test/helpers/windows-offline.mjs`, `test/helpers/assert-network.mjs`, `test/helpers/windows-offline.ps1`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `src/doctor.mjs`, `src/config/setup.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/cli/help-data.mjs`. Retire production `scripts/build-broker-security.mjs` / `native/broker-security/` only after Tasks1–3 portable lifecycle proof.
+**Files:** Create `scripts/audit-production-closure.mjs`, `test/unit/production-closure.test.mjs`, `test/integration/portable-installed-broker.test.mjs`, `test/helpers/portable-network-policy.mjs`. Modify `package.json`, `package-lock.json`, `test/packaging/package.test.mjs`, `test/integration/broker-release.test.mjs`, `test/unit/broker-build.test.mjs`, `test/unit/broker-build-command.test.mjs`, `test/helpers/warm-packed-cache.mjs`, `test/helpers/windows-offline.mjs`, `test/helpers/assert-network.mjs`, `test/helpers/windows-offline.ps1`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `src/doctor.mjs`, `src/config/setup.mjs`, `src/cli/parse.mjs`, `src/cli/run.mjs`, `src/cli/help-data.mjs`, `src/broker/runtime-image.mjs`, `README.md`, `test/helpers/internal-api.mjs`, `test/helpers/installed-provider/scenario.mjs`, `test/helpers/slow-broker-recovery.mjs`, `test/unit/errors.test.mjs`, `test/unit/broker-ownership.test.mjs`, `test/unit/broker-registry.test.mjs`, `test/integration/broker-readiness.test.mjs`, `test/integration/setup-doctor.test.mjs`, `test/live/installed-broker-handoff.mjs`. Retire production `scripts/build-broker-security.mjs` / `native/broker-security/` only after Tasks1–3 portable lifecycle proof.
 
 **Interfaces:**
 
@@ -308,6 +308,8 @@
 - [ ] Run focused tests red.
 - [ ] Audit lock graph plus installed `npm ls --omit=dev --json` tree and actual package files/scripts. SDK/Zod/Prettier undergo same audit; tooling moves dev only if runtime import inventory proves unused. No name-only denylist proof.
 - [ ] Remove node-gyp/native sources/build invocation from production runtime/tarball/export/help after portable tests pass; regenerate lock normally and inspect dependency diff. Preserve legacy history in retained installation subject to reviewed migration, no native fallback in new package.
+- [ ] Migrate all inventoried native fixtures: internal-api/registry image bytes omit helper files; runtime-image inventory verifies pure JavaScript installation bytes without changing #102 selection/routing policy; ownership/readiness tests exercise portable actual installed storage/HTTP concurrency without nativeAvailable skip gates; errors/setup-doctor assert portable help/dependencies; slow-recovery/installed-provider/live handoff use portable APIs and never build helpers. Preserve their failure/reconciliation assertions; do not delete coverage or keep CI-only native skip paths.
+
 - [ ] Remove Python/MSVC/build-essential/Xcode/headers/APR_NATIVE_REQUIRED/APR_NODEDIR_BASE CI provisioning. Preserve Node24/26/current × Ubuntu/macOS/Windows and npm11.8.0/12.0.2 parser coverage, all current verification suites/release provenance.
 - [ ] Offline installed proof warms JS production cache then denies external egress while allowing loopback. Existing unshare/macOS blanket IP deny blocks target transport: replace OS policy, verify local success/external failure and restore in finally. AIPR never installs provider executables; optional live CLI setup stays explicit external prerequisite.
 - [ ] Run green closure/installed/pack/smoke and commit.
@@ -329,7 +331,7 @@
 **Verification Commands:**
 
 ```sh
-node --test test/unit/production-closure.test.mjs test/integration/portable-installed-broker.test.mjs
+node --test test/unit/production-closure.test.mjs test/integration/portable-installed-broker.test.mjs test/unit/broker-ownership.test.mjs test/unit/broker-registry.test.mjs test/unit/errors.test.mjs test/integration/broker-readiness.test.mjs test/integration/setup-doctor.test.mjs
 node scripts/audit-production-closure.mjs
 npm ls --omit=dev --json
 npm run test:packaging
```
