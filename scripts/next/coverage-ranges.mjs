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

/** Preserve every original mapping while preventing Babel's column-zero heuristic crossing bundled files. */
export function prepareCoverage(functions, source, map) {
  const { decodedMappings } = require('@jridgewell/trace-mapping');
  const { encode } = require('@jridgewell/sourcemap-codec');
  const starts = [0];
  for (let index = 0; index < source.length; index++) if (source[index] === '\n') starts.push(index + 1);
  const offset = (value, end) => {
    let low = 0, high = starts.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (end ? starts[middle] < value : starts[middle] <= value) low = middle + 1;
      else high = middle;
    }
    return value + low;
  };
  const lines = decodedMappings(new TraceMap(map)).map(line => [
    [0, 0, 0, 0],
    ...line.map(segment => segment.length === 1 ? [segment[0] + 1] :
      [segment[0] + 1, segment[1] + 1, ...segment.slice(2)])
  ]);
  return {
    source: source.split('\n').map(line => ' ' + line).join('\n'),
    functions: functions.map(fn => ({ ...fn, ranges: fn.ranges.map(range => ({ ...range,
      startOffset: offset(range.startOffset, false), endOffset: offset(range.endOffset, true) })) })),
    map: { ...map, sources: ['fbp-generated-padding', ...map.sources], sourcesContent: ['0', ...map.sourcesContent], mappings: encode(lines) }
  };
}
