const ccxt = require('ccxt');
const pool = require('../infra/db/supabase');
const { ALIASES } = require('../brokers/connectors/ccxt/client');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const integrations = await client.query(`
      SELECT i.id, i.trade_method, b.slug
      FROM trading_catalog.broker_integrations i
      JOIN trading_catalog.brokers b ON b.id = i.broker_id
    `);

    for (const row of integrations.rows) {
      let config = null;
      if (row.trade_method === 'oauth_sync') {
        config = { auth_type: 'oauth', fields: [] };
      } else if (row.trade_method === 'terminal_sync') {
        config = {
          auth_type: 'credentials',
          fields: [
            { key: 'server', label: 'Broker Server', type: 'text', required: true },
            { key: 'login', label: 'Account Login ID', type: 'text', required: true },
            { key: 'password', label: 'Password', type: 'password', required: true },
          ],
        };
      } else if (row.slug === 'angel-one' && row.trade_method === 'api_sync') {
        config = {
          auth_type: 'credentials',
          fields: [
            { key: 'apiKey', label: 'API Key', type: 'text', required: true },
            { key: 'clientCode', label: 'Client Code', type: 'text', required: true },
            { key: 'password', label: 'MPIN', type: 'password', required: true },
            { key: 'totpSecret', label: 'TOTP Secret Key', type: 'password', required: true },
          ],
        };
      } else if (row.trade_method === 'api_sync') {
        const ccxtSlug = ALIASES[row.slug] || row.slug;
        const Cls = ccxt[ccxtSlug];
        const reqPassword = Cls ? Boolean(new Cls().requiredCredentials?.password) : false;
        const fields = [
          { key: 'apiKey', label: 'API Key', type: 'text', required: true },
          { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
        ];
        if (reqPassword) {
          fields.push({ key: 'password', label: 'Passphrase (API Password)', type: 'password', required: true });
        }
        config = { auth_type: 'credentials', fields };
      }

      if (config) {
        await client.query(
          'UPDATE trading_catalog.broker_integrations SET configuration = $1::jsonb, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(config), row.id]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Successfully updated integration credential fields across all brokers!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
