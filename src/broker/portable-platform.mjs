// @story #186
import { initializePortableSystem, assertPortableSystemContext } from './portable-system.mjs';
import { loadProcessSourceAssurance } from '../protocol/process-source-assurance.mjs';
const members = new WeakMap();
export async function initializePortableOperations(input = {}) {
  const system = await initializePortableSystem(input);
  const context = Object.freeze({ signal: input.signal, deadline: input.deadline });
  const operations = Object.freeze({
    ...system,
    async observeSource() {
      await assertPortableSystemContext(system, context);
      // #187 removes the native Windows selection crossing before source admission.
      // Never call the old Windows selection adapter, even to obtain a refusal.
      const assurance =
        process.platform === 'win32'
          ? Object.freeze({
              verified: false,
              absence: Object.freeze({
                status: 'unavailable',
                reason: 'source-class-unavailable',
                detail: 'portable-selection-migration-required',
              }),
              creation: Object.freeze({
                status: 'unavailable',
                reason: 'creation-stamp-unavailable',
                detail: 'portable-selection-migration-required',
              }),
            })
          : await loadProcessSourceAssurance(context);
      await assertPortableSystemContext(system, context);
      return assurance;
    },
  });
  members.set(operations, { system });
  return operations;
}
export function isPortableOperations(value) {
  return members.has(value);
}
export async function assertPortableOperationsContext(value, context) {
  const record = members.get(value);
  // The actual system assertion refuses copied membership as well as replaced contexts.
  await assertPortableSystemContext(record?.system, context);
}
