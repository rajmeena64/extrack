const { smartApiRequest } = require('./signedRequest');
const { authenticateAngelOneCredentials } = require('./verification');
async function fetchAngelOneTradeBook(credentials) {
  const session = await authenticateAngelOneCredentials(credentials);
  const rawFills = await smartApiRequest('/rest/secure/angelbroking/order/v1/getTradeBook', {
    method: 'GET',
    apiKey: credentials.apiKey,
    jwtToken: session.jwtToken,
  });
  const rmsData = await smartApiRequest('/rest/secure/angelbroking/user/v1/getRMS', {
    method: 'GET',
    apiKey: credentials.apiKey,
    jwtToken: session.jwtToken,
  }).catch(() => null);
  const fills = Array.isArray(rawFills) ? rawFills : Array.isArray(rawFills?.data) ? rawFills.data : [];
  const balance = Number(rmsData?.net || rmsData?.availablecash || 0);
  return {
    session,
    fills,
    balance: Number.isFinite(balance) ? balance : 0,
    currency: 'INR',
  };
}
module.exports = { fetchAngelOneTradeBook };
