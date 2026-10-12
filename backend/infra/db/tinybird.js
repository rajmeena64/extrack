const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
  quiet: true,
});

const tinybird = {
  baseUrl: process.env.TINYBIRD_URL || 'https://api.tinybird.co',
  token: process.env.TINYBIRD_TOKEN,
  async ping() {
    if (!this.token) throw new Error('TINYBIRD_TOKEN is missing');
    const res = await fetch(`${this.baseUrl}/v0/pipes`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    return res.ok;
  },
};

module.exports = tinybird;
