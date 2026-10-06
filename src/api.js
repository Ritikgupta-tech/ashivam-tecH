const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const DEFAULT_TIMEOUT_MS = 10000;

const request = async (path, options = {}) => {
  const {
    headers: customHeaders = {},
    timeout = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    ...restOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Allow external signal to also cancel request
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(result.message || 'Request failed');
      error.status = response.status;
      error.details = result.errors || {};
      throw error;
    }

    return result;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('Request timed out. Please check your connection and try again.');
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const submitInquiry = (data) =>
  request('/inquiries', {
    method: 'POST',
    body: JSON.stringify(data),
  });