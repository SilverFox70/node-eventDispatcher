# Contracts and reusable components — S05

A contract is a versioned value meaning with one validator and a canonical JSON Schema descriptor. A component names input/output ports using those contracts and supplies a factory for a fresh processing function. S05 defines these objects and metadata; graph compilation, scheduling and send-time enforcement arrive in S06/S08.

```ts
import { z } from 'zod';
import { contract, defineComponent, derivePacket, describeRegistry } from 'event-driven-design';

const amount = contract('amount@1', z.number().min(0));
const double = defineComponent({
  id: 'double', version: 1, title: 'Double an amount', description: 'Pure calculation.',
  in: { value: amount }, out: { result: amount },
  effects: [], requiredDependencies: [],
  examples: [{ in: { value: 2 }, out: { result: 4 } }],
  create: () => async ctx => {
    for await (const input of ctx.inputs.value) {
      await ctx.send('result', derivePacket(input.value * 2, [input]));
    }
  }
});
const catalog = describeRegistry({ 'double@1': double });
```

This declares a component and exports metadata; it does not start a graph. Named ports retain exact schema-inferred types in generated declarations. Wrong ports/payloads fail TypeScript; Contract<T> is invariant, while its generic type remains unconstrained for later representations. Factories initially require JSON-compatible schemas. The process receives typed packet streams, an AbortSignal and an async send signature. Runtime enforcement/lifecycle are later slices, not simulated here.

## Initial schema profile

Use pinned Zod4.6.7 from the matching module format/installation. Supported schemas are finite numbers (bounds, positive multipleOf, safe integers/int32/float64), booleans/null, primitive literals/enums, strings with bounds or native UUID/date-time formats, bounded arrays, strict objects with optional members, nullable values and unions. String bounds use Unicode code points in this pinned version, including emoji fixtures.

Coercion, defaults, transforms/overwrites, custom/async refinements, custom check gates, arbitrary regex/other formats, stripping/loose objects, root/array optional values, recursive/lazy definitions and non-JSON kinds refuse UNSUPPORTED_SCHEMA. UUID version options are supported; replacement patterns are not. Date-time is limited to RFC3339-compatible options: no local time or minute-only precision. Unknown definitions that cannot be represented faithfully refuse rather than fall back to any.

Traversal uses [documented Zod core definitions/checks](https://zod.dev/packages/core) and its [JSON Schema exporter](https://zod.dev/json-schema), targeting draft2020-12, inline reuse and throwing on unrepresentable/cyclic schemas. Native check gates/patterns are compared with native constructors; foreign Zod instances/formats may be refused rather than guessed equivalent. Schema definitions/methods must stay native and immutable. Zod may materialize author-owned shape getters while preparing definitions; schema authoring is trusted application code, not a sandbox. Recursive shapes still refuse before any process factory executes.

Zod's global metadata registry is not exported. Its hidden Standard Schema helper is dropped by JSON serialization before freezing descriptors. Publish descriptions/examples explicitly through component metadata; arbitrary schema-side dependency/service objects are not captured.

## Identity, ownership and metadata

Contract IDs are nonempty strings of at most128 characters with a nonempty revision suffix, for example amount@1. json@1 is reserved for jsonContract, whose schema is {} and whose validator still enforces S04's JSON profile. Payload limits/deep-copy validation happen before Zod; validation never replaces a packet value with parsed output.

Contracts and component port maps are immutable snapshots. The same contract ID in one component/catalog must have identical canonical assertions, otherwise CONTRACT_ID_CONFLICT; there is no global ID registry. Canonical JSON sorts object keys, preserves array order and ignores description/title/example annotations only at schema locations, so a property named description is retained. Compatibility requires matching representation/contract/schema, except the built-in JSON destination accepts any JSON contract. Reverse narrowing refuses CONTRACT_MISMATCH; no general subtyping solver is claimed.

Registry keys are exactly componentId@version and entries must come from defineComponent. Definition/export does not call create. Authored examples are checked against real port contracts before their immutable metadata is captured; caller mutation afterwards does not change the catalog. Effects and requiredDependencies are optional public names, not executable services or permissions. Absence means unspecified, not proof of purity. Metadata has a separate256-level JSON depth guard; packet byte limits are not charged again for surrounding catalog/example metadata.

/model exports catalog/schema types, canonical compatibility helpers and validateCatalog. It validates descriptor structure, representations and ID consistency. It does not run application validators or promise browser JSON Schema payload evaluation. Examples are author-declared public fixtures, never sampled live data; the author owns publication suitability. The server registry remains authoritative even if a client alters an otherwise well-formed catalog.

## Backend evaluation in the display

User direction,2026-10-30: the display should echo actual backend/runtime evaluation. S05 supplies an internal getContractIssues handoff with immutable schema paths/codes; it omits rejected values and raw Zod messages. Public validate remains a boolean type guard over that same validator. ContractIssue is browser-safe data, not executable validation authority.

Later runtime/inspection/Next UI slices must associate those results with the correct graph/contract revision, run/request, node and port, and display bounded current results with trusted messages. They must not recompute a competing verdict, leak raw inputs/credentials or let obsolete responses overwrite current state. Payload/result display is an explicit application choice. Report transport/lifecycle and rendered UI proofs belong to those slices; no runtime, HTTP endpoint or editor is added in S05.
