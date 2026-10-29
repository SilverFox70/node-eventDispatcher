# Development guide

## Current checkout

The current implementation is the historical CommonJS prototype under server/src. package.json depends on request, shortid, cli-color and an fs shim. The package entry points at absent main.js. There are scratch examples rather than a behavioral test suite.

Commands currently declared:

| Command | Meaning today |
| --- | --- |
| `npm test` | Prints “Error: no test specified” and exits1; this is a known placeholder, not an actual test result |
| `npm run main` | Runs server/src/test.js, including a public HTTP request; not an offline verification command |
| `node scripts/check-agent-guidance.mjs` | Verifies local guidance links and slice ordering; it does not test the dispatcher/runtime |

Read package.json each time: this description is a historical starting point, not permission to ignore new scripts once S01 lands. Do not install the obsolete dependencies just to edit documentation or repeatedly run the placeholder.

## Planned toolchain

S01 selects latest LTS Node patch and its npm, pins versions, captures baseline and introduces strict TypeScript, dual ESM/CJS builds, generated declarations and executable offline gates. No global Node default change. Follow its checked-in exact pins/lock/config once delivered; do not silently substitute a newer Current Node major or a convenient older local binary.

Root/model/testing export separation, source-map/coverage denominator and package structure are proposed in master §§4/11 and detailed in the owning slice. Do not introduce build/type/lint/coverage/Next scripts pointing at future files merely to match the plan. Scripts become authoritative when their implementation and proof merge. Next fixture dependencies remain separate from the framework's runtime dependency surface.

## Implementing changes

Follow [rules](agent-rules/scope-and-handoff.md) and the [execution runbook](runbooks/execute-slice.md). Each feature has one recognizable accepted story and explicit branch/file/proof boundaries. Test wrong behavior at the appropriate boundary; preserve red/green receipts and do not widen types or add a second executor to get a test green.

A source/data-model/interface change requires tracing affected producers and consumers, including JS callers and JSON graphs that bypass TypeScript. Generated artifacts do not justify hand-maintained duplicate declarations. Documentation and metadata edits should receive link/order validation; they do not need fabricated runtime tests.

For a public API or other consequential change, use [the amendment runbook](runbooks/change-contract.md). For final checks or authorized publication, use [verification and publication](runbooks/verify-and-publish.md).


## Human-reasonable implementation

Follow [readability and structure](agent-rules/readability-and-structure.md): aim for ordinary source files around a couple of hundred lines or less, with focused behavior understandable on one screen where practical. Structure folders/files so a human can locate responsibilities, keep shared primitives deliberate and plainly named, and use JSDoc for useful contracts/rationale rather than narration. This is a strong design/review guideline with reasoned exceptions, not a hard size gate or an instruction to fragment/condense code. Every feature's handoff reviews cohesion and newly large files; no extra approval ceremony is required for a sensible exception.
