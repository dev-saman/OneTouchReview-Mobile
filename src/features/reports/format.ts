import { humanize } from '@/utils/format';

/** Follow-up rates are percents; null with fewer than 10 sends shows "–". */
export const rateLabel = (rate: number | null | undefined) =>
  typeof rate === 'number' ? `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%` : '–';

/** sms → Text, email → Email, anything else readable. */
export const channelName = (channel: string) => (channel === 'sms' ? 'Text' : channel === 'email' ? 'Email' : humanize(channel));

/** Step 0 is the first message; later steps are follow-ups. */
export const stepName = (step: number) => (step === 0 ? 'First message' : `Follow-up ${step}`);

/** Confidence for attributed reviews (high / medium / low). */
export const confidenceLabel = (confidence: string | null) =>
  confidence === 'high' ? 'Very likely' : confidence === 'medium' ? 'Likely' : confidence === 'low' ? 'Possibly' : null;
