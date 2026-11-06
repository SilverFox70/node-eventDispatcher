const { readFileSync } = require('node:fs');

// Keep published TypeScript locations when webpack bundles the compiled editor.
module.exports = function loadEditorSourceMap(source) {
  const path = this.resourcePath + '.map';
  this.addDependency(path);
  this.callback(null, source, JSON.parse(readFileSync(path, 'utf8')));
};
