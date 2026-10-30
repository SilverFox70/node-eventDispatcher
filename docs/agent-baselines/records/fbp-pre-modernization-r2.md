# fbp-pre-modernization-r2

Captured during S01 on2026-10-29. Source:4f350668083fe02c10ce53492d409e7c5c4adf8b (S00 PR4 merge), isolated via git archive into /tmp/fbp-s01-baseline. Worktree/user artifacts were not copied or modified.

## Runtime and lock identity

Original active runtime: Node24.13.0/npm11.6.2. Selected runtime: Node26.13.0 LTS Lithium/npm11.20.0, Darwin arm64. Selection verified against [official index](https://nodejs.org/dist/index.json); downloaded archive matched [official checksums](https://nodejs.org/dist/v26.13.0/SHASUMS256.txt): SHA256 d38bd5e5a2ddce6bbb5ce45e46e208337da4d51fffe611e567fd32073d6439f6. Runtime extracted into /tmp; no global default changed.

Historical package-lock SHA256:5c7d6356b8ac7d8bb3bb7007c420f2ecff8f9e8c2eda4ae98c00fe5169875c16. Isolated npm ci --ignore-scripts succeeded on selected runtime; the archived lock remained unchanged. Deprecated legacy dependencies and18 audit vulnerabilities (1 low,6 moderate,6 high,5 critical) are known baseline findings, not passing security acceptance.

## Characterization

- npm test: expected exit1, output Error: no test specified. This is a placeholder, not a behavioral suite.
- Offline node assert script: on/emit with array[2,3] supplies two arguments and the caller context; assertion passed, exit0.
- Offline node assert script: once subscriber followed by ordinary subscriber; first emit invokes once subscriber, skips following subscriber because removal mutates the array during iteration. Asserted counts1/0, exit0; this is an observed defect for S02, not desired future behavior.
- Legacy network demo was not run. No provider, browser, database or graph-runtime evidence claimed.

Commands used selected runtime via command-local PATH. Snapshot exists only locally under /tmp and is reproducible from the source SHA. Subsequent tooling/lock changes invalidate reuse of install/gate outputs; dispatcher characterization remains relevant until its source changes. S01 does not alter server/src.
