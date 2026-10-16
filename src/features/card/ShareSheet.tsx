import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { DigitalCard } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Chips } from '@/components/ui/Chips';
import { colors, font, radius, spacing } from '@/constants/theme';

import { CardQr } from './CardQr';
import { NfcWriter, useHasNfc } from './NfcWriter';
import { cardLabel, shareLink, shareMessage } from './shareCard';

/**
 * Dashboard tab tile 3, the Share sheet: card picker, then Show QR (full screen), Share link, Tap
 * to write NFC (hidden on phones without NFC) and Copy link. A card that isn't live yet shows
 * "This card isn't live yet. Finish it on the web" instead of the buttons.
 */
export function ShareSheet({
  cards,
  initialId,
  onClose,
}: {
  cards: DigitalCard[];
  initialId: number;
  onClose: () => void;
}) {
  const [cardId, setCardId] = useState(initialId);
  const [showQr, setShowQr] = useState(false);
  const hasNfc = useHasNfc();
  const card = cards.find((c) => c.id === cardId) ?? cards[0];
  const link = shareLink(card);

  const share = () => {
    const message = shareMessage(card);
    Share.share(Platform.OS === 'ios' ? { message, url: link } : { message }, { dialogTitle: 'Share your card' }).catch(() => {});
  };

  const copy = async () => {
    await Clipboard.setStringAsync(link);
    Alert.alert('Copied', link);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.content}>
          {cards.length > 1 ? (
            <Chips
              options={cards.map((c) => ({ value: String(c.id), label: cardLabel(c) }))}
              value={String(card.id)}
              onChange={(v) => setCardId(Number(v))}
            />
          ) : null}
          <View style={styles.header}>
            {card.photo_url ? (
              <Image source={{ uri: card.photo_url }} style={styles.photo} accessibilityIgnoresInvertColors />
            ) : (
              <Avatar name={cardLabel(card)} size={56} />
            )}
            <View style={styles.flex}>
              <Text style={font.heading}>{cardLabel(card)}</Text>
              {card.title ? <Text style={font.small}>{card.title}</Text> : null}
            </View>
          </View>

          {card.live ? (
            <>
              <Button title="Show QR" icon="qr-code-outline" onPress={() => setShowQr(true)} />
              <Button title="Share link" variant="secondary" icon="share-social-outline" onPress={share} />
              {hasNfc ? <NfcWriter url={card.short_url!} title="Tap to write NFC" /> : null}
              <Button title="Copy link" variant="text" icon="copy-outline" onPress={copy} />
            </>
          ) : (
            <Text style={[font.body, styles.notLive]}>This card isn’t live yet. Finish it on the web.</Text>
          )}
          <Button title="Close" variant="text" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>

      {showQr ? <FullScreenQr card={card} onClose={() => setShowQr(false)} /> : null}
    </Modal>
  );
}

/** Full-screen QR from short_url with the card name under it. */
function FullScreenQr({ card, onClose }: { card: DigitalCard; onClose: () => void }) {
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.full}>
        <View style={styles.qrBox} accessible accessibilityLabel={`QR code for ${card.short_url}`}>
          <CardQr url={card.short_url!} size={280} />
        </View>
        <Text style={[font.title, styles.center]}>{cardLabel(card)}</Text>
        <Text style={[font.small, styles.center]}>Scan to open the card</Text>
        <Button title="Done" variant="secondary" onPress={onClose} style={styles.done} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '85%' },
  content: { padding: spacing.xl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.sm },
  photo: { width: 56, height: 56, borderRadius: 28 },
  flex: { flex: 1 },
  notLive: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.warningSurface },
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.qrLight },
  qrBox: { padding: spacing.md, backgroundColor: colors.qrLight, borderRadius: radius.lg },
  center: { textAlign: 'center' },
  done: { alignSelf: 'stretch' },
});
