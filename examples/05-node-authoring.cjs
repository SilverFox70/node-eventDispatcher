const assert = require('node:assert/strict');
const { setImmediate } = require('node:timers/promises');
const { z } = require('zod');
const { contract, defineFunction, defineComponent, describeRegistry, packet } = require('event-driven-design');
const { runNode } = require('event-driven-design/testing');

async function main() {
  const request = contract('lookup-request@1', z.strictObject({ id: z.string() }));
  const response = contract('lookup-result@1', z.union([
    z.strictObject({ kind: z.literal('found'), id: z.string(), label: z.string() }),
    z.strictObject({ kind: z.literal('missing'), id: z.string() }),
  ]));
  let calls = 0;
  const lookup = async (id, { signal }) => {
    calls++; await setImmediate(undefined, { signal });
    return id === 'x' ? { label: 'Ada' } : null;
  };
  const node = defineComponent({
    ...defineFunction({ id: 'lookup', version: 1, title: 'Lookup', description: 'Injected local fake', input: request, output: response,
      handler: async (value, context) => {
        const found = await lookup(value.id, { signal: context.signal });
        return found ? { kind: 'found', id: value.id, label: found.label } : { kind: 'missing', id: value.id };
      } }), effects: ['profile.read'], requiredDependencies: ['lookup'],
  });
  const result = await runNode(node, { inputs: { in: [packet({ id: 'x' }), packet({ id: 'unknown' })] } });
  assert.equal(result.terminal.status, 'completed'); assert.equal(calls, 2);
  assert.deepEqual(result.outputs.out.map(p => p.value), [{ kind: 'found', id: 'x', label: 'Ada' }, { kind: 'missing', id: 'unknown' }]);
  console.log('Lookup:', JSON.stringify(result.outputs.out.map(p => p.value)));
  console.log('Calls:', calls, 'Run:', result.terminal.status);
  console.log('Dependencies:', describeRegistry({ 'lookup@1': node }).components[0].requiredDependencies.join(','));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
