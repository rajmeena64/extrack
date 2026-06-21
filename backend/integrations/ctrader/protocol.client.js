const WebSocket = require('ws');
const {
  EXPECTED_RESPONSE_BY_REQUEST,
  REQUEST_PAYLOAD_TYPES,
  RESPONSE_TYPE_NAMES,
} = require('./constants');

function createProtocolClient({ getRoot, getSocket }) {
  let requestIdCounter = 1;
  let requestQueue = Promise.resolve();
  const pendingRequests = new Map();

  function sendMessage(payloadType, payloadData, waitForResponse = false) {
    const ws = getSocket();
    const root = getRoot();

    if (!ws || ws.readyState !== WebSocket.OPEN || !root) {
      return null;
    }

    try {
      const Message = root.lookupType('ProtoMessage');
      const requestId = requestIdCounter++;
      const payloadTypeName = REQUEST_PAYLOAD_TYPES[payloadType];
      let encodedPayload;

      if (payloadTypeName) {
        const PayloadType = root.lookupType(payloadTypeName);
        const verificationError = PayloadType.verify(payloadData);
        if (verificationError) {
          throw new Error(`${payloadTypeName} ${verificationError}`);
        }
        encodedPayload = PayloadType.encode(payloadData).finish();
      } else {
        encodedPayload = payloadData;
      }

      const msg = Message.create({
        payloadType,
        payload: encodedPayload,
        requestId,
      });

      if (waitForResponse) {
        pendingRequests.set(requestId, {
          payloadType,
          sentAt: Date.now(),
          resolve: null,
          reject: null,
        });
      }

      ws.send(Message.encode(msg).finish());
      return requestId;
    } catch (err) {
      return null;
    }
  }

  function waitForResponse(requestId, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const pending = pendingRequests.get(requestId);

      if (!pending) {
        reject(new Error('cTrader request was not queued'));
        return;
      }

      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('cTrader request timed out'));
      }, timeoutMs);

      pending.resolve = (value) => {
        clearTimeout(timeout);
        resolve(value);
      };

      pending.reject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  function findPendingRequestByResponseType(responsePayloadType) {
    const matches = [];

    for (const [pendingRequestId, pending] of pendingRequests.entries()) {
      if (EXPECTED_RESPONSE_BY_REQUEST[pending.payloadType] === responsePayloadType) {
        matches.push([pendingRequestId, pending]);
      }
    }

    if (matches.length === 1) {
      return {
        requestId: matches[0][0],
        pending: matches[0][1],
      };
    }

    return null;
  }

  function resolvePendingResponse(decoded) {
    const root = getRoot();
    const requestId = Number(decoded.requestId || 0);
    let resolvedRequestId = requestId;
    let pending = requestId ? pendingRequests.get(requestId) : null;

    if (!pending && !requestId) {
      const fallbackPending = findPendingRequestByResponseType(decoded.payloadType);
      if (fallbackPending) {
        resolvedRequestId = fallbackPending.requestId;
        pending = fallbackPending.pending;
      }
    }

    if (!pending) {
      return false;
    }

    pendingRequests.delete(resolvedRequestId);

    if (decoded.payloadType === 2142) {
      try {
        const ErrorRes = root.lookupType('ProtoOAErrorRes');
        const errorData = ErrorRes.decode(decoded.payload);
        pending.reject(new Error(errorData.description || errorData.errorCode || 'cTrader API error'));
      } catch (error) {
        pending.reject(error);
      }
      return true;
    }

    const responseTypeName = RESPONSE_TYPE_NAMES[decoded.payloadType];

    if (!responseTypeName) {
      pending.reject(new Error(`Unexpected cTrader response type ${decoded.payloadType}`));
      return true;
    }

    try {
      const ResponseType = root.lookupType(responseTypeName);
      pending.resolve(ResponseType.decode(decoded.payload));
    } catch (error) {
      pending.reject(error);
    }

    return true;
  }

  async function requestMessage(payloadType, payloadData, timeoutMs = 15000) {
    const runRequest = async () => {
      const requestId = sendMessage(payloadType, payloadData, true);

      if (!requestId) {
        throw new Error('Failed to send cTrader request');
      }

      return waitForResponse(requestId, timeoutMs);
    };

    const queuedRequest = requestQueue.catch(() => {}).then(runRequest);
    requestQueue = queuedRequest.catch(() => {});
    return queuedRequest;
  }

  return {
    requestMessage,
    resolvePendingResponse,
    sendMessage,
  };
}

module.exports = {
  createProtocolClient,
};
