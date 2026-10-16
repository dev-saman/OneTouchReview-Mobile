import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, font, radius, spacing } from '@/constants/theme';
import { cancelWrite, nfcAvailability, openNfcSettings, writeUriToTag } from '@/services/nfc/nfc';

/** null while checking; false on phones without NFC (the button is hidden there). */
export function useHasNfc() {
  const [hasNfc, setHasNfc] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    nfcAvailability()
      .then((a) => active && setHasNfc(a !== 'unsupported'))
      .catch(() => active && setHasNfc(false));
    return () => {
      active = false;
    };
  }, []);
  return hasNfc;
}

/** Writes the link as an NDEF URI record. iPhone shows its own sheet; Android gets ours. */
export function NfcWriter({ url, title = 'Write to NFC card or sticker' }: { url: string; title?: string }) {
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
      <Button title={title} variant="secondary" icon="radio-outline" onPress={write} />
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

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
});
