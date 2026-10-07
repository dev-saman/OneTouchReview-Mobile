import { Platform } from 'react-native';
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';

export type NfcAvailability = 'ready' | 'unsupported' | 'disabled';

export type WriteResult = { ok: true } | { ok: false; cancelled: boolean };

let started = false;

/** Whether this phone can write tags right now. */
export async function nfcAvailability(): Promise<NfcAvailability> {
  try {
    if (!(await NfcManager.isSupported())) return 'unsupported';
    if (!started) {
      await NfcManager.start();
      started = true;
    }
    // isEnabled is Android-only in practice; iPhones have no NFC switch.
    if (Platform.OS === 'android' && !(await NfcManager.isEnabled())) return 'disabled';
    return 'ready';
  } catch {
    return 'unsupported';
  }
}

/** Opens Android's NFC settings (no-op elsewhere). */
export function openNfcSettings() {
  if (Platform.OS === 'android') NfcManager.goToNfcSetting().catch(() => {});
}

let cancelledByUser = false;

/**
 * Writes one NDEF URI record (the card's short_url) to a blank NFC card or sticker.
 * The technology request is ALWAYS cancelled afterwards (CLAUDE.md), success or not.
 * Never logs the tag or the URL.
 */
export async function writeUriToTag(url: string): Promise<WriteResult> {
  cancelledByUser = false;
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: 'Hold the top of your iPhone near the NFC card or sticker.',
    });
    const bytes = Ndef.encodeMessage([Ndef.uriRecord(url)]);
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
    if (Platform.OS === 'ios') await NfcManager.setAlertMessageIOS('Done. Your card link is on the tag.');
    return { ok: true };
  } catch {
    // Cancelled sheets and unwritable tags both land here; the screen words them.
    return { ok: false, cancelled: cancelledByUser };
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

/** The user tapped Cancel in the app's own "hold near" dialog (Android). */
export function cancelWrite() {
  cancelledByUser = true;
  NfcManager.cancelTechnologyRequest().catch(() => {});
}
