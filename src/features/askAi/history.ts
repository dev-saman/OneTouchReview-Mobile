import type { AiHistoryTurn } from '@/api/types';

export const HISTORY_MAX_TURNS = 6;
export const HISTORY_MAX_CHARS = 2000;

/**
 * The last 6 turns before a new question: each answered question gives a user turn and an
 * assistant turn. Failed or unanswered questions are left out. Content is cut to 2,000 characters.
 */
export function buildHistory(exchanges: { question: string; answer: string | null }[]): AiHistoryTurn[] {
  const turns: AiHistoryTurn[] = [];
  for (const { question, answer } of exchanges) {
    if (!answer) continue;
    turns.push({ role: 'user', content: question.slice(0, HISTORY_MAX_CHARS) });
    turns.push({ role: 'assistant', content: answer.slice(0, HISTORY_MAX_CHARS) });
  }
  return turns.slice(-HISTORY_MAX_TURNS);
}

/** Paths the app never links to: no billing, prices or plans anywhere. */
const BLOCKED_PATH = /billing|subscription|plan|pricing|checkout|invoice/i;

/** AI answer links are web-app paths ({ label, path }, up to 4). Only safe relative paths are kept. */
export function usableLinks(links: { label?: unknown; path?: unknown }[] | null | undefined): { label: string; path: string }[] {
  return (links ?? [])
    .filter(
      (l): l is { label: string; path: string } =>
        typeof l.label === 'string' &&
        !!l.label.trim() &&
        typeof l.path === 'string' &&
        l.path.startsWith('/') &&
        !l.path.startsWith('//') &&
        !BLOCKED_PATH.test(l.path),
    )
    .slice(0, 4);
}
