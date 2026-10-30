const { test } = require('node:test');
const assert = require('node:assert/strict');
const z = require('zod');
const core = require('zod/v4/core');
const { contract } = require('../dist/cjs/index.js');

test('schema subset preserves supported assertions and rejects unsupported capabilities', () => {
  const cases = [
    [z.string().min(1).max(3), 'ab', ''], [z.string().length(2), 'ab', 'a'],
    [z.number().gte(0).lt(10).multipleOf(2), 4, 3], [z.number().int(), 2, 2.5],
    [z.int32(), 2, 2147483648], [z.float64(), 2.5, Infinity],
    [z.boolean(), true, 1], [z.null(), null, false], [z.literal(['a', 2, true, null]), 2, 'x'],
    [z.enum(['a', 'b']), 'a', 'c'], [z.array(z.number()).min(1).max(2), [1], []],
    [z.array(z.number()).length(2), [1, 2], [1]],
    [z.strictObject({ x: z.string(), y: z.number().optional() }), { x: 'a' }, { x: 'a', extra: 1 }],
    [z.string().nullable(), null, 1], [z.union([z.number(), z.string()]), 'a', false],
    [z.uuid(), '00000000-0000-4000-8000-000000000001', 'bad'],
    [z.iso.datetime(), '2026-10-30T12:00:00Z', 'yesterday']
  ];
  cases.forEach(([schema, good, bad], index) => {
    const c = contract(`case-${index}@1`, schema);
    assert.equal(c.validate(good), true, `good case ${index}`);
    assert.equal(c.validate(bad), false, `bad case ${index}`);
    assert.equal(c.schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  });
  let calls = 0;
  const unsupported = [z.coerce.number(), z.coerce.string(), z.number().default(1), z.string().transform(() => { calls++; return 1; }),
    z.number().refine(() => { calls++; return true; }), z.number().refine(async () => true),
    z.lazy(() => z.string()), z.date(), z.bigint(), z.symbol(), z.undefined(), z.unknown(), z.any(), z.never(),
    z.object({ x: z.number() }), z.looseObject({}), z.string().optional(), z.array(z.string().optional()),
    z.record(z.string(), z.number()), z.tuple([z.number()]), z.intersection(z.string(), z.string()),
    z.string().trim(), z.string().regex(/a/), z.email(), z.iso.date(), z.string().catch('fallback'), z.string().readonly(),
    z.string().min(2, { when: () => { calls++; return false; } }), z.number().min(Infinity),
    z.number().multipleOf(0), z.string().min(-1), z.literal(undefined), z.literal(1n), z.literal(NaN),
    z.float32(), null, {}];
  for (const schema of unsupported) assert.throws(() => contract('bad@1', schema), { code: 'UNSUPPORTED_SCHEMA' });
  const unknownCheck = new core.$ZodCheck({ check: 'future-check' });
  assert.throws(() => contract('bad@1', z.string().check(unknownCheck)), { code: 'UNSUPPORTED_SCHEMA' });
  assert.equal(calls, 0);
});

test('documented core recursion and malformed-check guards refuse unsupported definitions', () => {
  let getterCalls = 0;
  const recursive = z.strictObject({ get child() { getterCalls++; return recursive; } });
  assert.throws(() => contract('recursive@1', recursive), { code: 'UNSUPPORTED_SCHEMA' });
  assert.equal(getterCalls, 1);
  const malformed = new core.$ZodCheckMinLength({ check: 'min_length' });
  assert.throws(() => contract('bad@1', z.string().check(malformed)), { code: 'UNSUPPORTED_SCHEMA' });
  assert.throws(() => contract('bad@1', z.enum({ value: Infinity })), { code: 'UNSUPPORTED_SCHEMA' });
  assert.equal(contract('enum@1', z.enum({ ONE: 1, TWO: 2 })).validate(1), true);
  assert.equal(contract('unicode@1', z.string().length(1)).validate('😀'), true);
  assert.equal(contract('unicode-min@1', z.string().min(2)).validate('😀'), false);
  let deep = z.string();
  for (let index = 0; index < 66; index++) deep = z.array(deep);
  assert.throws(() => contract('deep@1', deep), { code: 'UNSUPPORTED_SCHEMA' });
});


test('format patterns and options preserve descriptor meaning', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  assert.equal(contract('uuid-v4@1', z.uuid({ version: 'v4' })).validate(id), true);
  assert.equal(contract('time@1', z.iso.datetime({ offset: true, precision: 0 })).validate('2026-10-30T12:00:00+01:00'), true);
  const invalidVersion = z.uuid(); invalidVersion._zod.def.version = 'v9';
  for (const schema of [z.uuid({ pattern: /.*/ }), invalidVersion,
    z.iso.datetime({ local: true }), z.iso.datetime({ precision: -1 }),
    z.iso.datetime({ pattern: /.*/ })]) {
    assert.throws(() => contract('bad@1', schema), { code: 'UNSUPPORTED_SCHEMA' });
  }
});


test('core object accessors refuse before traversal invokes their values', () => {
  let calls = 0;
  const shape = Object.defineProperty({}, 'field', { enumerable: true, get() { calls++; return z.string(); } });
  const schema = new core.$ZodObject({ type: 'object', shape: {}, catchall: new core.$ZodNever({ type: 'never' }) });
  // Deliberately malformed JS definition bypasses Zod's normal shape materialization.
  Object.defineProperty(schema._zod.def, 'shape', { value: shape, configurable: true });
  assert.throws(() => contract('accessor@1', schema), { code: 'UNSUPPORTED_SCHEMA' });
  assert.equal(calls, 0);
});


test('object schema symbol keys are unsupported JSON members', () => {
  assert.throws(() => contract('symbols@1', z.strictObject({ [Symbol('field')]: z.number() })), { code: 'UNSUPPORTED_SCHEMA' });
});
