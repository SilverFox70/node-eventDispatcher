# S32 execution receipt

The user authorized S32 and PR publication after S31. PR #49 merged at `b279c3e3d8407c42cf2bc98f08b1d3dce40f4869` after all four checks passed.

## Contract confirmed before implementation

- D1 uses the strict document v1 envelope from [artifacts.md](artifacts.md) over unchanged GraphSpec v1/v2. Layout uses the editor’s positions and groups with optional viewport coordinates and zoom. Draft metadata is excluded from both fingerprints. Incomplete wiring remains editable. The authoritative catalog/compiler owns execution validation.
- Registry bindings use unique component identities in lexical order and exact coverage of the graph’s components. Representation identities are unique and sorted. Exact trusted lock comparison detects changed implementation, contract, or resolver identity. Implementation provenance uses the existing EV1 BuildManifest scheme, independent of document serialization.
- Reuse the shipped regression fixture schema rather than introduce a second fixture format. S34 owns trusted test receipt issuance and verification.
- D2 introduces optional `event-driven-design-artifacts`. Its `/model` is passive and browser-safe. The root adds Node SHA-256. The core and editor have no dependency on the artifact package. Core exports only the reused passive primitives needed here.
- D3 confirms SQLite for S33’s local graph documents. The parser and fingerprints are storage-independent. No driver, migration or runtime checkpoint is introduced here.

## Verification

- Baseline S31 request hashing changes with object-key order. It remains unchanged as a transport check. The artifact tests pin independent expected hashes and show equal semantic content across object-key order, layout moves, and draft bookkeeping. Local evidence `/tmp/fbp-s32-baseline.log`.
- X32.1–X32.3 cover exact fingerprints, lexical keys, preserved array order, negative zero, byte/graph limits, strict shapes, trusted lock mismatch, and ordinary core compilation of an admitted GraphSpec. The artifact package passed the unchanged 95% per-file gate with 100% lines, statements and branches on its source. Local evidence `/tmp/fbp-s32-artifacts-final.log`.
- A fresh tarball install proved public declarations, passive model dependency isolation and normal core compilation. Local evidence `/tmp/fbp-s32-packed-types.log`.
- The build, types, lint, editor and artifact builds passed on the implementation before a behavior-preserving canonical binding sort simplification. Focused evidence tests passed after that simplification with 100% coverage in the identity module. Local evidence `/tmp/fbp-s32-check-final.log` and `/tmp/fbp-s32-identity-proof.log`.
- Final core coverage passed all 308 tests and the existing per-file gate. The final packed artifact install also passed. Local evidence `/tmp/fbp-s32-core-final.log` and `/tmp/fbp-s32-packed-final.log`.
- Packed Next passed 55 tests and its per-file gate against the candidate immediately before the equivalent binding sort simplification. GitHub CI will run the full suite on the published head. Local evidence `/tmp/fbp-s32-next.log`.
- Next owner: S33 applies these fingerprints to SQLite draft save/reopen and revision conflict handling.
