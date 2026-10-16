import QRCode from 'react-native-qrcode-svg';

import { colors } from '@/constants/theme';

const QR_LOGO = require('../../../assets/images/brand-mark.png');

/** The card's QR code, drawn in the app from short_url, with the brand mark in the middle. */
export function CardQr({ url, size }: { url: string; size: number }) {
  const logo = Math.round(size / 5);
  return (
    // ecl H: the logo covers part of the code; high error correction keeps it scannable.
    <QRCode
      value={url}
      size={size}
      backgroundColor={colors.qrLight}
      color={colors.qrDark}
      ecl="H"
      quietZone={10}
      logo={QR_LOGO}
      logoSize={logo}
      logoBackgroundColor={colors.qrLight}
      logoMargin={4}
      logoBorderRadius={8}
    />
  );
}
