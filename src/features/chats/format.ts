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

/** assigned_to is null in every example; shown only if it is a name or { name }. */
export function assignedName(assignedTo: unknown): string | null {
  if (typeof assignedTo === 'string' && assignedTo.trim()) return assignedTo.trim();
  if (assignedTo && typeof assignedTo === 'object') {
    const name = (assignedTo as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return null;
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
