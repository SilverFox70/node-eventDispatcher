# Synchronous dispatcher

S02 provides `createDispatcher({ logLimit? })` and an optional shared `eventDispatcher`. The graph runtime, ownership metadata and graphical topology are later slices. Create a dispatcher at the application's intended sharing boundary and pass it to participating modules; a factory call creates independent subscriptions and logs.

```js
const { createDispatcher } = require('event-driven-design');
const events = createDispatcher({ logLimit: 1000 });
events.once('ready', (id, message) => console.log(id, message));
events.emit('ready', [42, 'finished']);
```

## Delivery and cleanup

- `emit(name, data, context)` is synchronous. An array expands to positional arguments; another value is one argument. Context becomes the callback's `this`. Callback return values are ignored; async work belongs in the future FBP runtime, not an awaited emit.
- Callbacks run in registration order. Membership is snapshotted for each emit; registration/removal during a callback affects later emissions. Exceptions propagate immediately and stop the remaining callbacks in that emission.
- A once registration is removed before invocation. A nested emission can consume a later once registration; the outer snapshot will then skip that consumed registration. Ordinary listeners can run again under recursive emit.
- Duplicate registrations are distinct. `off(name, originalCallback)` removes the first match, including a once registration. `on`, `once`, `off` and `emit` return undefined.
- `unsubscribeAll(name)` returns true if the event existed, false otherwise, including repeated cleanup. An empty event remains known until unsubscribed. Event names must be nonempty strings and callbacks callable; bad calls throw TypeError before modifying state.

## Inspection and logging migration

Subscriber getters return copied collections of original callback references, including once callbacks. The previous serialized once-wrapper strings are no longer returned. Changing a returned array/object does not change subscriptions. These callback getters are legacy local introspection, not a browser-safe topology API; S03 owns that separate boundary.

Logging starts off. `eventLoggerOn/Off/IsOn` retain their calling convention. `eventLog()` returns a detached object of UUID-keyed metadata entries: action, timestamp, event and callbackName where applicable. It retains no payloads, contexts or function source. Old payload/source/warning log fields are deliberately removed.

`logLimit` defaults to1000 and accepts integers0–10000; zero retains nothing even when logging is enabled. Oldest entries are discarded at capacity. Disabling logging stops new records without clearing retained history. Each dispatcher owns its own history.

## Legacy and module formats

After `npm run build`, the old `server/src/eventDispatcher.js` path is a CommonJS shim. Both direct filesystem imports and `require('event-driven-design/server/src/eventDispatcher.js')` expose the factory and the same singleton as the CommonJS package root. It contains no duplicate dispatcher implementation.

ESM and CommonJS distributions have their own module instances; share one explicitly created dispatcher when bridging code that mixes formats. Do not assume singleton identity across the two distributions. The incompatible FBP-Presentation emit signature is not adopted.
