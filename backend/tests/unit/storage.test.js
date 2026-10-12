const assert = require('assert');
const IStorageProvider = require('../../src/integrations/storage/contracts/IStorageProvider');
const r2 = require('../../src/integrations/storage/r2.storage');
const cloudinary = require('../../src/integrations/storage/cloudinary.storage');
const upload = require('../../src/api/middleware/upload.middleware');

function testStorageProviders() {
  assert.strictEqual(r2 instanceof IStorageProvider, true);
  assert.strictEqual(cloudinary instanceof IStorageProvider, true);
  assert.strictEqual(typeof upload.single, 'function');
  assert.strictEqual(typeof r2.upload, 'function');
  assert.strictEqual(typeof cloudinary.upload, 'function');
}

testStorageProviders();
