import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { cardsApi } from '@/api/cards.api';
import type { CardInsight, CardSuggestion, DigitalCard } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Badge, Card } from '@/components/ui/Card';
import { colors, font, spacing } from '@/constants/theme';
import { toApiError, useApiQuery } from '@/hooks/useApiQuery';
import { formatDate } from '@/utils/format';

const taps = (t: Record<string, number> | undefined) => Object.values(t ?? {}).reduce((n, v) => n + (typeof v === 'number' ? v : 0), 0);

/**
 * My card → Insights (GET /digital-cards/{id}/insights): the weekly summary and suggestions.
 * Hidden when available is false or the plan doesn't include it (any error). Apply / Dismiss
 * only when the user can edit the card and the suggestion is open.
 */
export function InsightsCard({ card, onCardChanged }: { card: DigitalCard; onCardChanged: () => void }) {
  const fetcher = useCallback((signal: AbortSignal) => cardsApi.insights(card.id, signal), [card.id]);
  const q = useApiQuery(`card-insights|${card.id}`, fetcher);
  // Apply / Dismiss answer with the updated insight, shown over the loaded one.
  const [updated, setUpdated] = useState<{ for: unknown; insight: CardInsight } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const data = q.data;
  if (!data?.available) return null;

  if (!data.enough_visits || !data.latest) {
    return (
      <Card title="Weekly insights">
        <Text style={font.body}>We need {data.needed} visits a week for a summary.</Text>
        <Text style={font.caption}>
          {data.views_this_week} {data.views_this_week === 1 ? 'visit' : 'visits'} this week so far.
        </Text>
      </Card>
    );
  }
  const latest = updated && updated.for === data ? updated.insight : data.latest;

  const act = async (suggestion: CardSuggestion, action: 'apply' | 'dismiss') => {
    setBusy(`${action}:${suggestion.key}`);
    try {
      if (action === 'apply') {
        const answer = await cardsApi.applySuggestion(card.id, latest.id, suggestion.key);
        setUpdated({ for: data, insight: { ...latest, ...answer.insight } });
        onCardChanged();
      } else {
        const insight = await cardsApi.dismissSuggestion(card.id, latest.id, suggestion.key);
        setUpdated({ for: data, insight: { ...latest, ...insight } });
        onCardChanged();
      }
    } catch (e) {
      const error = toApiError(e);
      Alert.alert(action === 'apply' ? 'Couldn’t apply it' : 'Couldn’t dismiss it', error.message);
      // ALREADY_APPLIED / OUT_OF_DATE: the card or the insight changed meanwhile.
      if (error.code === 'ALREADY_APPLIED' || error.code === 'OUT_OF_DATE') q.reload();
    } finally {
      setBusy(null);
    }
  };

  const stats = latest.stats;
  return (
    <Card title="Weekly insights">
      <Text style={font.caption}>Week of {formatDate(latest.week)}</Text>
      {latest.summary ? <Text style={font.body}>{latest.summary}</Text> : null}
      {stats ? (
        <View style={styles.stats}>
          <Stat label="Views" value={stats.views} />
          <Stat label="QR scans" value={stats.scans} />
          <Stat label="Taps" value={taps(stats.taps)} />
        </View>
      ) : null}
      {latest.suggestions.map((s) => (
        <View key={s.key} style={styles.suggestion}>
          <Text style={styles.title}>{s.title}</Text>
          {s.reason ? <Text style={font.small}>{s.reason}</Text> : null}
          {s.status === 'open' && card.can_edit ? (
            <View style={styles.actions}>
              <Button
                title="Apply"
                onPress={() => act(s, 'apply')}
                loading={busy === `apply:${s.key}`}
                disabled={!!busy}
                style={styles.action}
              />
              <Button
                title="Dismiss"
                variant="secondary"
                onPress={() => act(s, 'dismiss')}
                loading={busy === `dismiss:${s.key}`}
                disabled={!!busy}
                style={styles.action}
              />
            </View>
          ) : s.status !== 'open' ? (
            <Badge label={s.status === 'applied' ? 'Applied' : 'Dismissed'} tone={s.status === 'applied' ? 'success' : 'neutral'} />
          ) : null}
        </View>
      ))}
      {data.history.length ? (
        <>
          <Button
            title={showHistory ? 'Hide earlier weeks' : 'Earlier weeks'}
            variant="text"
            onPress={() => setShowHistory((v) => !v)}
          />
          {showHistory
            ? data.history.map((h) => (
                <View key={h.id} style={styles.history}>
                  <Text style={font.caption}>Week of {formatDate(h.week)}</Text>
                  {h.summary ? <Text style={font.small}>{h.summary}</Text> : null}
                </View>
              ))
            : null}
        </>
      ) : null}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={font.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center' },
  value: { fontSize: 20, fontWeight: '700', color: colors.text },
  suggestion: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flexGrow: 1 },
  history: { gap: 2 },
});
