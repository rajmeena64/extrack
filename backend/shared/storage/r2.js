const { GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');

let client;

function config() {
  const accountId = String(process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = String(process.env.R2_BUCKET_NAME || '').trim();
  const endpoint = String(process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`).trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw Object.assign(new Error('R2 archive storage is not configured'), { code: 'SERVICE_UNAVAILABLE' });
  }
  let parsed;
  try { parsed = new URL(endpoint); } catch { parsed = null; }
  if (!parsed || parsed.protocol !== 'https:') {
    throw Object.assign(new Error('R2 endpoint must use HTTPS'), { code: 'SERVICE_UNAVAILABLE' });
  }
  return { accessKeyId, secretAccessKey, bucket, endpoint: parsed.toString().replace(/\/$/, '') };
}

function r2Client(settings) {
  if (!client) client = new S3Client({
    region: 'auto',
    endpoint: settings.endpoint,
    credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
  });
  return client;
}

async function putObject({ key, body, contentType }) {
  const settings = config();
  const result = await r2Client(settings).send(new PutObjectCommand({
    Bucket: settings.bucket, Key: key, Body: body, ContentType: contentType,
  }));
  return { etag: result.ETag || null };
}

async function getObject(key) {
  const settings = config();
  try {
    const result = await r2Client(settings).send(new GetObjectCommand({ Bucket: settings.bucket, Key: key }));
    if (!result.Body) throw new Error('R2 archive response had no body');
    const bytes = typeof result.Body.transformToByteArray === 'function'
      ? await result.Body.transformToByteArray()
      : await (async () => {
        const chunks = [];
        for await (const chunk of result.Body) chunks.push(Buffer.from(chunk));
        return Buffer.concat(chunks);
      })();
    return Buffer.from(bytes);
  } catch (error) {
    if (error?.name === 'NoSuchKey' || error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
      throw Object.assign(new Error('R2 trade archive is missing'), { code: 'R2_OBJECT_MISSING' });
    }
    throw error;
  }
}

module.exports = { getObject, putObject };
