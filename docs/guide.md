# Use NodeDispatcher in an application

The package name is event-driven-design. Build the checkout with its pinned Node26.13.0/npm11.20.0, then create a local artifact:

```sh
npm ci
npm run check
npm run test:package
npm pack
```

Install the resulting event-driven-design-1.0.0.tgz in another project with `npm install /absolute/path/event-driven-design-1.0.0.tgz`. This does not require an npm registry publication. The framework has one intentional runtime dependency, Zod4. Next/React are not dependencies. The distributed JavaScript is already built; consumers need no source aliases or transpilePackages setting. Source TypeScript and source maps ship for debugging.

## Choose a module format

CommonJS uses require('event-driven-design'); ESM uses named imports from the same package. Import runNode/runGraph from event-driven-design/testing. Browser code may import only the metadata/model entry, event-driven-design/model; the runtime and test helpers are Node-only. Use one module format/package instance for a graph's contracts, components, compiler and executor: opaque handles from ESM and CJS are intentionally distinct.

```js
const { map, jsonContract, packet } = require('event-driven-design');
const { runNode } = require('event-driven-design/testing');
const double = map(jsonContract, jsonContract, value => value * 2);
runNode(double, { inputs: { in: [packet(2)] } }).then(result => {
  if (result.terminal.status !== 'completed') throw Error(result.terminal.code);
  console.log(result.outputs.out[0].value); // 4
});
```

For application-specific payloads, use contract(id, ZodSchema) rather than broad jsonContract. Runtime checks remain authoritative for JavaScript callers. [The runtime overview](architecture/fbp-runtime.md) describes identity, flow and limits.

## Run installed examples

From the consuming project, run `node node_modules/event-driven-design/examples/01-map-filter.cjs` through07-external-feed.cjs. [The example index](../examples/README.md) lists exact outcomes. They use package exports, native capabilities and local fakes; no checkout test helper, compiler, credentials or provider is needed. Examples are runnable files to copy/adapt, not additional exported library APIs.

The set covers a typed pipeline, async enrichment, keyed collation, graph/event Mermaid export, injected lookup, public testing helpers, external feeding, backpressure and cancellation. The legacy source scanner is a historical string-literal heuristic, not the authoritative inspection model.

## Copy and test a typed node

Copy [templates/node](../templates/node/README.md) into an ESM application folder. Install local dev tools with `npm install --save-dev typescript@6.0.3 @types/node@26.6.6` and follow the template's compile/test commands. Contract types are inferred from Zod; the service interface, fake replies and independent expected fixtures remain explicit. runNode uses the real runtime, closes omitted inputs and collects bounded outputs. Always assert terminal.status as well as values.

The installed-consumer checks compile both CommonJS/ESM declarations, run the exact found/missing template tests with a fake service, prove a wrong handler return is a type error, and prove a JavaScript bypass fails OUTPUT_CONTRACT. Fake services test node behavior; real-provider integration remains the application's responsibility.

No automatic retries are enabled. Optional operation retries require explicit bounded policy and safe effect semantics. Durable saved graph definitions, graphical editing and crash-resumable execution are future capabilities, not part of installing this package. See [migration](migration.md) before adopting legacy code. Licensing is [ISC](../LICENSE).
