import { sessionActions } from '../../session/sessionSlice';
import { locationActions, locationReducer, resolveSelection } from '../locationSlice';

const AUSTIN = { id: 1497, name: 'Austin' };
const DALLAS = { id: 1498, name: 'Dallas' };

describe('resolveSelection', () => {
  it('keeps a saved location that still exists', () => {
    expect(resolveSelection(1498, [AUSTIN, DALLAS])).toBe(1498);
    expect(resolveSelection('all', [AUSTIN, DALLAS])).toBe('all');
  });

  it('falls back to "all" when the saved location is gone or missing', () => {
    expect(resolveSelection(9999, [AUSTIN, DALLAS])).toBe('all');
    expect(resolveSelection(null, [AUSTIN, DALLAS])).toBe('all');
  });

  it('a single-location business always uses that location', () => {
    expect(resolveSelection('all', [AUSTIN])).toBe(1497);
    expect(resolveSelection(1498, [AUSTIN])).toBe(1497);
  });

  it('no locations → no selection', () => {
    expect(resolveSelection(1497, [])).toBeNull();
  });
});

describe('locationReducer', () => {
  it('hydrates the saved choice, then validates it when locations load', () => {
    let state = locationReducer(undefined, locationActions.hydrated(1498));
    state = locationReducer(state, locationActions.locationsLoaded([AUSTIN, DALLAS]));
    expect(state.selected).toBe(1498);
    state = locationReducer(state, locationActions.selected(1497));
    expect(state.selected).toBe(1497);
  });

  it('sign-out clears the list but keeps the saved choice for re-validation', () => {
    let state = locationReducer(undefined, locationActions.locationsLoaded([AUSTIN, DALLAS]));
    state = locationReducer(state, locationActions.selected(1498));
    state = locationReducer(state, sessionActions.signedOut());
    expect(state.locations).toEqual([]);
    expect(state.selected).toBe(1498);
  });
});
