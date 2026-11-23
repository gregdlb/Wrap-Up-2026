import { describe, expect, test } from 'bun:test';
import { analyzeBusiestMonthCard } from './analyze';

const PEAK_OCTOBER = [14, 17, 19, 21, 20, 22, 23, 23, 21, 33, 18, 17];

describe('analyzeBusiestMonthCard', () => {
  test('single maximum is a peak', () => {
    const result = analyzeBusiestMonthCard({ visitsPerMonth: PEAK_OCTOBER, year: 2026 });

    expect(result.variant).toBe('peak');
    expect(result.highlighted).toEqual([9]);
    expect(result.primaryIndex).toBe(9);
    expect(result.value).toBe(33);
    expect(result.unit).toBe('visits');
    expect(result.bars[9]).toEqual({ label: 'O', value: 33, highlighted: true });
  });

  test('two equal maxima are a tie, the later month is primary', () => {
    const visits = [...PEAK_OCTOBER];
    visits[6] = 33;
    const result = analyzeBusiestMonthCard({ visitsPerMonth: visits, year: 2026 });

    expect(result.variant).toBe('tie');
    expect(result.highlighted).toEqual([6, 9]);
    expect(result.primaryIndex).toBe(9);
    expect(result.value).toBe(33);
  });

  test('small spread is steady and shows the rounded monthly average', () => {
    const result = analyzeBusiestMonthCard({ visitsPerMonth: [21, 23, 22, 20, 24, 22, 21, 23, 22, 24, 22, 21], year: 2026 });

    expect(result.variant).toBe('steady');
    expect(result.value).toBe(22);
    expect(result.unit).toBe('per_month');
    expect(result.highlighted).toEqual([9]);
  });

  test('steady threshold is configurable', () => {
    const visits = [21, 23, 22, 20, 24, 22, 21, 23, 22, 24, 22, 21];

    expect(analyzeBusiestMonthCard({ visitsPerMonth: visits, year: 2026 }, { steadyThreshold: 0.1 }).variant).toBe('tie');
  });

  test('weeks switch to the busiest week variant', () => {
    const weeks = [4, 6, 9, 7, 6, 8, 7, 5].map((value, index) => ({ label: `w${index}`, value }));
    const result = analyzeBusiestMonthCard({ visitsPerMonth: PEAK_OCTOBER, year: 2026, weeks });

    expect(result.variant).toBe('busiest_week');
    expect(result.bars).toHaveLength(8);
    expect(result.highlighted).toEqual([2]);
    expect(result.value).toBe(9);
    expect(result.unit).toBe('visits');
  });

  test('a year without visits highlights nothing', () => {
    const result = analyzeBusiestMonthCard({ visitsPerMonth: new Array(12).fill(0), year: 2026 });

    expect(result.variant).toBe('steady');
    expect(result.highlighted).toEqual([]);
    expect(result.value).toBe(0);
  });

  test('invalid values count as zero', () => {
    const visits = [...PEAK_OCTOBER];
    visits[0] = Number.NaN;
    visits[1] = -4;
    const result = analyzeBusiestMonthCard({ visitsPerMonth: visits, year: 2026 });

    expect(result.bars[0]?.value).toBe(0);
    expect(result.bars[1]?.value).toBe(0);
  });

  test('rejects a year that is not 12 months long', () => {
    expect(() => analyzeBusiestMonthCard({ visitsPerMonth: [1, 2, 3], year: 2026 })).toThrow('needs 12 values');
  });
});
