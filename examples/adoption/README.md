# Adopt an exported graph

This offline example uses the same document commands as the visual editor. It adds an Increase node, configures it to add 2 and exposes its ports. The authoring host saves the draft in SQLite, tests that 3 produces 5 and locks the tested revision. A separate consumer builds the generated TypeScript and runs both export formats against the reviewed fixture.

From the repository root, with the pinned Node and npm versions installed:

```sh
npm ci
npm run check
npm run test:artifacts
```

The artifact test creates a fresh npm project, installs the packed runtime and artifacts packages, and runs the exported graph without the editor or SQLite. It repeats the same run with core built from a local npm workspace package. Changing the installed runtime version, node implementation or contract refuses adoption with `BINDING_MISMATCH`. The harness removes its temporary projects when it finishes.

To keep the files for inspection, supply a directory name that does not exist yet:

```sh
node --import ./packages/artifacts/test/resolve-core.js examples/adoption/author.mjs ./adoption-output
node --import ./packages/artifacts/test/resolve-core.js examples/adoption/author.mjs ./adoption-output restore
```

Open `adoption-output/export/graph.ts` to see the builder calls. Keep `graph.bundle.json` for re-import, the generated file manifest for integrity checks, and the reviewed fixture for regression testing. The production example keeps `nodes.mjs` as ordinary application source and uses the registry lock to check the actual node file and contract before running the graph. When changing that source, test and lock a new revision with fresh pins.

The demo invokes editor commands in code. For visual draft editing and saving, see the [Next.js editor guide](../../docs/nextjs.md).
