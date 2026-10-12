function validateCredentials(payload) {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Payload must be an object' };
  }
  const { connectionId, login, password, server, gmtOffset } = payload;
  if (typeof connectionId !== 'string' || !connectionId.trim()) {
    return { error: 'Connection ID is required' };
  }
  const parsedLogin = Number(login);
  if (!Number.isInteger(parsedLogin) || parsedLogin <= 0) {
    return { error: 'Valid Account Login number is required' };
  }
  if (typeof password !== 'string' || !password.trim()) {
    return { error: 'Valid Password is required' };
  }
  if (typeof server !== 'string' || !server.trim() || server.length > 128) {
    return { error: 'Valid Broker Server is required' };
  }
  return {
    value: {
      connectionId: connectionId.trim(),
      login: parsedLogin,
      password: password.trim(),
      server: server.trim(),
      gmtOffset: gmtOffset !== undefined && Number.isInteger(Number(gmtOffset)) ? Number(gmtOffset) : undefined,
    },
  };
}
module.exports = { validateCredentials };
