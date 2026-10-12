const fs = require('fs');
const path = require('path');
const pool = require('../infra/db/supabase');

const LOGO_DIRECTORY = path.resolve(__dirname, '../../public/assets/provider-logo/logos');
const PUBLIC_DIRECTORY = '/assets/provider-logo/logos';

async function mapProviderLogos() {
  const files = fs.readdirSync(LOGO_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();

  const filesBySlug = new Map();
  for (const file of files) {
    const fileStem = path.parse(file).name.toLowerCase();
    const slug = fileStem === 'ctrader-official' ? 'ctrader' : fileStem;
    if (filesBySlug.has(slug)) {
      const existingFile = filesBySlug.get(slug);
      const existingExtension = path.extname(existingFile).toLowerCase();
      const newExtension = path.extname(file).toLowerCase();
      if (existingExtension === '.svg' && newExtension !== '.svg') continue;
      if (newExtension === '.svg' && existingExtension !== '.svg') {
        filesBySlug.set(slug, file);
        continue;
      }
      throw new Error(`Duplicate provider logo slug: ${slug}`);
    }
    filesBySlug.set(slug, file);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const brokers = (await client.query('SELECT slug FROM trading_catalog.brokers')).rows;
    const brokerSlugs = new Set(brokers.map(({ slug }) => slug));
    const unmatchedFiles = [...filesBySlug.keys()].filter((slug) => !brokerSlugs.has(slug));
    if (unmatchedFiles.length) {
      throw new Error(`Provider logos without matching broker slugs: ${unmatchedFiles.join(', ')}`);
    }

    let mapped = 0;
    for (const [slug, file] of filesBySlug) {
      const logoPath = `${PUBLIC_DIRECTORY}/${encodeURIComponent(file)}`;
      const result = await client.query(
        `UPDATE trading_catalog.brokers
         SET logo_path = $1, updated_at = NOW()
         WHERE slug = $2 AND logo_path IS DISTINCT FROM $1`,
        [logoPath, slug],
      );
      mapped += result.rowCount;
    }
    await client.query('COMMIT');
    console.log(`Provider logos mapped: ${filesBySlug.size}`);
    console.log(`Broker logo paths updated: ${mapped}`);
    console.log(`Brokers without a local logo: ${brokers.length - filesBySlug.size}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

mapProviderLogos().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
