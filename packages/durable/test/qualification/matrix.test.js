import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matrix, orderCases } from './evidence.mjs';
import { withQualification } from './harness.mjs';
import { join, pin, rollback, signal, unavailable } from './host-cases.mjs';
import { accepted, outcome, permit, prepared, submission } from './provider-cases.mjs';

const seed = Number(process.env.FBP_QUALIFICATION_SEED ?? 2919);
assert(Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffffffff, 'Invalid qualification seed');
assert(process.env.FBP_POSTGRES_TEST_URL, 'A disposable PostgreSQL service is required');
const cases = { rollback, submission, prepared, permit, accepted, outcome, unavailable, pin, signal, join };
assert.deepEqual(Object.keys(cases).sort(), Object.keys(matrix).sort());
for (const id of orderCases(seed, Object.keys(cases))) {
  test('qualification: ' + id, { timeout: 25000 }, async context => {
    const receipt = await withQualification(id, seed, cases[id]);
    context.diagnostic(JSON.stringify(receipt));
  });
}
