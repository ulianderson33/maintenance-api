import { test, expect, describe } from '@jest/globals';
import { validateAssignees } from '../../src/services/requests.service.js';

describe('Assign rules', () => {
  test('exactly one lead required', () => {
    expect(() => validateAssignees([
      { role: 'member' }, { role: 'member' },
    ])).toThrow(/lead/);
  });

  test('valid team passes', () => {
    expect(() => validateAssignees([
      { technicianId: 'a', role: 'lead' },
      { technicianId: 'b', role: 'member' },
    ])).not.toThrow();
  });
});