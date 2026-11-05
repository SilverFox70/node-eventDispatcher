import { defineFunction, jsonContract, describeDecisions, decisionSnapshot, onDecisions, type NetworkRun, type TaskContext } from '../../dist/cjs';
import { validateDecisions, validateDecisionCatalog } from '../../dist/cjs/model';
const node = defineFunction({ id: 'why', version: 1, title: 'Why', description: '', input: jsonContract, output: jsonContract,
  decisions: [{ code: 'OK', ruleVersion: 'v1', outcomes: ['keep'], facts: ['input'] }],
  handler(value, ctx) { const accepted: boolean = ctx.recordDecision({ code: 'OK', ruleVersion: 'v1', outcome: 'keep', facts: [{ name: 'input', sourcePacketId: ctx.packet.packetId }] }); void accepted; return value; } });
validateDecisionCatalog(describeDecisions({ 'why@1': node }));
declare const run: NetworkRun; validateDecisions(decisionSnapshot(run)); onDecisions(run, () => {});
declare const ctx: TaskContext;
// @ts-expect-error Evidence references are data, not arbitrary raw values.
ctx.recordDecision({ code: 'OK', ruleVersion: 'v1', outcome: 'keep', facts: [{ name: 'input', value: 'secret' }] });
// @ts-expect-error Outcomes are finite.
ctx.recordDecision({ code: 'OK', ruleVersion: 'v1', outcome: 'approved', facts: [] });
// @ts-expect-error Snapshot is immutable.
decisionSnapshot(run).events.push({});
