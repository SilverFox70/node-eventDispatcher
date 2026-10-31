# Lookup node recipe

Purpose: read one profile label by application ID. A missing profile is a normal result; an unexpected service rejection fails the run. The host supplies the lookup function. The template makes no network/database call by itself.

| File | Responsibility |
| --- | --- |
| [contract.ts](contract.ts) | Versioned request/result contracts and inferred value types |
| [node.ts](node.ts) | Stateless function adapter, captured service reference and declared metadata |
| [examples.json](examples.json) | Found/missing input, fake service reply and expected result |
| [node.test.ts](node.test.ts) | Real compiler/runtime tests with exact fake calls, signal and packet lineage |

## Try it in this checkout

Select the pinned Node/npm versions, install the lock and build first:

```sh
npm ci
npm run build
node scripts/test-node-template.mjs
node examples/05-node-authoring.cjs
```

The checker copies the four recipe files into a temporary ESM consumer, compiles with the project TypeScript/Node types, links the built package exports and runs both tests. It does not install packages or use source aliases. Temporary files are removed even on failure. Installed-tarball recipe acceptance remains S16; this is a checkout authoring proof. The demo injects local asynchronous lookup behavior and prints found/missing results with exactly two calls.

## Copy into an application

Use an ESM consumer project (package.json type:module) with event-driven-design, matching Zod, TypeScript and Node types available. Use the versions supported by the project's lock/toolchain. Copy contract.ts, node.ts, node.test.ts and examples.json together, for example into nodes/profile/. Keep all framework definitions, contracts and runtime/compiler imports from the same package instance/module entry.

From the consumer project root:

```sh
npx --no-install tsc --target ES2022 --module NodeNext --strict --types node --noUncheckedIndexedAccess --exactOptionalPropertyTypes --resolveJsonModule --sourceMap --noEmitOnError --outDir .node-build nodes/profile/contract.ts nodes/profile/node.ts nodes/profile/node.test.ts
node --test --test-timeout=5000 .node-build/node.test.js
```

These commands require local tools; they do not download missing dependencies. The JSON import is copied by TypeScript. Adapt the paths to your folder. The standalone recipe test assumes an ESM output scope; application bundler/Next integration has its own later acceptance slice.

## Contract and effect choices

Request profile-request@1 and result profile-result@1 use representation json@1. Output is either found{id,label} or missing{id}; both retain the input's job/key and become one fresh child packet. Correlation is read from context.packet if needed; no context.key alias exists. Input id is application data, independent of correlation key.

The captured lookup reference is stable. Readonly service typing does not clone or freeze the service's internal state. Keep captured services stateless or safe for concurrent runs; mutable per-run processing state belongs inside defineComponent.create(). A fake call log is test-owned observation, not application state the library clones.

Metadata declares profile.read and required dependency lookup through the existing defineComponent wrapper. These names document the operation; serialized metadata cannot supply a service function or authorize execution. Public examples are synthetic, never sampled production data.

Pass context.signal to the actual client. Unexpected errors propagate; absence returns missing. There is no wrapper retry. Configure0-default/explicit1–5 operation retries only after choosing safe error codes and idempotency behavior. Choose operation/flow budgets for real service and end-to-end behavior; test timeout values are not production timing advice. No durable recovery or exactly-once external-effect guarantee is implied.

## Make an edit and check it

Changing label:profile.label to label:42 fails compilation. Changing it to profile.label.toUpperCase() is well typed but fails the found fixture (ADA versus Ada). Both counterexamples are verified by the authoring tests. If uppercase is intended, review the changed behavior, update the fixture and decide whether the contract/component version must change; keep the assertions.

Before handoff, describe purpose, IDs/schemas, dependencies/effects, ordering/correlation, cancellation/failure behavior and exact test commands. Run tests against fake services first. Do not add a service locator, mutate a global registry or import the server registry into a client bundle. See [the authoring guide](../../docs/node-authoring.md) and [function adapter](../../docs/architecture/function-nodes.md). S14 will simplify the manual test wiring with public helpers.
