import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidObjectId } from '../utils/isValidObjectId.js';

test('validates MongoDB object IDs correctly', () => {
  assert.equal(isValidObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidObjectId('507f1f77bcf86cd79943901'), false);
  assert.equal(isValidObjectId('LAND-001'), false);
  assert.equal(isValidObjectId(''), false);
  assert.equal(isValidObjectId(undefined), false);
});
