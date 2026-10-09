// @story #190
// Operator installation bootstrap only; never initializes a broker or enrollment.
import { bootstrapPortableInventory } from '../src/installed/portable-inventory.mjs';
try {
  if (process.argv.length !== 2) throw Error('portable-bootstrap-options-invalid');
  console.log(JSON.stringify(await bootstrapPortableInventory()));
} catch (error) {
  console.error('APR_PORTABLE_BOOTSTRAP_FAILED: ' + error.message);
  process.exitCode = 1;
}
