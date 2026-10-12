const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

async function executeMt5Sync(credentials) {
  const vpsUrl = process.env.MT5_WORKER_URL;
  if (vpsUrl) {
    const res = await axios.post(`${vpsUrl.replace(/\/+$/, '')}/sync`, credentials, { timeout: 30000 });
    if (!res.data?.success) {
      const err = new Error(res.data?.message || 'MetaTrader VPS sync failed');
      err.code = res.data?.code || 'SYNC_FAILED';
      throw err;
    }
    return res.data;
  }

  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../../../workers/mt5_sync.py');
    const args = [
      scriptPath,
      '--login', String(credentials.login),
      '--password', String(credentials.password),
      '--server', String(credentials.server),
    ];
    if (credentials.fromTimestamp) {
      args.push('--from-timestamp', String(credentials.fromTimestamp));
    }
    if (credentials.gmtOffset !== undefined) {
      args.push('--gmt-offset', String(credentials.gmtOffset));
    }

    const py = spawn('python', args, { windowsHide: true });
    let stdoutData = '';
    let stderrData = '';

    py.stdout.on('data', (chunk) => { stdoutData += chunk.toString(); });
    py.stderr.on('data', (chunk) => { stderrData += chunk.toString(); });

    py.on('error', (err) => {
      err.code = 'PROCESS_SPAWN_FAILED';
      reject(err);
    });

    py.on('close', (code) => {
      if (code !== 0) {
        try {
          const parsedErr = JSON.parse(stdoutData || stderrData);
          const err = new Error(parsedErr.message || 'MetaTrader sync failed');
          err.code = parsedErr.code || 'AUTHENTICATION_FAILED';
          return reject(err);
        } catch {
          const err = new Error(stderrData || stdoutData || `MetaTrader worker exited with code ${code}`);
          err.code = 'WORKER_ERROR';
          return reject(err);
        }
      }

      try {
        const parsed = JSON.parse(stdoutData);
        if (!parsed.success) {
          const err = new Error(parsed.message || 'MetaTrader sync failed');
          err.code = parsed.code || 'SYNC_FAILED';
          return reject(err);
        }
        resolve(parsed);
      } catch (parseErr) {
        parseErr.code = 'INVALID_JSON_RESPONSE';
        reject(parseErr);
      }
    });
  });
}

module.exports = { executeMt5Sync };
