const { signedRequest } = require('./signedRequest');

async function verifyBinanceCredentials(credentials, environmentOrRequest = 'real', request = signedRequest) {
  const environment = typeof environmentOrRequest === 'function' ? 'real' : environmentOrRequest;
  if (typeof environmentOrRequest === 'function') request = environmentOrRequest;
  const requestedChecks = await Promise.allSettled(environment === 'demo'
    ? [request({ market: 'usdmFutures', path: '/fapi/v3/balance', environment, ...credentials })]
    : [
      request({ market: 'spot', path: '/api/v3/account', environment, ...credentials }),
      request({ market: 'usdmFutures', path: '/fapi/v3/balance', environment, ...credentials }),
      request({ market: 'coinmFutures', path: '/dapi/v1/balance', environment, ...credentials }),
    ]);
  const checks = environment === 'demo' ? [null, requestedChecks[0], null] : requestedChecks;
  const capabilities = {
    spot: checks[0]?.status === 'fulfilled',
    usdmFutures: checks[1].status === 'fulfilled',
    coinmFutures: checks[2]?.status === 'fulfilled',
  };
  if (['spot', 'usdmFutures', 'coinmFutures'].some((key) => Boolean(capabilities[key]))) {
    const spotUid = checks[0]?.status === 'fulfilled' ? checks[0].value?.uid : null;
    const futuresBalance = checks[1].status === 'fulfilled' ? checks[1].value : null;
    const futuresAlias = Array.isArray(futuresBalance)
      ? futuresBalance.find((balance) => balance?.accountAlias)?.accountAlias
      : futuresBalance?.accountAlias;
    const coinmBalance = checks[2]?.status === 'fulfilled' ? checks[2].value : null;
    const coinmAlias = Array.isArray(coinmBalance)
      ? coinmBalance.find((balance) => balance?.accountAlias)?.accountAlias
      : coinmBalance?.accountAlias;
    const accountIdentity = spotUid !== undefined && spotUid !== null && String(spotUid).trim()
      ? `spot:${spotUid}`
      : futuresAlias && String(futuresAlias).trim()
        ? `usdm:${futuresAlias}`
        : coinmAlias && String(coinmAlias).trim()
          ? `coinm:${coinmAlias}`
          : null;

    if (!accountIdentity) {
      const error = new Error('Binance did not return a stable account identifier');
      error.code = 'SERVICE_UNAVAILABLE';
      throw error;
    }
    return { capabilities, accountIdentity };
  }

  const codes = checks.filter(Boolean).map((check) => check.reason?.code);
  const error = new Error('Binance credential verification failed');
  error.code = codes.includes('INVALID_CREDENTIALS')
    ? 'INVALID_CREDENTIALS'
    : codes.includes('BINANCE_PERMISSION_REQUIRED')
      ? 'BINANCE_PERMISSION_REQUIRED'
      : 'SERVICE_UNAVAILABLE';
  throw error;
}

module.exports = { verifyBinanceCredentials };
