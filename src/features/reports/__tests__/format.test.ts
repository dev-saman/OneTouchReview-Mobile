import { channelName, confidenceLabel, rateLabel, stepName } from '../format';

describe('report formatting', () => {
  it('shows rates as percents, "–" when there were too few sends', () => {
    expect(rateLabel(25)).toBe('25%');
    expect(rateLabel(33.333)).toBe('33.3%');
    expect(rateLabel(null)).toBe('–');
  });

  it('names channels, steps and confidence in plain words', () => {
    expect(channelName('sms')).toBe('Text');
    expect(channelName('email')).toBe('Email');
    expect(channelName('whats_app')).toBe('Whats app');
    expect(stepName(0)).toBe('First message');
    expect(stepName(2)).toBe('Follow-up 2');
    expect(confidenceLabel('high')).toBe('Very likely');
    expect(confidenceLabel(null)).toBeNull();
  });
});
