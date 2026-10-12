const crypto = require('crypto');
const {
  decryptUserBrokerCredential,
  encryptUserBrokerCredential,
} = require('../../../shared/utils/credentialEncryption');
const repository = require('./repository');
const { verifyBinanceCredentials } = require('./verification');

function fingerprintBinanceAccount(accountIdentity, environment = 'real') {
  const namespace = environment === 'demo' ? 'binance:demo' : 'binance';
  return `${namespace}:${crypto.createHash('sha256').update(`${namespace}:${accountIdentity}`).digest('hex')}`;
}

async function connectBinance(userId, connectionId, environment, credentials, dependencies = {}) {
  const verify = dependencies.verify || verifyBinanceCredentials;
  const encrypt = dependencies.encrypt || encryptUserBrokerCredential;
  const save = dependencies.save || repository.saveVerifiedConnection;
  const { capabilities, accountIdentity } = await verify(credentials, environment);
  const accountFingerprint = fingerprintBinanceAccount(accountIdentity, environment);
  const metadata = { provider: 'binance', environment, readOnly: true, capabilities };
  const encryptedPayload = encrypt(
    JSON.stringify(credentials),
    `binance:user:${userId}`
  );
  const savedConnectionId = await save(userId, connectionId, metadata, encryptedPayload, accountFingerprint);
  return { capabilities, connectionId: savedConnectionId, environment };
}

async function ensureBinanceAccountFingerprint(userId, connectionId, dependencies = {}) {
  const getCredential = dependencies.getCredential || repository.getCredentialByConnection;
  const setFingerprint = dependencies.setFingerprint || repository.setAccountFingerprint;
  const verify = dependencies.verify || verifyBinanceCredentials;
  const decrypt = dependencies.decrypt || decryptUserBrokerCredential;
  const credential = await getCredential(userId, connectionId);
  if (!credential) {
    const error = new Error('Binance credential is unavailable');
    error.code = 'BINANCE_CONNECTION_REQUIRED';
    throw error;
  }
  const credentials = JSON.parse(decrypt(credential.encryptedPayload, `binance:user:${userId}`));
  const environment = credential.environment || 'real';
  const { accountIdentity } = await verify(credentials, environment);
  const accountFingerprint = fingerprintBinanceAccount(accountIdentity, environment);
  const updated = await setFingerprint(userId, connectionId, accountFingerprint);
  if (!updated) {
    const error = new Error('Binance connection ownership check failed');
    error.code = 'BINANCE_CONNECTION_REQUIRED';
    throw error;
  }
  return accountFingerprint;
}

module.exports = { connectBinance, ensureBinanceAccountFingerprint, fingerprintBinanceAccount };
