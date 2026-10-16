import { changeFirst, makesHours247, needsRiskConfirm, riskWarning } from '../rules';

describe('Google profile approval rules', () => {
  it('asks to confirm careful and risky changes only', () => {
    expect(needsRiskConfirm({ risk: 'safe' })).toBe(false);
    expect(needsRiskConfirm({ risk: 'careful' })).toBe(true);
    expect(needsRiskConfirm({ risk: 'risky' })).toBe(true);
    expect(needsRiskConfirm({})).toBe(false);
    expect(riskWarning({ risk: 'risky', field_label: 'Main category' })).toContain('main category');
  });

  it('spots hours changes that make the business open 24/7', () => {
    expect(makesHours247({ field: 'hours', field_label: 'Hours', after_text: 'Open 24 hours, every day' })).toBe(true);
    expect(makesHours247({ field_label: 'Opening hours', after_text: 'Mon–Sun 24/7' })).toBe(true);
    expect(makesHours247({ field: 'hours', field_label: 'Hours', after_text: 'Mon–Fri 9 AM – 5 PM' })).toBe(false);
    expect(makesHours247({ field: 'description', field_label: 'Description', after_text: 'Support 24/7' })).toBe(false);
  });

  it('puts the named change on top', () => {
    const list = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(changeFirst(list, 3).map((c) => c.id)).toEqual([3, 1, 2]);
    expect(changeFirst(list, 9)).toBe(list);
    expect(changeFirst(list, null)).toBe(list);
  });
});
