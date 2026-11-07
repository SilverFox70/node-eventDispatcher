# Editor workspace cleanup

The user authorized this follow-on after S33. PR #51 passed all four GitHub checks and merged into master at `984641dc1604bf9e16867757e99614b8faefcc4e`. This work leaves the numbered slice order intact.

## Scope

- Use the available page width, prioritize the canvas, and stack panels on smaller screens.
- Let users drag or use arrow keys on width sliders for the palette and inspector. The canvas has its own height slider. Panel sizes are session-only UI state.
- Keep the live packet inspector beside the canvas on wide screens. Name the actual source and destination, show the full transfer list for one job, and let a user pin a retained transfer or return to the latest. A pinned or completed transfer stays highlighted without replaying execution.
- Preserve payload consent, pause, reconnect and graph revision boundaries. Source editing and graph storage behavior are separate.

## Verification

`npm run check` passed. `npm run test:next` passed all 55 tests, the unchanged per-file coverage gate, and its negative canary. Chromium verified keyboard resizing, pointer resizing, narrow-screen stacking, a pinned intermediate transfer across reconnect and completion, and returning to the latest live transfer. Existing draft save/reopen coverage also passed. Local evidence is in `/tmp/fbp-editor-ux-candidate.log` and `/tmp/fbp-editor-ux-check.log`.
