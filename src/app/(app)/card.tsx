import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Platform, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
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
import { useApiQuery } from '@/hooks/useApiQuery';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { cancelWrite, nfcAvailability, openNfcSettings, writeUriToTag } from '@/services/nfc/nfc';

const QR_LOGO = require('../../../assets/images/brand-mark.png');

const cardLabel = (c: DigitalCard) => c.name || (c.kind === 'business' ? 'Business card' : 'Team card');

/** Screen 8: show the card's QR code, share the link, write it to a blank NFC card or sticker. */
export default function MyCardScreen() {
  const fetcher = useCallback((signal: AbortSignal) => cardsApi.list(signal), []);
  const { data, error, loading, refreshing, reload, refresh } = useApiQuery('cards', fetcher);
  useRefreshOnFocus(refresh);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (loading) return <LoadingView />;
  if (!data) return error ? <ErrorState error={error} onRetry={reload} /> : null;

  const cards = data.filter((c) => !!c.short_url);
  if (cards.length === 0) {
    return <EmptyState title="No card yet" message="Set up your digital card on the web, then it shows here." />;
  }
  // The business card first; the API doesn't say which card is the signed-in user's own.
  const card = cards.find((c) => c.id === selectedId) ?? cards.find((c) => c.kind === 'business') ?? cards[0];

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
      <CardView card={card} />
    </ScrollView>
  );
}

function CardView({ card }: { card: DigitalCard }) {
  const router = useRouter();
  const url = card.short_url!;
  const stats = card.stats_30d;

  const share = () =>
    Share.share(Platform.OS === 'ios' ? { url } : { message: url }, { dialogTitle: 'Share your card' }).catch(() => {});

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
          {/* ecl H: the logo in the middle covers part of the code, high error correction keeps it scannable. */}
          <QRCode
            value={url}
            size={220}
            backgroundColor="#FFFFFF"
            color="#000000"
            ecl="H"
            quietZone={10}
            logo={QR_LOGO}
            logoSize={44}
            logoBackgroundColor="#FFFFFF"
            logoMargin={4}
            logoBorderRadius={8}
          />
        </View>
        <Text style={[styles.cardCaption, styles.center]}>Let people scan this QR code to leave you a review</Text>
        <Text style={[styles.url, styles.center]} selectable>
          {url}
        </Text>
      </View>

      <Button title="Share link" icon="share-social-outline" onPress={share} />
      <NfcWriter url={url} />
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
      <Text style={[font.caption, styles.center]}>
        Phones can’t pass a link to another phone by tapping. Use the QR code or Share link for that.
      </Text>
    </>
  );
}

/** Writes short_url as an NDEF URI record. iPhone shows its own sheet; Android gets ours. */
function NfcWriter({ url }: { url: string }) {
  const [waiting, setWaiting] = useState(false);

  const write = async () => {
    const availability = await nfcAvailability();
    if (availability === 'unsupported') {
      Alert.alert('NFC not available', 'This phone can’t write NFC tags. Use the QR code or Share link instead.');
      return;
    }
    if (availability === 'disabled') {
      Alert.alert('Turn on NFC', 'NFC is off on this phone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: openNfcSettings },
      ]);
      return;
    }
    if (Platform.OS === 'android') setWaiting(true);
    const result = await writeUriToTag(url);
    setWaiting(false);
    if (result.ok) {
      if (Platform.OS === 'android') Alert.alert('Done', 'Your card link is on the tag. Tap it with a phone to try it.');
    } else if (!result.cancelled && Platform.OS === 'android') {
      // iOS shows its own error in the system sheet.
      Alert.alert('Couldn’t write the tag', 'Use a blank, writable NFC card or sticker and hold it still against the phone.');
    }
  };

  return (
    <>
      <Button title="Write to NFC card or sticker" variant="secondary" icon="radio-outline" onPress={write} />
      <Modal visible={waiting} transparent animationType="fade" onRequestClose={cancelWrite}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={font.heading}>Ready to write</Text>
            <Text style={[font.body, styles.center]}>Hold a blank NFC card or sticker against the back of your phone.</Text>
            <Button title="Cancel" variant="secondary" onPress={cancelWrite} />
          </View>
        </View>
      </Modal>
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
  qr: { padding: spacing.sm, marginVertical: spacing.sm, backgroundColor: '#FFFFFF', borderRadius: radius.lg },
  url: { fontSize: 14, fontWeight: '600', color: colors.onPrimary },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
});
