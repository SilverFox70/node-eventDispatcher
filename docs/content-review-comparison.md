# Content review comparison

The installed Next product review is the Nodeflow subject. The plain TypeScript subject implements the same server handler with small independent functions, Promise composition, runtime output validation, bounded media retry and structured stage events. Both use the same product admission, fixed service results and request cancellation. The harness checks one request at a time and at most one media call in flight for each request.

## Reproduce

Run `npm run test:next` from the repository. It builds a clean packed consumer, runs the existing browser demo tests and copies the comparison into the installed test boundary. The comparison reads one fixed JSON file and gives both implementations the same product and a fresh cursor into the same service script. Parity checks run before timing. The output includes the fixture SHA-256, Node version, OS, architecture and timing samples summarized as median and p95.

The cases cover preview, missing fields, archived input, one retry, invalid media output, permanent failure, cancellation during media work, cancellation before the run and a media timeout. The assertions compare complete findings and preview, terminal status and code, attempt order, abort count and peak service concurrency. Invalid root data is refused by the shared admission used before either handler.

The timing loop alternates order, warms up each version five times and samples the chair case twenty times per version. It includes graph setup and evidence collection or the plain handler and its stage events. It excludes HTTP, browser work and real external I/O. Peak RSS is for the shared test process. It does not attribute memory to either implementation.

## Diagnose, test and change

| Task | Nodeflow | Plain TypeScript |
| --- | --- | --- |
| Explain an archived input | Inspect the retained eligibility decision and its input reference | Read the structured eligibility event |
| Explain an active result | Inspect observed fork/join transfers and packet parents | Read the content, media, rules and report stage events |
| Isolate a check | Run the actual authored node with the public test harness | Call the exported check function directly |
| Add the reserved-slug check | Edit the publication node in one file | Edit the publication function in one file |
| Find the seeded missing preview | Follow the recorded ARCHIVED drop to the eligibility predicate | Follow the ARCHIVED stage event to the eligibility condition |

The two handlers return the same business result after the reserved-slug change. The comparison creates disposable source copies for the change and the seeded eligibility defect. It does not rewrite the installed production demo. The counted source footprint is 105 physical lines across the graph, nodes and run modules, and 104 lines for the plain handler. This includes blanks and imports and excludes shared admission, service fixtures, UI and tests. The graph has explicit edges and reusable runtime evidence. The plain handler has fewer setup steps and records stage context directly. For the tested rule edit both changes touch one file.

An independent developer can run the same protocol from the installed demo and comparison sources. Ask them to add the reserved-slug check, write an isolated assertion and diagnose a missing chair preview caused by the inverted eligibility condition. Capture the files and evidence they used, whether they reached the correct cause, and where they needed help. Independent developer usability is unverified. The automated cases establish outcome and diagnosis evidence, rather than measuring how quickly a developer can use it.

## Recorded sample

On macOS arm64 with Node 26.13.0 and V8 coverage enabled, the 20 measured chair runs had median and p95 latency of 4.33 ms and 4.83 ms for Nodeflow, and 0.051 ms and 0.086 ms for plain TypeScript. Shared harness peak RSS was 127,008 KiB. Fixture SHA-256 is `3c03b9dc1d1b032c8ee86a78f5b0f47a0fbb46f25c0eb8eeaffd0aa66b86b657`.

The sample captures an immediate scripted service, so it exposes the cost of graph compilation, execution and evidence relative to direct calls. It provides neither a service-bound latency forecast nor a per-implementation memory comparison.
