# SAR Round 3 Actual Patch

```diff
--- docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-round-2-after-plan.md	2026-10-03 12:02:46
+++ docs/superpowers/peer-reviews/plan/2026-10-03-107-portable-runtime-sar-final-accepted-plan.md	2026-10-03 12:02:50
@@ -291,7 +291,7 @@
 
 **Interfaces:**
 
-- **Consumes:** Tasks1–3 portable lifecycle APIs, actual installed package inventory and npm lock/production graph; no new review orchestration required for transport conformance.
+- **Consumes:** Tasks1–3 portable lifecycle APIs, actual installed package inventory and npm lock/production graph; existing test-only `test/helpers/npm-command.mjs` exports `runNpm(tool,args,options)` for package tests. The audit module consumes the parsed tree and does not import test code; no new review orchestration is required for transport conformance.
 - **Produces:** `auditProductionClosure({lockfile,packageRoot,installedTree,packInventory}):AuditReport` and exported `productionGraph(lockfile)` enumerate all direct/transitive/optional production files/scripts/native/download risks and source/license rationale.
 
 - [ ] Write red transitive native/build/download/disguised architecture-binary fixtures and actual installed-tarball broker lifecycle/auth/concurrency/recovery tests.
@@ -317,7 +317,10 @@
 - [ ] Add the following implementation invariant at this task's owning seam, then complete every enumerated boundary fixture:
 
 ```js
-const tree = JSON.parse(await runNpm(['ls', '--omit=dev', '--json']));
+// In test/unit/production-closure.test.mjs, using the existing test helper:
+const tree = JSON.parse(
+  runNpm('npm', ['ls', '--omit=dev', '--json'], { cwd: packageRoot, encoding: 'utf8' })
+);
 const report = auditProductionClosure({
   lockfile,
   packageRoot,
```
