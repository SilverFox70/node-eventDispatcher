const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canonicalJson } = require('../dist/cjs/model/index.js');

test('canonical JSON pins lexical UTF-8 preimages and bounds expanded data', () => {
  assert.equal(canonicalJson({ 2: 'é', 10: [-0, false, null] }), '{"10":[0,false,null],"2":"é"}');
  assert.equal(canonicalJson('é', 4), '"é"');
  for (const [value, size] of [['é', 3], ['123', 2], [[1, 2], 1]]) {
    assert.throws(() => canonicalJson(value, size), /JSON_LIMIT/);
  }
  const loop = {};
  loop.loop = loop;
  const deep = Array.from({ length: 260 }).reduce(value => [value], null);
  const sparse = Array(2);
  sparse[1] = 1;
  for (const value of [loop, deep, undefined, NaN, Infinity, new Date(), sparse,
    { get secret() { throw Error('getter ran'); } }]) {
    assert.throws(() => canonicalJson(value), /INVALID_(JSON|CATALOG)/);
  }
  const shared = { value: 1 };
  assert.equal(canonicalJson([shared, shared]), '[{"value":1},{"value":1}]');
});
