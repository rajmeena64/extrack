const axios = require('axios');
const { ctraderConfig } = require('../config/state');

function chooseCurrentAccount() {
  if (!ctraderConfig.accounts.length) return;
  const demoAccount = ctraderConfig.accounts.find((account) => account.isDemo === true || account.type === 'demo');
  const liveAccount = ctraderConfig.accounts.find((account) => account.isDemo === false || account.type === 'live');
  const selectedAccount = ctraderConfig.isDemo
    ? demoAccount || ctraderConfig.accounts[0]
    : liveAccount || ctraderConfig.accounts[0];
  ctraderConfig.accountId = selectedAccount.accountId;
  ctraderConfig.currentAccount = selectedAccount;
}

async function getAccountsViaWeb() {
  try {
    const response = await axios.get('https://api.ctrader.com/v2/accounts', {
      headers: {
        Authorization: `Bearer ${ctraderConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    ctraderConfig.accounts = response.data || [];
    chooseCurrentAccount();
    return ctraderConfig.accounts;
  } catch {
    return [];
  }
}

async function getAccountsViaOpenAPI() {
  try {
    const response = await axios.get('https://openapi.ctrader.com/v1/accounts', {
      headers: {
        Authorization: `Bearer ${ctraderConfig.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    ctraderConfig.accounts = response.data.accounts || [];
    chooseCurrentAccount();
    return ctraderConfig.accounts;
  } catch {
    return [];
  }
}

async function getAccounts() {
  const accounts = await getAccountsViaOpenAPI();
  return accounts.length ? accounts : getAccountsViaWeb();
}

module.exports = { getAccounts, getAccountsViaOpenAPI, getAccountsViaWeb };
