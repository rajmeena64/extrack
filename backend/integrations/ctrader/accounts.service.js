const axios = require('axios');
const { ctraderConfig } = require('./state');

function chooseCurrentAccount() {
  if (!ctraderConfig.accounts.length) return;

  const demoAccount = ctraderConfig.accounts.find((acc) => acc.isDemo === true || acc.type === 'demo');
  const liveAccount = ctraderConfig.accounts.find((acc) => acc.isDemo === false || acc.type === 'live');
  const selectedAccount = ctraderConfig.isDemo
    ? demoAccount || ctraderConfig.accounts[0]
    : liveAccount || ctraderConfig.accounts[0];

  ctraderConfig.accountId = selectedAccount.id || selectedAccount.accountId;
  ctraderConfig.currentAccount = selectedAccount;
}

async function getAccountsViaWeb() {
  try {
    const response = await axios.get(
      'https://api.ctrader.com/v2/accounts',
      {
        headers: {
          Authorization: `Bearer ${ctraderConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    ctraderConfig.accounts = response.data || [];
    chooseCurrentAccount();
    return ctraderConfig.accounts;
  } catch (err) {
    return [];
  }
}

async function getAccountsViaOpenAPI() {
  try {
    const response = await axios.get(
      'https://openapi.ctrader.com/v1/accounts',
      {
        headers: {
          Authorization: `Bearer ${ctraderConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    ctraderConfig.accounts = response.data.accounts || [];
    chooseCurrentAccount();
    return ctraderConfig.accounts;
  } catch (err) {
    return [];
  }
}

async function getAccounts() {
  let accounts = await getAccountsViaOpenAPI();

  if (accounts.length === 0) {
    accounts = await getAccountsViaWeb();
  }

  return accounts;
}

module.exports = {
  getAccounts,
  getAccountsViaOpenAPI,
  getAccountsViaWeb,
};
