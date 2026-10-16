import { phoneNote, sourceChips, sourceLabel } from '../sources';

describe('lead sources', () => {
  it('labels known sources and humanizes new ones', () => {
    expect(sourceLabel('assistant_card')).toBe('Card assistant');
    expect(sourceLabel('booking')).toBe('Booking');
    expect(sourceLabel('qr_kiosk')).not.toBe('qr_kiosk');
  });

  it('makes chips from counts.by_source, without zeros', () => {
    expect(sourceChips({ assistant_card: 2, card_form: 0, booking: 1 })).toEqual([
      { value: 'assistant_card', label: 'Card assistant (2)' },
      { value: 'booking', label: 'Booking (1)' },
    ]);
    expect(sourceChips(undefined)).toEqual([]);
  });

  it('marks unverified phones', () => {
    expect(phoneNote({ phone: '+15125550102', phone_verified: false })).toBe('Phone given by the visitor (not verified)');
    expect(phoneNote({ phone: '+15125550102', phone_verified: true })).toBeNull();
    expect(phoneNote({ phone: null, phone_verified: false })).toBeNull();
  });
});
