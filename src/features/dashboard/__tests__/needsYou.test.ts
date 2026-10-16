import { needsYouRows } from '../needsYou';

describe('needsYouRows', () => {
  const counts = {
    urgentFeedback: 2,
    needReply: 5,
    aiDrafts: 3,
    unreadChats: 1,
    bookings: 1,
    profileChanges: 2,
    shieldOpen: 1,
    training: 3,
  };

  it('lists every non-zero count, most urgent first, for owners and managers', () => {
    expect(needsYouRows(counts, true).map((r) => r.label)).toEqual([
      '2 urgent feedback',
      '5 reviews to reply to',
      '3 AI replies waiting for your OK',
      '1 unread chat',
      '1 booking request',
      '2 Google profile changes to approve',
      '1 review may break Google’s rules',
      '3 questions to train your bot',
    ]);
  });

  it('never shows staff the rows marked *', () => {
    expect(needsYouRows(counts, false).map((r) => r.key)).toEqual(['urgentFeedback', 'needReply', 'unreadChats', 'bookings']);
  });

  it('hides zeros; nothing left means all caught up', () => {
    expect(needsYouRows({ needReply: 0, unreadChats: 0 }, true)).toEqual([]);
    expect(needsYouRows({ needReply: 1 }, true)).toEqual([{ key: 'needReply', label: '1 review to reply to' }]);
  });
});
