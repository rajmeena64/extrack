const zlib = require('zlib');

function unzipFirstFile(zipBuffer) {
  const signature = 0x02014b50;
  let directory = -1;
  for (let index = zipBuffer.length - 46; index >= 0; index -= 1) {
    if (zipBuffer.readUInt32LE(index) === signature) { directory = index; break; }
  }
  if (directory < 0) throw new Error('Invalid zip file');
  const method = zipBuffer.readUInt16LE(directory + 10);
  const size = zipBuffer.readUInt32LE(directory + 20);
  const local = zipBuffer.readUInt32LE(directory + 42);
  if (zipBuffer.readUInt32LE(local) !== 0x04034b50) throw new Error('Invalid zip header');
  const start = local + 30 + zipBuffer.readUInt16LE(local + 26) + zipBuffer.readUInt16LE(local + 28);
  const compressed = zipBuffer.subarray(start, start + size);
  if (method === 0) return compressed.toString('utf8');
  if (method === 8) return zlib.inflateRawSync(compressed).toString('utf8');
  throw new Error(`Unsupported zip compression method: ${method}`);
}

module.exports = { unzipFirstFile };
