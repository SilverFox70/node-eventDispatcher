const { test } = require('node:test');
const assert = require('node:assert/strict');
const { packet } = require('../dist/cjs/index.js');

test('isolated JSON packet boundary', () => {
  const input = { nested: [1, { flag: true }] };
  const p = packet(input);
  assert.notEqual(p.value, input);
  assert.equal(Object.isFrozen(p), true);
  assert.equal(Object.isFrozen(p.value.nested[1]), true);
  input.nested[1].flag = false;
  assert.equal(p.value.nested[1].flag, true);
});

test('JSON boundary rejects unsupported data without executing getters', () => {
  let calls = 0;
  const getter = Object.defineProperty({}, 'x', { enumerable: true, get() { calls++; return 1; } });
  const arrayGetter = [1];
  Object.defineProperty(arrayGetter, '0', { get() { calls++; return 1; } });
  const cycle = {}; cycle.self = cycle;
  const sparse = new Array(2);
  const holeWithExtra = new Array(1); holeWithExtra.extra = 1;
  const extraArray = [1]; extraArray.extra = 2;
  const symbolArray = [1]; symbolArray[Symbol('extra')] = 1;
  class Custom { constructor() { this.value = 1; } }
  class CustomArray extends Array {}
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const proxy = new Proxy({}, { ownKeys() { calls++; return []; } });
  for (const value of [undefined, NaN, Infinity, -Infinity, 1n, Symbol('x'), () => {},
    new Date(), new Map(), new Custom(), new CustomArray(), getter, arrayGetter,
    cycle, revoked.proxy, sparse, holeWithExtra, extraArray, symbolArray, proxy, { x: undefined },
    { [Symbol('x')]: 1 }, { toJSON() { calls++; return 1; } }]) {
    assert.throws(() => packet(value), { code: 'INVALID_PACKET' });
  }
  assert.equal(calls, 0);
});

test('JSON limits are exact and metadata does not consume the payload budget', () => {
  const exact = 'x'.repeat(1048574);
  assert.equal(packet(exact, { jobId: 'job-42', key: 'k'.repeat(128) }).value.length, exact.length);
  assert.throws(() => packet(exact + 'x'), { code: 'INVALID_PACKET' });
  assert.throws(() => packet('x'.repeat(1048577)), { code: 'INVALID_PACKET' });
  assert.throws(() => packet('é'.repeat(524288)), { code: 'INVALID_PACKET' });
  assert.throws(() => packet('\n'.repeat(524288)), { code: 'INVALID_PACKET' });
  assert.throws(() => packet({ ['x'.repeat(1048577)]: 1 }), { code: 'INVALID_PACKET' });
  const nested = count => { let value = null; while (count--) value = [value]; return value; };
  assert.ok(packet(nested(64)));
  assert.throws(() => packet(nested(65)), { code: 'INVALID_PACKET' });
  let empty = [];
  for (let index = 0; index < 64; index++) empty = [empty];
  assert.throws(() => packet(empty), { code: 'INVALID_PACKET' });
  assert.throws(() => packet(new Array(1048577)), { code: 'INVALID_PACKET' });
});

test('plain data copies preserve JSON values and safe property names', () => {
  const input = Object.create(null);
  input.__proto__ = { safe: true };
  Object.defineProperty(input, 'hidden', { value: 2 });
  const shared = { n: 3 };
  const p = packet({ input, a: shared, b: shared, values: [null, false, true, -0, 2.5, 'é', []] });
  assert.equal(Object.hasOwn(p.value.input, '__proto__'), true);
  assert.equal(p.value.input.__proto__.safe, true);
  assert.equal(p.value.input.hidden, 2);
  assert.notEqual(p.value.a, p.value.b);
  assert.notEqual(p.value.a, shared);
  assert.deepEqual(p.value.values, [null, false, true, -0, 2.5, 'é', []]);
  assert.equal(Object.isFrozen(p.value.values), true);
  assert.equal(Object.isFrozen(p.parentPacketIds), true);
  assert.equal(packet(null).value, null);
});
