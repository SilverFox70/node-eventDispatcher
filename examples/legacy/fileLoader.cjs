const { readdir, readFile: read } = require('node:fs/promises');
const { join } = require('node:path');

/** Legacy scanner input only; paths are explicit and filesystem failures reject once. */
const fileLoader = {
  async getFileList(directory) {
    return (await readdir(directory)).filter(file => file.endsWith('.js') || file.endsWith('.cjs')).sort();
  },
  async readFile(file, directory = __dirname) {
    return { fileName: file, fileText: await read(join(directory, file), 'utf8') };
  },
  createFilesObject(files, directory = __dirname) {
    return Promise.all(files.map(file => fileLoader.readFile(file, directory)));
  },
};
module.exports = { fileLoader };
