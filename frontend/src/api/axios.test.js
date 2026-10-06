import test from 'node:test';
import assert from 'node:assert/strict';
import api, { getApiErrorMessage } from './axios.js';

test('returns a friendly message for network failures', () => {
  const error = { message: 'Network Error' };

  assert.equal(
    getApiErrorMessage(error, 'Unable to log in. Please try again.'),
    'Unable to connect to the server. Please check your connection and try again.'
  );
});

test('prefers the API response message when available', () => {
  const error = { response: { data: { message: 'Invalid email or password' } } };

  assert.equal(getApiErrorMessage(error, 'Unable to log in. Please try again.'), 'Invalid email or password');
});

test('request interceptor gracefully handles environments without browser storage', () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;

  delete globalThis.localStorage;
  delete globalThis.window;

  assert.doesNotThrow(() => {
    const requestConfig = { headers: {} };
    const interceptor = api.interceptors.request.handlers[0]?.fulfilled;
    interceptor?.(requestConfig);
  });

  if (originalLocalStorage) {
    globalThis.localStorage = originalLocalStorage;
  }

  if (originalWindow) {
    globalThis.window = originalWindow;
  }
});
