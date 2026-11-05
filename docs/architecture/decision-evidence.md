# Decision evidence

S24A records what a node explicitly reports and what a built-in filter actually returns. These are different facts. A declared reason does not prove the underlying business rule was correct; an observed keep does not promise successful downstream delivery.

```ts
const eligibility = defineComponent({
  ...filter(jsonContract, (value, context) => {
    if (value.amount < 5) context.recordDecision({
      code: 'BELOW_THRESHOLD', ruleVersion: 'rule-v1', outcome: 'drop',
      facts: [{ name: 'amount', sourcePacketId: context.packet.packetId, fieldPath: '/amount' }],
    });
    return value.amount >= 5;
  }),
  decisions: [{ code: 'BELOW_THRESHOLD', ruleVersion: 'rule-v1', outcomes: ['drop'], facts: ['amount'] }],
});
```

After building, run `node examples/09-decision-evidence.cjs` for a complete offline flow. Amount4 has one declared BELOW_THRESHOLD report and one observed drop; amount6 is forwarded with an observed keep. Legacy boolean predicates remain valid and record their actual disposition without inventing a reason.

## Definition and invocation

ComponentSpec and FunctionSpec accept optional frozen decisions declarations, unique by code/ruleVersion. Limit32 declarations, five allowed outcome kinds (keep/drop/route/wait/business-result) and16 unique fact names per declaration. Codes, rule versions and fact names use ASCII identifiers1–256characters. Invalid definitions throw INVALID_ARGUMENT before factories run. describeRegistry remains strict catalog1; describeDecisions(registry) supplies a separate version1 decision catalog with up to1024 components. Its passive browser validator is validateDecisionCatalog.

TaskContext.recordDecision is available to ordinary functions and advanced task handlers. It returns boolean and never throws. Invalid/undeclared/foreign/closed/cross-attempt calls return false and increment a rejection counter; they do not become business errors or retry requests. Each attempt accepts at most32 reports. Facts are references, not arbitrary values: at most16 unique declared names, optional actual-bound sourcePacketId and a valid JSON Pointer up to256 UTF-16 code units. A pointer requires a source packet; the logger does not dereference it or validate that the field exists. Payload visibility still requires capture policy. Node-scoped tasks may name a fact without claiming a packet/path.

Declarations and accepted requests are copied/frozen. Getters, proxies, raw Error objects, unknown fields and raw values are refused. Input attribution comes from the existing actual-delivery task binding, not a most-recent-input guess. The AsyncLocal attempt lease prevents an older async continuation from invoking a newer attempt's recorder, even if it retained that newer context.

## Read and retain

```ts
const stop = onDecisions(run, () => publish(decisionSnapshot(run)));
const current = decisionSnapshot(run);
stop();
```

DecisionSnapshot has format nodeflow.decisions/version1, runId, total, dropped, rejected and immutable events. Reported records use format nodeflow.decision and include code/ruleVersion/outcome/facts. Runtime-only predicate observations use nodeflow.filter and keep/drop. Both include exact node/operation/attempt identities, input metadata, stream-local sequence and monotonic time. validateDecisions from `/model` validates passive transported snapshots; it does not execute predicates or certify business reasoning.

DG1 metadata and decision records share the existing `diagnostics.limit` retention ceiling (default128, legal1–1024). New observations evict oldest across both streams, so inspect each stream's dropped count. Sequences are independent; references require stream+sequence. The lifecycle diagnosticLimit option, EX1 and execution duplicate ledger remain unchanged. onDecisions shares the existing bounded/coalesced diagnostic notification owner; metadata changes may also notify it. Synchronous observer failures detach without changing execution. Late refused calls may increase rejected after terminal; they cannot append a decision for a closed attempt or change terminal metadata.

No global packet store or raw payload capture is added. DG1/EX1/catalog1 admit no new unknown variants. S23 sinks/JSONL still export DG1 only; S24B owns combined evidence/explanation integration, trusted build identity and the inspector view. Without that later provenance, do not claim reproducibility or complete business reasoning. [S24A receipt](../cursor_plans/fbp-extensions/S24A-execution.md).
