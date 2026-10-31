const { fileLoader } = require('./fileLoader.cjs');

/** Historical string-literal heuristic, not the authoritative graph/dispatcher inspector. */
async function scan(directory) {
  const files = await fileLoader.createFilesObject(await fileLoader.getFileList(directory), directory);
  return { files: files.map(({ fileName, fileText }) => {
    const subscribedEvents = [], invokedEvents = [];
    for (const [index, line] of fileText.split('\n').entries()) {
      for (const match of line.matchAll(/\.(on|once|emit)\(\s*(['"])(.*?)\2\s*(?:,\s*([^)]*))?\)/g)) {
        const event = { eventName: match[3], line: index + 1 };
        if (match[1] === 'emit') invokedEvents.push({ ...event, data: match[4] ?? '' });
        else subscribedEvents.push({ ...event, callback: match[4] ?? '', once: match[1] === 'once' });
      }
    }
    return { fileName, subscribedEvents, invokedEvents };
  }) };
}
module.exports = { scan };
if (require.main === module) {
  scan(process.argv[2] ?? __dirname).then(result => console.log(JSON.stringify(result, null, 2)), error => {
    console.error(error.code); process.exitCode = 1;
  });
}
