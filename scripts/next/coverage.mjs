import { readFileSync, readdirSync, existsSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { mappedFunctions } from './coverage-ranges.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const convert = require('v8-to-istanbul');
const ts = require('typescript');
const { createCoverageMap } = require('istanbul-lib-coverage');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);

/** Remap actual server/browser V8 ranges to fixture source; no runtime branch exclusions. */
export async function measureFixture(app, evidence) {
  app = realpathSync(app);
  const expected = [...walk(join(app, 'app')), ...walk(join(app, 'lib'))].filter(file => {
    if (!/\.(ts|tsx)$/.test(file) || file.endsWith('.d.ts')) return false;
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
    return !source.statements.every(node => ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) ||
      (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) || (ts.isExportDeclaration(node) && node.isTypeOnly));
  });
  const owned = new Set(expected), coverage = createCoverageMap({});
  const sources = [...walk(join(evidence, 'v8-server')), ...walk(join(evidence, 'v8-test')),
    ...readdirSync(evidence).filter(file => file.startsWith('browser-') && file.endsWith('.json')).map(file => join(evidence, file))];
  const normalizedMaps = new Map(), contributions = [];
  for (const file of sources) {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    for (const script of raw.result) {
      if (!script.url.startsWith('file:')) continue;
      const path = fileURLToPath(script.url);
      if (!existsSync(path)) continue;
      const canonical = realpathSync(path);
      let sourceMap;
      if (existsSync(path + '.map')) {
        if (!normalizedMaps.has(canonical)) {
          const map = JSON.parse(readFileSync(path + '.map', 'utf8'));
          map.sources = map.sources.map(source => {
            const local = source.match(/^webpack:\/\/[^/]+\/\.\/(.+)$/);
            if (!local) return source;
            const target = resolve(app, local[1]);
            return owned.has(target) ? target : source;
          });
          const content = map.sourcesContent ?? [];
          map.sourcesContent = map.sources.map((source, index) => {
            if (owned.has(source)) {
              const original = readFileSync(source, 'utf8');
              if (content[index] != null) assert.equal(content[index], original, 'Stale fixture source map: ' + source);
              return original;
            }
            return content[index] ?? '';
          });
          normalizedMaps.set(canonical, map);
        }
        const map = normalizedMaps.get(canonical);
        if (!map.sources.some(source => owned.has(source))) continue;
        sourceMap = { sourcemap: map };
      } else if (!owned.has(canonical)) continue;
      const generated = script.source ?? readFileSync(path, 'utf8');
      const converter = convert(canonical, 0, { source: generated, ...(sourceMap ? { sourceMap } : {}) }, path => !owned.has(path));
      await converter.load();
      converter.applyCoverage(sourceMap ? mappedFunctions(script.functions, generated, sourceMap.sourcemap) : script.functions);
      const mapped = converter.toIstanbul();
      for (const [source, data] of Object.entries(mapped)) contributions.push({ capture: file, script: canonical, source, coverage: data });
      coverage.merge(mapped);
    }
  }
  for (const file of expected) if (!coverage.files().includes(file)) {
    const source = readFileSync(file, 'utf8'), missing = convert(file, 0, { source });
    await missing.load();
    missing.applyCoverage([{ functionName: '(empty-report)', isBlockCoverage: true, ranges: [{ startOffset: 0, endOffset: source.length, count: 0 }] }]);
    coverage.merge(missing.toIstanbul());
  }
  writeFileSync(join(evidence, 'fixture-contributions.json'), JSON.stringify(contributions));
  const report = coverage.toJSON();
  writeFileSync(join(evidence, 'fixture-coverage.json'), JSON.stringify(report));
  const failures = [];
  for (const path of expected) {
    if (!report[path]) { failures.push(relative(app, path) + ': missing source coverage'); continue; }
    const summary = coverage.fileCoverageFor(path).toSummary();
    console.log(relative(app, path), JSON.stringify(summary.data));
    for (const metric of ['statements', 'lines', 'branches']) if (summary[metric].pct < 95) failures.push(`${relative(app, path)} ${metric} ${summary[metric].pct}%`);
  }
  if (failures.length) throw Error('Fixture coverage below per-file 95%: ' + failures.join('; '));
}
