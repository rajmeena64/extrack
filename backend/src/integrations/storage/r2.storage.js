const { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const IStorageProvider = require('./contracts/IStorageProvider');

class R2Storage extends IStorageProvider {
  constructor() {
    super();
    this.client = null;
  }

  getClient() {
    if (this.client) return this.client;
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);

    if (!accessKeyId || !secretAccessKey || !endpoint) return null;

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey }
    });
    return this.client;
  }

  async upload({ key, body, contentType }) {
    const client = this.getClient();
    if (!client) throw new Error('R2 storage is not configured');
    const bucket = process.env.R2_BUCKET_NAME;
    const res = await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    }));
    return { key, etag: res.ETag || null };
  }

  async getObject(key) {
    const client = this.getClient();
    if (!client) throw new Error('R2 storage is not configured');
    const bucket = process.env.R2_BUCKET_NAME;
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = typeof res.Body.transformToByteArray === 'function'
      ? await res.Body.transformToByteArray()
      : await (async () => {
          const chunks = [];
          for await (const chunk of res.Body) chunks.push(Buffer.from(chunk));
          return Buffer.concat(chunks);
        })();
    return Buffer.from(bytes);
  }

  async delete(key) {
    const client = this.getClient();
    if (!client) return;
    const bucket = process.env.R2_BUCKET_NAME;
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}

module.exports = new R2Storage();
