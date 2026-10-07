import { parseLocations } from '../locations.api';

// Trimmed from the Sheet's GET /locations response example.
const BODY = {
  locations: [
    { id: 1497, business_id: 99, name: 'Austin', is_default: true, status: 'active', staff: [] },
    { id: 1498, business_id: 99, name: 'Dallas', is_default: false, status: 'active', staff: [] },
  ],
  limits: { limit: 10, used: 2, remaining: 8, can_add: true },
  places: { enabled: false },
  manual_locations_allowed: false,
};

describe('parseLocations', () => {
  it('maps the locations array to id and name', () => {
    expect(parseLocations(BODY)).toEqual([
      { id: 1497, name: 'Austin' },
      { id: 1498, name: 'Dallas' },
    ]);
  });

  it('returns an empty list when the business has no locations', () => {
    expect(parseLocations({ ...BODY, locations: [] })).toEqual([]);
  });

  it('skips items without a numeric id or a name', () => {
    expect(parseLocations({ locations: [{ id: '3', name: 'X' }, { id: 4 }, { id: 5, name: 'Ok' }] })).toEqual([
      { id: 5, name: 'Ok' },
    ]);
  });

  it('rejects a body without a locations array', () => {
    expect(() => parseLocations([{ id: 1, name: 'Austin' }])).toThrow();
    expect(() => parseLocations(null)).toThrow();
  });
});
