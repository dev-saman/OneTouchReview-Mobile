import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { cardsApi } from '@/api/cards.api';
import type { DigitalCard } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { BrandWordmarkLight } from '@/components/ui/Brand';
import { Badge, Card } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { LAUNCH_COLORS } from '@/components/ui/LaunchScreen';
import { EmptyState, ErrorState, LoadingView } from '@/components/ui/States';
import { colors, font, radius, shadow, spacing } from '@/constants/theme';
import { CardQr } from '@/features/card/CardQr';
import { InsightsCard } from '@/features/card/InsightsCard';
import { cardLabel, defaultShareCard, shareableCards } from '@/features/card/shareCard';
import { ShareSheet } from '@/features/card/ShareSheet';
import { selectSelectedLocation } from '@/features/location/selectors';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useAppSelector } from '@/store/hooks';

/** Screen 8: show the card's QR code, share the link, write it to a blank NFC card or sticker. */
export default function MyCardScreen() {
  const fetcher = useCallback((signal: AbortSignal) => cardsApi.list(signal), []);
  const { data, error, loading, refreshing, reload, refresh } = useApiQuery('cards', fetcher);
  useRefreshOnFocus(refresh);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const location = useAppSelector(selectSelectedLocation);

  if (loading) return <LoadingView />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;

  const cards = shareableCards(data);
  if (cards.length === 0) {
    return <EmptyState title="No card yet" message="Set up your digital card on the web, then it shows here." />;
  }
  // Dashboard tab tile 3: the chosen location's card, then the business card.
  const card = cards.find((c) => c.id === selectedId) ?? defaultShareCard(cards, location) ?? cards[0];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      {cards.length > 1 ? (
        <Chips
          options={cards.map((c) => ({ value: String(c.id), label: cardLabel(c) }))}
          value={String(card.id)}
          onChange={(v) => setSelectedId(Number(v))}
        />
      ) : null}
      <CardView card={card} onShare={() => setSharing(true)} onCardChanged={refresh} />
      {sharing ? <ShareSheet cards={cards} initialId={card.id} onClose={() => setSharing(false)} /> : null}
    </ScrollView>
  );
}

function CardView({ card, onShare, onCardChanged }: { card: DigitalCard; onShare: () => void; onCardChanged: () => void }) {
  const router = useRouter();
  const url = card.short_url!;
  const stats = card.stats_30d;

  return (
    <>
      <View style={styles.qrCard}>
        <CardBackground />
        <BrandWordmarkLight width={150} allWhite />
        <Text style={[styles.cardName, styles.center]}>{card.name || 'Your card'}</Text>
        {card.title ? <Text style={[styles.cardTitle, styles.center]}>{card.title}</Text> : null}
        {!card.enabled || !card.live ? (
          <Badge label={!card.enabled ? 'This card is turned off' : 'Not live yet'} tone="warning" />
        ) : null}
        <View style={styles.qr} accessible accessibilityLabel={`QR code for ${url}`}>
          <CardQr url={url} size={220} />
        </View>
        <Text style={[styles.cardCaption, styles.center]}>Let people scan this QR code to leave you a review</Text>
        <Text style={[styles.url, styles.center]} selectable>
          {url}
        </Text>
      </View>

      <Button title="Share card" icon="share-social-outline" onPress={onShare} accessibilityHint="QR code, share link, NFC and copy link" />
      {card.can_edit ? (
        <Button
          title="Edit card"
          variant="text"
          icon="create-outline"
          onPress={() => router.push({ pathname: '/card/edit', params: { id: String(card.id) } })}
        />
      ) : null}

      {stats ? (
        <Card title="Last 30 days">
          <View style={styles.stats}>
            <Stat label="Views" value={stats.views} />
            <Stat label="Scans" value={stats.scans} />
            <Stat label="Taps" value={stats.taps} />
            <Stat label="Chats" value={stats.chats} />
          </View>
        </Card>
      ) : null}
      <InsightsCard key={card.id} card={card} onCardChanged={onCardChanged} />
      <Text style={[font.caption, styles.center]}>
        Phones can’t pass a link to another phone by tapping. Use the QR code or Share card for that.
      </Text>
    </>
  );
}

/** Teal-to-navy gradient behind the card, as in the brand artwork. Decorative. */
function CardBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="card" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="1" stopColor={LAUNCH_COLORS.top} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#card)" />
    </Svg>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={font.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  qrCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow,
  },
  cardName: { fontSize: 22, fontWeight: '700', color: colors.onPrimary, marginTop: spacing.xs },
  cardTitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  cardCaption: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  center: { textAlign: 'center' },
  qr: { padding: spacing.sm, marginVertical: spacing.sm, backgroundColor: colors.qrLight, borderRadius: radius.lg },
  url: { fontSize: 14, fontWeight: '600', color: colors.onPrimary },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text },
});
