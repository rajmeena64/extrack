const cloudinary = require('cloudinary').v2;
const IStorageProvider = require('./contracts/IStorageProvider');

class CloudinaryStorage extends IStorageProvider {
  constructor() {
    super();
    this.configured = false;
  }

  ensureConfig() {
    if (this.configured) return;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    this.configured = true;
  }

  async upload(filePath, options = {}) {
    this.ensureConfig();
    const res = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'entrack',
      resource_type: options.resourceType || 'auto'
    });
    return {
      publicId: res.public_id,
      url: res.secure_url,
      format: res.format,
      bytes: res.bytes
    };
  }

  async delete(publicId) {
    this.ensureConfig();
    return cloudinary.uploader.destroy(publicId);
  }
}

module.exports = new CloudinaryStorage();
