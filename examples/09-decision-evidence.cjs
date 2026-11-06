const assert = require('node:assert/strict');
const f = require('event-driven-design');
async function main() {
  const eligibility = f.defineComponent({ ...f.filter(f.jsonContract, (value, context) => {
    if (value.amount < 5) context.recordDecision({ code: 'BELOW_THRESHOLD', ruleVersion: 'rule-v1', outcome: 'drop',
      facts: [{ name: 'amount', sourcePacketId: context.packet.packetId, fieldPath: '/amount' }] });
    return value.amount >= 5;
  }), title: 'Eligibility', decisions: [{ code: 'BELOW_THRESHOLD', ruleVersion: 'rule-v1', outcomes: ['drop'], facts: ['amount'] }] });
  const graph = f.createGraph(), node = graph.add('eligible', eligibility);
  graph.exposeInput('in', node, 'in'); graph.exposeOutput('out', node, 'out');
  const compiled = f.compileGraph(graph.toSpec(), { 'filter@1': eligibility }); assert(compiled.ok);
  const run = f.startNetwork(compiled.graph);
  const reading = (async () => { for await (const result of run.outputs.out) console.log('Forwarded amount:', result.value.amount); })();
  for (const amount of [4, 6]) await run.send('in', f.packet({ amount }, { jobId: `amount-${amount}` }));
  await run.finish(); await reading;
  for (const event of f.decisionSnapshot(run).events) {
    if (event.format === 'nodeflow.decision') console.log('Declared:', event.code, event.ruleVersion, event.outcome);
    else console.log('Observed:', event.outcome, 'job:', event.inputs[0].jobId);
  }
  console.log('Run:', (await run.done).status);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
