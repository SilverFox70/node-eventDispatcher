import ts from 'typescript';

const delimiters = new Set([
  ts.SyntaxKind.CloseBraceToken,
  ts.SyntaxKind.CloseParenToken,
  ts.SyntaxKind.CloseBracketToken,
  ts.SyntaxKind.SemicolonToken,
  ts.SyntaxKind.CommaToken,
]);

/** V8's Istanbul adapter reports one statement per source line, including closing punctuation. */
export function withoutDelimiterStatements(coverage, source) {
  const closing = new Set(), executable = new Set();
  function visit(node) {
    const children = node.getChildren(source);
    if (children.length) {
      children.forEach(visit);
      return;
    }
    const start = node.getStart(source);
    if (start >= node.end) return;
    const first = source.getLineAndCharacterOfPosition(start).line;
    const last = source.getLineAndCharacterOfPosition(node.end - 1).line;
    const lines = delimiters.has(node.kind) ? closing : executable;
    for (let line = first; line <= last; line++) lines.add(line + 1);
  }
  visit(source);
  const statementMap = {}, s = {};
  for (const [id, location] of Object.entries(coverage.statementMap)) {
    const line = location.start.line;
    if (location.end.line === line && closing.has(line) && !executable.has(line)) continue;
    statementMap[id] = location;
    s[id] = coverage.s[id];
  }
  return { ...coverage, statementMap, s };
}
