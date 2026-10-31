# Writing a node that humans and agents can maintain

S13 provides a copyable lookup recipe and executable checks around the function adapter delivered in S09B. Most application nodes should expose a small contract, do one understandable operation and return a declared result. Stream orchestration remains the library's job.

Start with [templates/node](../templates/node/README.md). It includes contracts, a service-injected factory, fake fixtures and tests against the real compiler/runtime. [The runnable demo](../examples/05-node-authoring.cjs) uses those exact files rather than a hand-maintained second implementation.

```sh
npm run build
node scripts/test-node-template.mjs
node examples/05-node-authoring.cjs
```

The checker compiles a temporary ESM copy using built package exports and runs two discovered tests; it cleans up without installing anything. It is a checkout recipe proof, not the later installed-tarball cookbook proof. Copy/test commands for an application are in the template README.

## Decide the contract first

Name the node's purpose, component ID/version, input/output contract IDs and representation. Export schema-inferred value types when they make handlers and service interfaces clearer. Keep JSON outputs explicit; the framework rejects classes, undefined and other unsupported values. Rich representations remain a future profile.

The recipe reads profile-request@1 {id} and returns profile-result@1 found{id,label} or missing{id}. Missing is an expected business outcome. Neither input id nor a result discriminant substitutes for the packet's job/key correlation.

A handler receives the frozen input value and FunctionContext: signal, attempt, attemptId and metadata-only packet. Use context.packet.key/jobId/packetId/parentPacketIds; context.key and context.packet.value are not aliases. A successful return is authoritatively validated before exactly one child packet is derived and sent, preserving job/key with the input as its immediate parent. Handler calls are serial per node/run and output backpressure stops the next input.

## Inject capabilities through an ordinary factory

```ts
const node = makeLookupNode({ lookup });
```

The host supplies the service function; no framework service locator or global registry mutation is involved. The factory captures the function reference and passes the scoped AbortSignal to I/O. Readonly types describe an interface, not a deep clone of an HTTP client, cache or connection pool. Shared services must support the concurrent runs that use them.

Use one installed package instance/module entry for definitions, contracts and compiler/runtime. The ESM template checker and demo keep those imports together; the library's CommonJS entry remains available for CommonJS applications.

Test fakes should assert exact inputs, call count and signal, and return deterministic data. Avoid a fake that merely repeats the implementation's branch logic. examples.json states outcomes independently. Before exposing real effects, test wrong inputs, service failures, cancellation and downstream refusal at the relevant boundary. The library does not roll back an external effect when later validation/delivery fails.

## Declare metadata using the existing component owner

FunctionSpec deliberately describes the handler and contracts. Attach catalog metadata through defineComponent, as node.ts does:

```ts
return defineComponent({
  ...defineFunction(functionSpec),
  effects: ['profile.read'],
  requiredDependencies: ['lookup'],
});
```

This preserves the same adapter/process rather than implementing another executor. Descriptions/effects/dependency names/examples are public authored metadata. They are not permissions, credentials, callbacks or a mechanism for a graph proposal to select executable code. The trusted application registry decides which component versions can compile. An unknown component/version/representation refuses before service calls.

## Separate failures from declared business results

Return a schema-defined missing/unavailable/rejected branch when the application should keep processing and collate it. Throw for unexpected failures. Do not turn every rejection into a successful empty object. Runtime snapshots contain bounded safe verdict codes/paths, not arbitrary provider error messages or payloads.

There are no automatic retries by default. A graph may explicitly configure1–5 operation retries with allowed codes, delay and an idempotency commitment. Retries repeat a handler attempt, not packet delivery or graph creation; attempt identities/signals change while packet correlation remains stable. Do not retry an ambiguous write merely because its deadline expired.

Pass signal through to the actual client and stop starting further work after cancellation. Cancellation revokes framework capabilities and suppresses late results; it cannot forcibly interrupt arbitrary user code or undo provider effects. Choose a task timeout from the operation's real latency/failure requirements. The flow budget must accommodate its configured operation phases and the remaining end-to-end work. See [operation policy](architecture/node-operations.md); no new timer/retry loop belongs in a node wrapper.

## Keep mutable run state in create

An ordinary function factory's captured dependencies are shared if the definition is reused. The library creates fresh contexts, not copies of arbitrary closures. A counter or accumulator that belongs to a run must live inside defineComponent.create(), not outside it:

```ts
create: () => {
  let count = 0;
  return async ctx => {
    for await (const input of ctx.inputs.in) {
      const value = await ctx.task(() => ++count);
      await ctx.send('out', derivePacket(value, [input]));
    }
  };
}
```

This is an advanced process-body excerpt; supply explicit typed ports/metadata as usual. The authoring test runs two real instances and observes1/2 independently. Mutating such state is not automatically safe to retry.

## Review an agent's change the same way as a human's

Keep files focused: contracts, node, fixtures and tests have separate clear responsibilities. Use plain names/control flow and JSDoc for ownership/effect/order guarantees; do not narrate every line. Give the developer the node's purpose, dependency interface, correlation/error policy and expected fixtures before asking for an edit.

The checks deliberately modify a copied handler twice: a numeric label causes a named type error; an uppercase label passes typing but fails the unchanged Ada fixture. This demonstrates the feedback loop without adding an agent runtime, provider or arbitrary-code endpoint. Review intended behavior and versioning before changing fixtures to accept it.

S09B/S10 proofs remain the adapter/transform identity baseline; S13 adds real recipe, service, state and edit-feedback proofs. S14 supplies public node/graph test helpers; the template now uses runNode with the same production compiler/runtime. Persistence and crash-safe obligations remain a separate optional durable-host project.


## Test one node or a complete flow

Import runNode and runGraph from event-driven-design/testing. Supply packet arrays and use your own assert/Vitest/Jest expectations:

```ts
const result = await runNode(node, { inputs: { in: [packet({ id: 'x' })] } });
assert.equal(result.terminal.status, 'completed');
assert.deepEqual(result.outputs.out.map(p => p.value), [expected]);
```

The template injects a fake lookup, asserts its exact call/signal and checks job/key/immediate lineage. runNode infers each input/output port's payload; runGraph accepts a real compiled graph with dynamic named inputs. It exposes the same terminal, readonly output packet arrays and final snapshot. Dependencies remain ordinary injected services, not a test-only runtime. See [example06](../examples/06-testing.cjs) for runnable node and graph assertions.

All declared outputs drain concurrently before serial feeders start, one feeder per ingress. Omitted declared input arrays close immediately as empty streams. Relative arrival between different inputs is unspecified: use raw startNetwork with controlled producers for race-sensitive framework tests.

Options are inputs (required), timeoutMs (default1000, positive safe integer), maxOutputPackets (default1024, integer1–100000 shared across all outputs) and signal. The helper accepts at most100000 input packets total. Existing runtime graph/operation policies and its default65536 execution-record bound still apply; those limits are independent. A graph's configured operation phase cannot exceed the helper's flow timeout: explicitly increase timeoutMs when needed rather than silently shortening the operation budget.

Always assert terminal.status. A component failure returns failed plus packets already collected; cancellation returns cancelled normally. Timeout returns failed/TIMEOUT. Unknown input names/invalid options refuse before factories start. Packet/admission refusal rejects with its original runtime error (including INPUT_CONTRACT and DUPLICATE_PACKET); output overflow rejects TEST_OUTPUT_LIMIT, never a truncated success. Owned collectors/feeders settle and the runtime removes its deadline/listeners on every exit. Late service rejection stays handled; arbitrary user code still needs to honor its signal. Collected results are caller-owned memory, not a durable lookup or execution history.
