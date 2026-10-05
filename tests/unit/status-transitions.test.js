import { test, expect, describe } from '@jest/globals';
import { ALLOWED_TRANSITIONS } from '../../src/services/requests.service.js';

describe('Status transitions', () => {
  test('new → in_progress allowed', () => {
    expect(ALLOWED_TRANSITIONS.new).toContain('in_progress');
  });
  test('done → new forbidden', () => {
    expect(ALLOWED_TRANSITIONS.done).not.toContain('new');
  });
  test('rejected is terminal', () => {
    expect(ALLOWED_TRANSITIONS.rejected).toEqual([]);
  });
});