# S20 configured graph contract CG2-r1

CG2-r1 is the accepted design for S25 and refines the [editor proposal](../editor.md). The [S25 execution receipt](../S25-execution.md) records proof and handoff.

## Chosen shape

GraphSpecV2 is GraphSpecV1 with `version:2` and nodes `{id,component,taskTimeoutMs?,retry?,config?}`. Other required/optional fields, graph limits, endpoint/port names, capacities, cycle refusal and task semantics are unchanged. CatalogV2 is existing catalog with `version:2` and optional component descriptor field `configuration:PortDescriptor`. CatalogV1 continues to admit only existing descriptors. Do not reinterpret a port schema as execution authority.

`defineConfiguredComponent<C,I,O>(spec)` uses existing ComponentSpec fields plus required `configuration:Contract<C>`, and factory `create:(config:Readonly<C>) => (context:ProcessContext<I,O>)=>Promise<void>`. C is JSON-compatible under current public contract. Ports are fixed at definition, not generated from configuration. Existing defineComponent/defineFunction remain unconfigured and unchanged. Service dependencies stay captured by trusted application registry, not serialized config.

Configured nodes require GraphSpecV2 and own `config`; unconfigured components must omit config in both versions. No defaults/coercion/stripping; null is permitted only if its config contract accepts it. V2 mixed configured/unconfigured graphs are legal under these rules. V1 never silently upgrades; config on a v1 node remains INVALID_GRAPH. New builder overload `add(id,configured,{config,...existingTaskPolicy})`; first configured addition makes emitted spec.version2 for that builder; otherwise current v1 output remains. Task-policy precedence remains existing behavior; config is not runtime service injection.

## Validation and effects

compileGraph still captures authoritative registry and JSON spec before checking shape/wiring/config. Collect deterministic issue order using current `(path,code)` ordering. No factories/handlers execute at compile. Config schema/value refusal uses `CONFIG_INVALID` at `$.nodes[i].config`; missing/extra config same path; configured definition under v1 produces CONFIG_INVALID only when shape itself is valid, whereas a v1 unknown config field fails INVALID_GRAPH at `$` first. Unknown GraphSpec version remains INVALID_GRAPH; unknown catalog remains INVALID_CATALOG. Existing v1 issue codes/paths are unchanged.

Successful compile deep-copies/freezes config, binds it privately by node ID in the compiled definition and preserves it per run. At runtime create(config) runs once per configured node/run, like existing create() lifecycle. No process mutation or factory during browser metadata validation. Invalid config in one node prevents factories for every node, even otherwise valid siblings.

Configuration contract metadata participates in contractId/schema-meaning checks along with ports. Same contractId with different canonical schema refuses CONTRACT_ID_CONFLICT as existing registry handling; a different contract ID does not imply compatibility. Config can expose only application-approved nonsecret fields. Credentials/functions/handles are not supported data; no heuristic promises to detect every secret in free text.

## Source migration/consumers

| Current owner | S25 change / downstream proof |
| --- | --- |
| `src/model/graph.ts`, `src/model/graph/structure.ts` | version-discriminated strict shapes; validate v1/v2 input; raw-JSON failure tests |
| `src/component.ts`, `src/model/catalog.ts` | private configured definition metadata and v2 descriptors; preserve old identity/source APIs |
| `src/graph.ts` | one compiler, authoritative config checks and private immutable binding |
| `src/builder.ts` | configured overload and output-version transition; typed legal/illegal fixtures |
| `src/runtime.ts` | correct per-instance per-run factory args, no competing runner |
| `src/inspection.ts`, `src/model/inspection.ts`, Mermaid/UI | admit new graph/catalog versions safely; useful safe config summaries |
| `src/testing/run-node.ts`, `run-graph.ts`, public type tests | same compiler/runtime; explicit configured fixture binding, no helper-only evaluator |
| public barrels/packed consumers | CJS/ESM/model/testing declaration and browser-asset parity |

## Review specimens — future behavior, not delivered tests

- V1 unconfigured echo graph compiles with zero factory calls; starting it calls existing create() once.
- V2 nodes a/b both reference multiply@1 with factor2/factor3; compile calls zero factories; run passes distinct frozen configs to a/b and produces expected results.
- V2 factor='two' against number schema: CONFIG_INVALID/path above, zero factories/service calls. A valid sibling does not run.
- V2 unconfigured echo with config={} refuses; configured multiply missing config refuses. Unknown port still uses current UNKNOWN_PORT and cardinality behavior.
- V1 with extra config field: existing strict INVALID_GRAPH at `$`; do not invent a successful migration or a later guard result.

X20.2 is the design trace; X25.1–X25.3 own executable future acceptance. The actual source producer is `src/graph.ts`, not the nonexistent src/compile.ts or src/graph/ directory used in early destination sketches. S25 allowlist is corrected accordingly.
