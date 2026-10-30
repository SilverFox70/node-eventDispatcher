import { createGraph, defineComponent, contract, jsonContract, type NodeHandle } from 'event-driven-design';
import { z } from 'zod';
const numeric = contract('n@1', z.number()), text = contract('s@1', z.string());
const node = defineComponent({ id: 'n', version: 1, title: 'Number', description: '',
  in: { value: numeric }, out: { result: numeric }, create: () => async () => {} });
const mixed = defineComponent({ id: 'm', version: 1, title: 'Mixed', description: '',
  in: { number: numeric, text }, out: { number: numeric, text }, create: () => async () => {} });
const wide = defineComponent({ id: 'w', version: 1, title: 'JSON', description: '',
  in: { value: jsonContract }, out: {}, create: () => async () => {} });
const graph = createGraph(), a = graph.add('a', node), b = graph.add('b', node), m = graph.add('m', mixed);
graph.connect(a, 'result', b, 'value');
graph.connect(m, 'number', b, 'value', 1);
graph.connect(a, 'result', graph.add('w', wide), 'value');
graph.exposeInput('value', a, 'value'); graph.exposeOutput('result', b, 'result');
// @ts-expect-error Unknown source port.
graph.connect(a, 'missing', b, 'value');
// @ts-expect-error Unknown destination port.
graph.connect(a, 'result', b, 'missing');
// @ts-expect-error Existing string output cannot feed a numeric input.
graph.connect(m, 'text', b, 'value');
// @ts-expect-error Multiple destination ports must not widen to accept a wrong payload.
graph.connect(m, 'text', m, 'number');
// @ts-expect-error Input exposure requires an input port.
graph.exposeInput('wrong', a, 'result');
// @ts-expect-error Output exposure requires an output port.
graph.exposeOutput('wrong', a, 'value');
// @ts-expect-error Node handles cannot be forged structurally.
const forged: NodeHandle<typeof node.in, typeof node.out> = {};
void forged;
const destinationPort: 'number' | 'text' = Math.random() > 0.5 ? 'number' : 'text';
// @ts-expect-error An uncertain destination port might be numeric; a union must not hide that.
graph.connect(m, 'text', m, destinationPort);
const sourcePort: 'number' | 'text' = Math.random() > 0.5 ? 'number' : 'text';
// @ts-expect-error An uncertain source port might carry text.
graph.connect(m, sourcePort, b, 'value');
