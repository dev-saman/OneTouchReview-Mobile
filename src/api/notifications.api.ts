import type { LocationSelection } from '@/services/storage/prefsStorage';

import { network } from './network';
import { Paths } from './paths';
import type { AppNotification, NotificationsPage } from './types';

export const NOTIFICATIONS_PAGE_SIZE = 20;

/** Endpoints tab, rows "13 Notifications". location_id is an id or "all", as the list. */
export const notificationsApi = {
  /** Bell badge. 404 = older API: hide the bell. */
  unreadCount: async (location: LocationSelection, signal?: AbortSignal) =>
    (
      await network.get<{ unread_count: number }>(Paths.notificationsUnreadCount, {
        signal,
        params: { location_id: location },
      })
    ).unread_count,

  /** Last 30 days, newest first. cursor = next_cursor exactly as given. */
  list: (location: LocationSelection, cursor?: string | null, signal?: AbortSignal) =>
    network.get<NotificationsPage>(Paths.notifications, {
      signal,
      params: { location_id: location, limit: NOTIFICATIONS_PAGE_SIZE, cursor: cursor ?? undefined },
    }),

  /** On tap. Safe to call twice. 404 NOT_FOUND if gone or another user's. */
  markRead: (id: number, location: LocationSelection) =>
    network.post<{ notification: AppNotification; unread_count: number }>(Paths.notificationRead(id), {
      location_id: location,
    }),

  /** That location's items plus the account items. */
  markAllRead: async (location: LocationSelection) =>
    (await network.post<{ unread_count: number }>(Paths.notificationsReadAll, { location_id: location })).unread_count,
};
