# S04 execution receipt

Authority: user requested S04 execution on2026-10-30. S03 PR9 verified MERGED at f00de793c1853b2e8b1668ff753eb98422ee4213; this is the branch base. Branch codex/fbp-04-packet-channels. User also requested a project-purpose/usefulness/roadmap README during execution; included without starting another implementation slice. .DS_Store and .feedback-log/ preserved.

## Readiness and bounded authority

The user accepted identity/lineage principles on2026-10-29 and merged S00 PR4. The explicit S04 request adopts the packet/factory/admission portion of IC1-r2 for this slice. Stale global blocked-on-decision wording is not a reason to request the same approval again. The proposed S08 execution-ledger settings and S11 join-history configuration are outside S04 and remain subject to their existing review notes. No broad successor release or runtime durability is inferred.

## S04.A — behavioral red

Minimal valid interface scaffolds reached real assertions: packet returned the caller's mutable object instead of an isolated copy; capacity1 channel admitted B immediately instead of parking behind A. Both tests failed with assertions, exit1, not missing-module errors. Raw output: /tmp/fbp-s04-evidence/red.log. Scaffolds were replaced with production behavior, not retained.

## S04.B — delivered architecture

- packet.ts owns exact IC1 types/root/derivation and internal raw admission. Private data/json/metadata helpers separate descriptor inspection, byte/depth ownership and identity/options. No private brand, public ID injection, result index or persistence.
- JSON copy validates all data before allocating IDs, copies/freeze-isolates values/metadata, handles own __proto__ safely, refuses unsupported values/getters/proxies and bounds escaped UTF-8 bytes/nesting. Parent metadata length is bounded before copying its collection; derivation retains only validated parent metadata rather than all cloned parent payloads.
- Internal generic channel owns one bounded FIFO and at most one parked sender/reader, direct handoff, explicit overlap refusal, drain/EOF and abort cleanup. It never validates/serializes/clones values or allocates identities.
- Public root exports packet/derivePacket and types/FlowError. Admission/channel remain internal module handoffs. No scheduler, node/graph executor or retry was added.
- Test consumer updates use generated declarations; packets.ts is included explicitly in the typecheck glob. Packed ESM/CJS fixtures exercise factory/derivation; generic Packet<Date>/channel type proof does not enable public Dates.

## Condition handoff

| Condition | Real assertion |
| --- | --- |
| C06 | channel.test.js backpressure and close drain: A queued, B pending, close, A then B then repeated EOF; sent2/received2/discarded0 |
| C07 | overlap and abort: second send/read refused; pending operations rejected, queue discarded, waits cleared; subsequent operation errors and healthy overlap recovery |
| C11 | packet.test.js isolated JSON boundary/limits; raw malformed admission refuses before channel queueing; payload null remains distinct from EOF |
| C48 | channel.test.js transport independent of representation: frozen packet with custom-class value preserves reference/prototype and no freeze; same value refused by public factory |
| C55 | packet-identity.test.js: supplied/default job IDs, fresh packet IDs, raw envelope structure/metadata bounds and independent copy/freeze |
| C56 | packet-lineage.test.js:1–256 parents, ordered IDs/common job/key, explicit rekey, exact refusal precedence and zero allocation on invalid output; local crypto mock tests impossible self-parent refusal |

Additional proofs cover64-container boundary, exact1MiB value with separate metadata budget, multibyte/escaped sizes, data/accessor/symbol/sparse/class/proxy cycles, inherited options/explicit undefined, duplicate/self IDs, null/undefined transport versus EOF and detached channel counters. No coverage threshold relaxation or skipped future features.

## Verification scope and readability

Node26.13.0/npm11.20.0 selected via command-local /tmp/node-v26.13.0-darwin-arm64/bin PATH. Dependencies unchanged; lock SHA256:bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd. Existing install/tooling baseline remains applicable. A build-only frozen-array typing mismatch was corrected without weakening public types: freeze the validated local copy and return its original Json shape.

Packet facade/data/JSON/metadata and channel source modules each remain under100 lines, with cohesive packet helpers and no generic utility dump or competing runtime. Tests are split into representation, identity, lineage and channel responsibilities, each under200 lines. [API/ownership details](../../architecture/packets-and-channels.md). README describes actual current APIs and clearly labels graph runtime, UI editor/export and durable execution as future work.

Final gates/publication follow. S05 requires actual S04 merge and its own contract readiness review; no later implementation has started.

## Final gate receipt

Final candidate npm run check exits0 (build, generated-declaration/source typecheck, lint). Focused packet/identity/lineage/channel command exits0 with16 tests; npm run coverage exits0 with36 total tests, none skipped. Every new production file reports100% statements/lines/branches; no threshold changes or unreachable-code exemptions. Raw logs: /tmp/fbp-s04-evidence/check.log, focused.log, coverage.log; retained JSON copy: /tmp/fbp-s04-evidence/coverage-final.json. Guidance link/order and whitespace checks pass. README's example was executed and printed Ready: signup-456. No hosted CI/Next/browser/provider run claimed. Later receipt/documentation-only changes do not invalidate source/config proofs.

Implementation and C06/C07/C11/C48/C55/C56 proof are complete; publication follows, with no merge inferred. The README addition is explicitly user-authorized scope.
