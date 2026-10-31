import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { TraceMap, eachMapping } = require('@jridgewell/trace-mapping');

/** Webpack's unmapped empty CSS modules must not inherit the previous source's closing brace. */
export function mappedFunctions(functions, source, map) {
  const starts = [0];
  for (let index = 0; index < source.length; index++) if (source[index] === '\n') starts.push(index + 1);
  const positions = [];
  eachMapping(new TraceMap(map), mapping => {
    if (mapping.source !== null) positions.push(starts[mapping.generatedLine - 1] + mapping.generatedColumn);
  });
  return functions.filter(fn => {
    const range = fn.ranges[0];
    if (source.slice(range.startOffset, range.endOffset) !== '()=>{}') return true;
    return positions.some(position => position >= range.startOffset && position < range.endOffset);
  });
}
