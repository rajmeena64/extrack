class IStorageProvider {
  async upload(file, options = {}) {
    throw new Error('upload not implemented');
  }

  async delete(fileKey) {
    throw new Error('delete not implemented');
  }

  getPublicUrl(fileKey) {
    throw new Error('getPublicUrl not implemented');
  }
}

module.exports = IStorageProvider;
