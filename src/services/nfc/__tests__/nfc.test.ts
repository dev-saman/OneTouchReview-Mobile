import NfcManager from 'react-native-nfc-manager';

import { cancelWrite, writeUriToTag } from '../nfc';

jest.mock('react-native-nfc-manager', () => {
  const manager = {
    isSupported: jest.fn(async () => true),
    start: jest.fn(async () => {}),
    isEnabled: jest.fn(async () => true),
    requestTechnology: jest.fn(async () => 'Ndef'),
    cancelTechnologyRequest: jest.fn(async () => {}),
    setAlertMessageIOS: jest.fn(async () => {}),
    goToNfcSetting: jest.fn(async () => true),
    ndefHandler: { writeNdefMessage: jest.fn(async () => {}) },
  };
  return {
    __esModule: true,
    default: manager,
    NfcTech: { Ndef: 'Ndef' },
    Ndef: {
      uriRecord: jest.fn((uri: string) => ({ uri })),
      encodeMessage: jest.fn((records: unknown[]) => [records.length]),
    },
  };
});

const nfc = NfcManager as unknown as {
  requestTechnology: jest.Mock;
  cancelTechnologyRequest: jest.Mock;
  ndefHandler: { writeNdefMessage: jest.Mock };
};
const { Ndef } = jest.requireMock('react-native-nfc-manager') as { Ndef: { uriRecord: jest.Mock } };

describe('writeUriToTag', () => {
  it('writes one URI record with the short url and cancels the request', async () => {
    await expect(writeUriToTag('https://card.vu/c/abc')).resolves.toEqual({ ok: true });
    expect(Ndef.uriRecord).toHaveBeenCalledWith('https://card.vu/c/abc');
    expect(nfc.ndefHandler.writeNdefMessage).toHaveBeenCalledTimes(1);
    expect(nfc.cancelTechnologyRequest).toHaveBeenCalled();
  });

  it('always cancels the technology request when writing fails', async () => {
    nfc.ndefHandler.writeNdefMessage.mockRejectedValueOnce(new Error('read-only tag'));
    await expect(writeUriToTag('https://card.vu/c/abc')).resolves.toEqual({ ok: false, cancelled: false });
    expect(nfc.cancelTechnologyRequest).toHaveBeenCalled();
  });

  it('reports a cancel by the user as cancelled', async () => {
    nfc.requestTechnology.mockImplementationOnce(async () => {
      cancelWrite();
      throw new Error('cancelled');
    });
    await expect(writeUriToTag('https://card.vu/c/abc')).resolves.toEqual({ ok: false, cancelled: true });
    expect(nfc.cancelTechnologyRequest).toHaveBeenCalled();
  });
});
