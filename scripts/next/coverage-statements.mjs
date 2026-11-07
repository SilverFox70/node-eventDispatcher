import ts from 'typescript';

const delimiters = new Set([
  ts.SyntaxKind.CloseBraceToken,
  ts.SyntaxKind.CloseParenToken,
  ts.SyntaxKind.CloseBracketToken,
  ts.SyntaxKind.SemicolonToken,
  ts.SyntaxKind.CommaToken,
]);

/** Drop source-map entries whose entire authored extent is closing punctuation. */
export function withoutDelimiterCoverage(coverage, source) {
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
  const delimiterOnly = location => {
    if (!location?.start || !location.end) return false;
    const line = location.start.line;
    return location.end.line === line && closing.has(line) && !executable.has(line);
  };
  const statementMap = {}, s = {};
  for (const [id, location] of Object.entries(coverage.statementMap)) {
    if (delimiterOnly(location)) continue;
    statementMap[id] = location;
    s[id] = coverage.s[id];
  }
  const branchMap = {}, b = {};
  for (const [id, branch] of Object.entries(coverage.branchMap)) {
    if (branch.type === 'branch' && branch.locations?.length === 1 &&
        delimiterOnly(branch.loc) && delimiterOnly(branch.locations[0])) continue;
    branchMap[id] = branch;
    b[id] = coverage.b[id];
  }
  return { ...coverage, statementMap, s, branchMap, b };
}
