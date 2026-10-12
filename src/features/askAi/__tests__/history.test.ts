import { buildHistory, usableLinks } from '../history';

describe('buildHistory', () => {
  it('turns answered questions into user / assistant turns', () => {
    expect(buildHistory([{ question: 'How many reviews?', answer: 'Two.' }])).toEqual([
      { role: 'user', content: 'How many reviews?' },
      { role: 'assistant', content: 'Two.' },
    ]);
  });

  it('keeps the last 6 turns and skips unanswered questions', () => {
    const exchanges: { question: string; answer: string | null }[] = [1, 2, 3, 4].map((n) => ({ question: `Q${n}`, answer: `A${n}` }));
    exchanges.splice(2, 0, { question: 'failed', answer: null });
    expect(buildHistory(exchanges).map((t) => t.content)).toEqual(['Q2', 'A2', 'Q3', 'A3', 'Q4', 'A4']);
  });

  it('cuts content to 2,000 characters', () => {
    const [user] = buildHistory([{ question: 'x'.repeat(2500), answer: 'ok' }]);
    expect(user.content).toHaveLength(2000);
  });
});

describe('usableLinks', () => {
  it('keeps relative web-app paths with a label, up to 4', () => {
    const links = [1, 2, 3, 4, 5].map((n) => ({ label: `L${n}`, path: `/reviews/${n}` }));
    expect(usableLinks(links)).toHaveLength(4);
  });

  it('drops billing pages, absolute or protocol-relative URLs and empty labels', () => {
    expect(
      usableLinks([
        { label: 'Plans', path: '/settings/billing' },
        { label: 'Elsewhere', path: 'https://example.com' },
        { label: 'Sneaky', path: '//example.com' },
        { label: ' ', path: '/reviews' },
        { label: 'Reviews', path: '/reviews' },
      ]),
    ).toEqual([{ label: 'Reviews', path: '/reviews' }]);
  });
});
