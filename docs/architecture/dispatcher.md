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

## S03 — current subscription and publisher topology

`on(name, callback, { ownerId })` and `once(name, callback, { ownerId })` optionally attribute a registration; two-argument calls still work and return undefined. Owners must be nonempty strings of at most128 characters. The string is copied when registering; missing attribution appears as `ownerId: null`, meaning unassigned.

`declarePublisher(ownerId, event)` declares an intended publisher and returns an idempotent disposer. It does not subscribe, emit or establish proof of delivery. Duplicate declarations are independent; disposing one leaves the others. `unsubscribeAll` removes subscriptions, not publisher declarations.

`inspect()` returns deeply frozen, detached version1 JSON: sorted `events: [{ name }]`, registration-ordered `subscribers: [{ id, event, ownerId, callbackName, once }]`, and declaration-ordered `publishers: [{ id, event, ownerId, provenance: 'declared' }]`. IDs are increasing numbers local to each dispatcher and entity kind; removing/re-registering allocates a new ID. Namespace them by dispatcher/entity kind when combining sources. Anonymous functions are labeled `anonymous`; owners are never inferred from source.

Events are the union of active subscriptions and current publisher declarations. A known but empty legacy event is absent from topology. Once removal is visible before its callback executes; off/cleanup/disposal are reflected immediately. Logging toggles do not affect topology. Emitting does not create publisher history.

Snapshots contain no callbacks, source, payloads, contexts or timestamps. Readonly topology/owner types are exported from both the root and browser-safe /model entry. This is relationship data for the later S12 inspection scope and S18 visual inspector, not a graph editor or persistent trace store.
