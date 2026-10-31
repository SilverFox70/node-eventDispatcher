# Migrate from the historical dispatcher

Use createDispatcher() for an isolated synchronous dispatcher; the eventDispatcher singleton remains an intentional convenience. The compatibility export event-driven-design/server/src/eventDispatcher.js loads the same CommonJS singleton as the root package. Build before using a direct checkout shim path.

Keep the existing emit signature: emit(eventName, [arg1, arg2]). A single non-array value is still supported by the legacy calling convention. Delivery is synchronous, registration ordered and once listeners disappear before invocation. Use off for the exact listener and dispose declared publishers when their owner ends.

Graphs are a separate asynchronous layer. Define contracts/components, build or load GraphSpec, compile with the application's trusted registry and start a run. Existing callbacks do not automatically become durable nodes. [The guide](guide.md) and [runtime overview](architecture/fbp-runtime.md) explain the transition.

## Example/scanner relocation

The old server/src HTTP/scanner utilities moved to examples/legacy as .cjs cookbook modules. Only the dispatcher shim remains at its old package path. Historical scratch example.js/test.js/tinytest.js are removed from the current tree; their original revisions remain in Git history. npm run main now runs the offline pipeline demo instead of calling an external endpoint.

Importing the retained scanner or HTTP module performs no I/O, logging or subscription. Explicitly call scan(directory), or copy the adapter and call registerHttpEvents(dispatcher), retaining its disposer. The scanner recognizes simple string-literal .on/.once/.emit calls; it cannot discover dynamic events or prove runtime relationships. Use createInspectionScope and dispatcher.inspect for actual defined/active relationships.

HTTP helpers use native fetch, reject non-success HTTP status with code HTTP_ERROR/status, reject transport/redirect failures and accept a caller signal through get(url,{signal}) or post(url,form,{signal}). Bodies remain text on success. The explicit event adapter forwards success/error as the sole completion argument. Test these adapters with localhost services before supplying real endpoints. The filesystem helper rejects once on missing files/directories; it does not continue after an error.

request, the fs package shim and cli-color are removed; Zod4 is the sole deliberate runtime dependency. No callback source scanning, network demo or logging occurs when importing the core package.

For the full current dispatcher method/reference details, see [the repository dispatcher guide](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/dispatcher.md). Logging is bounded metadata, not a durable payload log; eventLog and topology inspection return detached snapshots.
