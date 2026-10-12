import type { Chat, ChatMessage } from '@/api/types';
import { formatPhone, humanize } from '@/utils/format';

/** Who the chat is with: client name, visitor name, phone, email — in that order. */
export function chatTitle(chat: Pick<Chat, 'customer' | 'visitor'>): string {
  return (
    chat.customer?.name ||
    chat.visitor?.name ||
    formatPhone(chat.visitor?.phone) ||
    chat.visitor?.email ||
    'Visitor'
  );
}

/** "Text" for sms; other channels as the API names them. */
export function channelLabel(channel: string | null | undefined): string {
  if (!channel) return '';
  return channel === 'sms' ? 'Text' : humanize(channel);
}

/** The assignee's name, or null when the chat is unassigned. */
export function assignedName(assignedTo: { id: number; name: string } | null | undefined): string | null {
  return assignedTo?.name?.trim() || null;
}

/** reply_block / hold_reason: shown only when the API sends text. */
export function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Last message preview for the inbox. */
export function preview(message: ChatMessage | null): string {
  if (!message) return '';
  const body = message.body?.trim();
  const attachments = message.media_count > 0 ? `${message.media_count} attachment${message.media_count === 1 ? '' : 's'}` : '';
  const text = body || attachments;
  return message.from === 'business' && text ? `You: ${text}` : text;
}

/** delivery.status for our messages ("logged" in the test business). */
export function deliveryLabel(message: ChatMessage): string | null {
  if (message.from !== 'business' || !message.delivery?.status) return null;
  return humanize(message.delivery.status);
}
