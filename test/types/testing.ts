import { contract, defineFunction, defineComponent, packet, type Packet } from 'event-driven-design';
import { runNode, runGraph, type TestResult } from 'event-driven-design/testing';
import { z } from 'zod';
const numeric = contract('test-number@1', z.number());
const text = contract('test-text@1', z.string());
const node = defineFunction({ id: 'format', version: 1, title: 'Format', description: '',
  input: numeric, output: text, handler: value => String(value) });
async function checks() {
  const result = await runNode(node, { inputs: { in: [packet(2)] } });
  const output: readonly Packet<string>[] = result.outputs.out;
  const label: string = output[0].value;
  void label;
  // @ts-expect-error Outputs retain the actual contract payload.
  const wrong: number = output[0].value; void wrong;
  // @ts-expect-error Output ports stay exact.
  void result.outputs.missing;
  // @ts-expect-error Collector results are readonly.
  result.outputs.out.push(packet('x'));
  // @ts-expect-error Wrong payload cannot widen inferred node inputs.
  await runNode(node, { inputs: { in: [packet('wrong')] } });
  // @ts-expect-error Unknown input ports are rejected.
  await runNode(node, { inputs: { missing: [] } });
  await runNode(node, { inputs: {} });
  const advanced = defineComponent({ id: 'advanced', version: 1, title: 'Advanced', description: '',
    in: { count: numeric, label: text }, out: { label: text, count: numeric }, create: () => async () => {} });
  const multi = await runNode(advanced, { inputs: { count: [packet(1)], label: [packet('a')] } });
  const count: number = multi.outputs.count[0].value; void count;
  // @ts-expect-error Heterogeneous inputs keep their individual contract types.
  await runNode(advanced, { inputs: { count: [packet('a')] } });
}
void checks;
const dynamic: (graph: Parameters<typeof runGraph>[0]) => Promise<TestResult> = graph => runGraph(graph, { inputs: {} });
void dynamic;
