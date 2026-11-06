# S24F execution receipt

S24E merged in PR #41 at 9f05cdf2f30e6a76001621343ab4d6e0d0287642. User authorized S24F. Comparison uses one request per run, one media attempt in flight, the installed S24E graph and a plain TypeScript handler. Both read the same case and service bytes, use the same app admission and deadlines, and compare outputs, terminal codes, media attempts and cancellation before measuring. The plain handler records structured stage events as diagnosis evidence. Independent developer usability remains unverified until a developer participates.

## Proof and handoff

- X24F.1 uses nine fixed cases loaded from one JSON source. The comparison asserts complete review values and findings, stable terminal codes, exact media attempts and abort effects, and peak one service call. It exercises the installed S24E graph and the plain TypeScript handler. The shared app admission refuses malformed root data before either handler.
- X24F.2 tests the same reserved-slug check in disposable copies, then reports comparable output and captured evidence. The [comparison report](../../content-review-comparison.md) records reproducible protocol, source and change counts, observed median/p95 and the shared-process memory limit.
- X24F.3 seeds the same eligibility defect in disposable copies, verifies the missing output and traces the reason to eligibility in both. The report specifies the independent developer task. No independent developer took part, so usability remains unverified.
- Build, typecheck, lint and guidance passed. Packed browser and installed test run passed 52/52. Its coverage gate flagged a mapped closing line in the existing Next route. The same build then passed all four focused comparison tests, including direct route proof that an already-aborted request returns the cancelled terminal, and the unchanged fixture coverage gate passed. The new plain handler reports 100% statements and lines and 95.74% branches. Evidence /tmp/fbp-s24f-next-final.log, /tmp/fbp-s24f-final-focused.log and /tmp/fbp-s24f-final-coverage.log.
- The 300-test core coverage receipt from S24E remains applicable because S24F only adds examples, documentation and packed acceptance tests. No core runtime, root scripts, lockfiles, or coverage thresholds changed.

Publication receipt: `5f89689a7302ccdb8ccaf2346e22130789c9f3ce` pushed to [PR #42](https://github.com/SilverFox70/node-eventDispatcher/pull/42) against master. S25 follows the merge and checkpoint review.
