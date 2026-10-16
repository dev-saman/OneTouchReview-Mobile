/** Counts behind the dashboard's "Needs you" tile (Dashboard tab row 4). */
export type NeedsCounts = {
  urgentFeedback: number;
  needReply: number;
  aiDrafts: number;
  unreadChats: number;
  bookings: number;
  profileChanges: number;
  shieldOpen: number;
  training: number;
};

export type NeedsKey = keyof NeedsCounts;

export type NeedsRow = { key: NeedsKey; label: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Most urgent first. managerOnly: the rows marked * (owners and managers only). */
const ROWS: { key: NeedsKey; managerOnly: boolean; label: (n: number) => string }[] = [
  { key: 'urgentFeedback', managerOnly: false, label: (n) => `${n} urgent feedback` },
  { key: 'needReply', managerOnly: false, label: (n) => plural(n, 'review to reply to', 'reviews to reply to') },
  { key: 'aiDrafts', managerOnly: true, label: (n) => plural(n, 'AI reply waiting for your OK', 'AI replies waiting for your OK') },
  { key: 'unreadChats', managerOnly: false, label: (n) => plural(n, 'unread chat', 'unread chats') },
  { key: 'bookings', managerOnly: false, label: (n) => plural(n, 'booking request', 'booking requests') },
  {
    key: 'profileChanges',
    managerOnly: true,
    label: (n) => plural(n, 'Google profile change to approve', 'Google profile changes to approve'),
  },
  { key: 'shieldOpen', managerOnly: true, label: (n) => plural(n, 'review may break Google’s rules', 'reviews may break Google’s rules') },
  { key: 'training', managerOnly: true, label: (n) => plural(n, 'question to train your bot', 'questions to train your bot') },
];

/** One row per count that isn't zero; staff never see the rows marked *. Empty: "You're all caught up". */
export function needsYouRows(counts: Partial<NeedsCounts>, isManager: boolean): NeedsRow[] {
  return ROWS.filter((r) => (isManager || !r.managerOnly) && (counts[r.key] ?? 0) > 0).map((r) => ({
    key: r.key,
    label: r.label(counts[r.key] ?? 0),
  }));
}
