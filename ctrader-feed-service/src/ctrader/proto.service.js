const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');
const { PROTO_DIR } = require('./state');

const PROTO_FILES = [
  'OpenApiMessages.proto',
  'OpenApiModelMessages.proto',
  'OpenApiCommonMessages.proto',
  'OpenApiCommonModelMessages.proto',
];

function checkProtoFiles() {
  for (const file of PROTO_FILES) {
    const protoPath = path.join(PROTO_DIR, file);
    if (!fs.existsSync(protoPath)) {
      throw new Error(`Proto file not found: ${protoPath}`);
    }
  }

  return true;
}

async function loadProtos() {
  checkProtoFiles();

  return protobuf.load(PROTO_FILES.map((file) => path.join(PROTO_DIR, file)));
}

module.exports = {
  checkProtoFiles,
  loadProtos,
};
