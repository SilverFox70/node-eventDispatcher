# S26 execution receipt

The user authorized S26.A–C after PR #43. Branch `codex/fbp-26-editor-canvas` starts at the verified merge `68cef7db8ff35e749370f34ac48d0ab525a13a6d`. The S25 receipt proves v1/v2 model, runtime and packed compatibility. Unrelated untracked files are excluded.

S26 uses React Flow 12.12.1 for the canvas and npm metadata confirms the MIT license and React/React DOM peers `>=17`. The fixture pins React/React DOM 19.3.1 and Next 16.4.3. Runtime, handler and service imports stay outside editor client assets. Pointer and keyboard placement/select are in scope. Connections, configurable fields and test runs follow in later slices.

## Conditions and acceptance paths

- X26.1 checks the editor package client and passive model exports, installed TypeScript declarations through the Next build, and browser assets through the existing production bundle scanner. The core-only tarball acceptance checks the exact file list and runtime dependencies independently. `npm audit --omit=dev` reported zero advisories for the locked workspace production tree. React Flow's own declarations compiled with the pinned React and TypeScript versions.
- X26.2 runs `test/next/editor.test.js` against an isolated production Next.js app installed from both tarballs. The new route expectation failed with 404 against the S25 production build. The browser test adds two copies with mouse and keyboard, selects a card and its list alternative, and checks typed ports and distinct instance IDs. The workspace test installs cleanly, resolves a single local core from both editor and host, builds core before editor and Next, and runs the same browser journey. Its existing framework edit/rebuild still changes the expected app output.
- X26.3 displays hostile title text and a retired component only in an explicit specimen view. Tests exercise both views, inspect the retired node, check the literal hostile title and rule out script elements, check browser assets for the server factory marker and Node runtime imports, and assert zero editor factory calls. A separate isolated SDK run proves the factory marker and inventory output are observable when execution is requested.

## Verification

Core coverage passed 305/305 tests and the unchanged per-file gate. Independent core tarball acceptance passed 9/9. Local logs: `/tmp/fbp-s26-core.log`, `/tmp/fbp-s26-package.log`, `/tmp/fbp-s26-audit.json`. The Next acceptance gate includes every shipped editor TypeScript source, including files with no execution evidence. Webpack preserves the editor package's source maps; the measurement accepts mapped sources only when their content matches the installed source. Fixture/test code and third-party library internals are outside the editor denominator. Candidate `a8ec4e4e4ef1c9de3ff2d23d315d47d6aa173e83` passed `npm run check`, the packed Next suite (54/54) and fixture coverage, and the local workspace install/build/browser/rebuild journey. The four editor TypeScript files each reached 100% measured statements, lines and branches. The coverage canary confirmed an unexecuted source fails the gate. Final logs: `/tmp/fbp-s26-check-release.log`, `/tmp/fbp-s26-next-release.log`, and `/tmp/fbp-s26-workspace-release.log`.

S26 is complete for review. Run `npm ci`, then `npm run demo:next` and open `http://localhost:54545/editor`. The palette and draft canvas are interactive for placement and inspection. S27 follows the actual S26 merge and adds wiring and undo.

Publication: [PR #44](https://github.com/SilverFox70/node-eventDispatcher/pull/44) opened against master with verified candidate `2f4fab340ae9424be41c9334f9616970191226a9`.
