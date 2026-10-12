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
        clientMsgId: String(requestId),
      });

      if (waitForResponse) {
        pendingRequests.set(requestId, {
          payloadType,
          payloadData,
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

  function toFiniteNumber(val) {
    if (val === null || val === undefined) return NaN;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return Number(val);
    if (typeof val.toString === 'function') return Number(val.toString());
    return Number(val);
  }

  function findPendingRequestByResponseType(responsePayloadType, decodedPayload) {
    const matches = [];
    const resSymId = decodedPayload ? toFiniteNumber(decodedPayload.symbolId) : NaN;

    for (const [pendingRequestId, pending] of pendingRequests.entries()) {
      if (EXPECTED_RESPONSE_BY_REQUEST[pending.payloadType] === responsePayloadType) {
        const reqSymId = pending.payloadData ? toFiniteNumber(pending.payloadData.symbolId) : NaN;
        if (Number.isFinite(resSymId) && Number.isFinite(reqSymId)) {
          if (resSymId === reqSymId) {
            matches.push([pendingRequestId, pending]);
          }
        } else {
          matches.push([pendingRequestId, pending]);
        }
      }
    }

    if (matches.length > 0) {
      return {
        requestId: matches[0][0],
        pending: matches[0][1],
      };
    }

    return null;
  }

  function resolvePendingResponse(decoded) {
    const root = getRoot();
    const parsedId = decoded.clientMsgId ? Number(decoded.clientMsgId) : Number(decoded.requestId || 0);
    const requestId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : 0;
    let resolvedRequestId = requestId;
    let pending = requestId ? pendingRequests.get(requestId) : null;

    let decodedPayloadObj = null;
    const responseTypeName = RESPONSE_TYPE_NAMES[decoded.payloadType];
    if (responseTypeName && root) {
      try {
        const ResponseType = root.lookupType(responseTypeName);
        decodedPayloadObj = ResponseType.decode(decoded.payload);
      } catch {}
    }

    if (!pending && !requestId) {
      const fallbackPending = findPendingRequestByResponseType(decoded.payloadType, decodedPayloadObj);
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
        const error = new Error(errorData.description || errorData.errorCode || 'cTrader API error');
        error.status = 502;
        error.payload = {
          success: false,
          error: error.message,
          code: errorData.errorCode || null,
          raw: errorData,
        };
        pending.reject(error);
      } catch (error) {
        pending.reject(error);
      }
      return true;
    }

    if (!responseTypeName) {
      pending.reject(new Error(`Unexpected cTrader response type ${decoded.payloadType}`));
      return true;
    }

    if (decodedPayloadObj) {
      pending.resolve(decodedPayloadObj);
    } else {
      try {
        const ResponseType = root.lookupType(responseTypeName);
        pending.resolve(ResponseType.decode(decoded.payload));
      } catch (error) {
        pending.reject(error);
      }
    }

    return true;
  }

  async function requestMessage(payloadType, payloadData, timeoutMs = 15000) {
    const requestId = sendMessage(payloadType, payloadData, true);
    if (!requestId) {
      throw new Error('Failed to send cTrader request');
    }
    return waitForResponse(requestId, timeoutMs);
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
