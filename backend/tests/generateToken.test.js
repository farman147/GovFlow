import test from 'node:test';
import assert from 'node:assert/strict';

import { queueDate } from '../utils/generateToken.js';

test('queueDate uses the local calendar day instead of UTC day', () => {
  const localDate = new Date('2026-09-23T00:30:00+05:30');
  const result = queueDate(localDate);

  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 8);
  assert.equal(result.getDate(), 23);
  assert.equal(result.getHours(), 0);
  assert.equal(result.getMinutes(), 0);
  assert.equal(result.getSeconds(), 0);
  assert.equal(result.getMilliseconds(), 0);
});
