const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const ts = require('typescript');

test('model runtime and declaration import trees remain independent of Node execution', () => {
  for (const extension of ['.js', '.d.ts']) {
    const seen = new Set();
    function visit(path) {
      if (seen.has(path)) return; seen.add(path);
      const text = readFileSync(path, 'utf8');
      const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
      for (const statement of source.statements) {
        if (!(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) || !statement.moduleSpecifier) continue;
        const name = statement.moduleSpecifier.text;
        assert(name.startsWith('.'), `Unexpected model dependency ${name}`);
        const target = resolve(dirname(path), name.replace(/\.js$/, extension));
        const serverEntries = ['runtime', 'inspection', 'dispatcher', 'component', 'graph', 'contracts'].map(name => resolve(__dirname, '../dist/esm/' + name + extension));
        assert(!serverEntries.includes(target), `Server dependency ${target}`);
        visit(target);
      }
    }
    visit(resolve(__dirname, '../dist/esm/model/index' + extension));
    assert(seen.size > 5);
  }
});
