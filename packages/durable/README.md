# Durable task profile

The optional `event-driven-design-durable` package prepares a pinned profile for bounded JSON functions. It uses the existing graph compiler and runtime to invoke one task with one packet. Install it alongside the matching `event-driven-design` package.

Use `defineFunction` for ordinary functions or `defineConfiguredFunction` when a graph node needs validated JSON configuration. Both receive the same task context and derive output packets from the admitted input.

```ts
import { prepareDurableProfile, resumeDurableProfile } from 'event-driven-design-durable';

const options = {
  graph, registry, identity,
  adapters: [{
    component: 'adjust@1',
    implementationDigest: reviewedImplementationDigest,
    adapterVersion: 1 as const,
    replayPolicy: 'pure' as const,
  }],
};

const profile = prepareDurableProfile(options);
const pinned = profile.pin;
const reopened = resumeDurableProfile(pinned, options);
const result = await reopened.invoke('adjust', inputPacket, { timeoutMs: 1000 });
```

`identity` contains the core execution identity fields other than the graph. The host supplies reviewed implementation and contract digests, runtime and policy versions, and service profile digest. Register one adapter per used component. The pin also covers the actual port and configuration descriptors and the adapter version and policy. Keep the pin with the run and use it when reopening. If the exact graph or binding is unavailable, resume refuses with `VERSION_UNAVAILABLE`.

Only functions reviewed as pure are eligible in v1. The declaration is the application's assurance that the function can be recomputed without changing external state. Arbitrary streaming factories and provider policies are refused. Retries default to zero and use the ordinary graph policy when explicitly configured.

A computed result carries an output packet and the attempt IDs from that invocation. Input contract violations reject the invocation. A failed or cancelled run returns a stopped result with its terminal code. Recomputing may allocate new packet, run, and attempt IDs while preserving the input job and immediate parent. The result is compute evidence. The future SQL host owns claim fencing, attempt budgets across restarts, and committing one outcome.

The passive `event-driven-design-durable/model` entry reads a profile pin without loading runtime or SQL code. From the repository, run `npm run build` and `npm run test:durable` for the coverage gate and installed-package verification.
