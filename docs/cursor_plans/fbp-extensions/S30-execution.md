# S30 execution receipt

The user authorized S30 after S29 merged and asked to follow one packet through the slow-branch fixture, inspect intermediate output and reconnect without refreshing. The verified base is `61ee1f442209f6d0525b7ca1972f88aa0f4c678b`. The packed S29 app returned HTTP 405 to the new live observation request. S30 adds no dependencies.

## Live observation boundary

The existing test harness can optionally observe the same runtime run and enable its bounded execution trace. The fixture exposes revision-tagged snapshots through an authenticated-by-key, non-cacheable read on the existing test-run route. The editor polls the snapshot while the run is active and keeps the latest view on temporary failure. The POST still owns the run. A reconnect reconciles to a snapshot without animating recovered history. The demo keeps one recent trace, with a 128-event limit and a 60-second read window after completion. Payload capture defaults off and is requested per test.

The canvas highlights nodes and wires from actual transfer events only for the matching draft revision. Job selection scopes the timeline and pulses. Stage selection shows input and output events, packet identities, and immediate parents. Pausing freezes display while the runtime continues. An evicted history is shown explicitly and suppresses inferred join waiting. Defined graph wiring and the existing inspector's publisher and subscription relationships retain their separate meanings.

## Conditions

- X30.1 rejects scheduling events as trace records, checks revision binding, distinguishes retained versus fresh events, and filters one job's data. The public test-harness regression verifies observer cleanup and real output lineage.
- X30.2 uses real async fixture branches. The units edge highlights, the join has received units and waits for label, and the final joined output appears once. The browser inspects the captured intermediate and final values.
- X30.3 interrupts only live snapshot requests. The browser retains its document and selected job, reconnects without refresh, and resumes from the latest observation. It also verifies that a paused display stays frozen after the run finishes, omitted payloads remain marked, and bounded history reports gaps. The existing relationship suite exercises publisher removal and reconciliation.

## Verification and handoff

Node 26.13.0 and npm 11.20.0 with the checked-in lockfile. Commands were run from the checkout or a task-owned copy of the S30 candidate.

| Command | Result and retained local evidence |
| --- | --- |
| `node scripts/check-agent-guidance.mjs` | Exit 0. Validated links, slice order and condition ownership. |
| `npm run check` | Exit 0. Build, types, lint and editor build. Local log `/tmp/fbp-s30-check-current.log`. |
| `npm run coverage` | Exit 0. 307 core tests with the existing per-file thresholds. Local log `/tmp/fbp-s30-core.log`. |
| `npm run test:package` | Exit 0. Nine installed-package, recipe and example tests. Local log `/tmp/fbp-s30-package.log`. |
| `npm run test:next` | Exit 0. All 55 tests, Chromium acceptance and the unchanged per-file 95% gate. Each new debug source reached 100% for lines, statements and branches. Local log `/tmp/fbp-s30-next-proof.log`. |
| `npm run test:content-workspace` | Exit 0. Workspace-linked browser flow and rebuild propagation. Local log `/tmp/fbp-s30-workspace-final.log`. |

The new debug modules have separate responsibilities for transport, read-model filtering and presentation. S31 owns the fresh-project authoring walkthrough. Implementation commit `472a956` was pushed and [PR #48](https://github.com/SilverFox70/node-eventDispatcher/pull/48) is open for review.
