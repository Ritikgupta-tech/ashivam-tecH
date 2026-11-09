import crypto from 'crypto';

export function signServicePayload(payload, secret, sourceSystem = 'ashivam-website', customTimestamp = null) {
  const requestId = crypto.randomUUID();
  const correlationId = payload.correlationId || crypto.randomUUID();
  const timestamp = customTimestamp !== null && customTimestamp !== undefined
    ? String(customTimestamp)
    : Date.now().toString();
  const idempotencyKey = payload.idempotencyKey || crypto.randomUUID();

  const bodyString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${requestId}.${bodyString}`)
    .digest('hex');

  return {
    headers: {
      'x-source-system': sourceSystem,
      'x-request-id': requestId,
      'x-correlation-id': correlationId,
      'x-timestamp': timestamp,
      'x-idempotency-key': idempotencyKey,
      'x-signature': signature,
      'content-type': 'application/json'
    },
    metadata: {
      requestId,
      correlationId,
      idempotencyKey,
      timestamp,
      signature
    }
  };
}

export async function sendServiceRequest(url, payload, secret, sourceSystem = 'ashivam-website', options = {}) {
  const { headers, metadata } = signServicePayload(payload, secret, sourceSystem);
  const timeoutMs = options.timeoutMs || 8000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method || 'POST',
      headers: {
        ...headers,
        ...(options.headers || {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const responseData = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      status: response.status,
      data: responseData,
      metadata
    };
  } catch (err) {
    return {
      ok: false,
      status: err.name === 'AbortError' ? 504 : 500,
      error: err.message,
      metadata
    };
  } finally {
    clearTimeout(timeout);
  }
}
