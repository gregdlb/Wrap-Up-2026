import type { BusiestMonthCardData, BusiestMonthCardWeek } from '../src';

/** Generators of sample users for the demo switches. */
export const YEAR = 2026;
const WEEK_COUNT = 8;
const MS_PER_DAY = 86_400_000;

const MONTH_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

export interface SampleWeeks {
  weeks: BusiestMonthCardWeek[];
  /** Month of the busiest week, for the screen's theme. */
  monthIndex: number;
  /** Headline form of the busiest week, e.g. "Oct 12–18". */
  range: string;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function randomMonthIndex(): number {
  return randomInt(0, 11);
}

/** One clear busiest month. */
export function peakYear(monthIndex: number): number[] {
  const visits = Array.from({ length: 12 }, () => randomInt(14, 26));
  visits[monthIndex] = Math.max(...visits) + randomInt(5, 12);
  return visits;
}

/** Two months share the maximum: `monthIndex` and the month three earlier (October + July in Figma). */
export function tieYear(monthIndex: number): number[] {
  const visits = peakYear(monthIndex);
  const partner = monthIndex >= 3 ? monthIndex - 3 : monthIndex + 3;
  visits[partner] = visits[monthIndex]!;
  return visits;
}

/** Nearly the same number of visits every month. */
export function steadyYear(): number[] {
  return Array.from({ length: 12 }, () => randomInt(20, 24));
}

function formatRange(start: Date): string {
  const end = new Date(start.getTime() + 6 * MS_PER_DAY);
  const startMonth = MONTH_SHORT.format(start);
  const endMonth = MONTH_SHORT.format(end);
  const endLabel = startMonth === endMonth ? String(end.getUTCDate()) : `${endMonth} ${end.getUTCDate()}`;
  return `${startMonth} ${start.getUTCDate()}–${endLabel}`;
}

/** Eight Monday-based weeks; the busiest is the second full week of the month, third bar from the left. */
export function weeksAround(monthIndex: number): SampleWeeks {
  const firstOfMonth = new Date(Date.UTC(YEAR, monthIndex, 1));
  const daysToMonday = (8 - firstOfMonth.getUTCDay()) % 7;
  const busiest = new Date(firstOfMonth.getTime() + (daysToMonday + 7) * MS_PER_DAY);
  const busiestIndex = 2;

  const weeks = Array.from({ length: WEEK_COUNT }, (_, index) => {
    const start = new Date(busiest.getTime() + (index - busiestIndex) * 7 * MS_PER_DAY);
    return {
      label: `${start.getUTCMonth() + 1}/${start.getUTCDate()}`,
      value: index === busiestIndex ? randomInt(9, 11) : randomInt(4, 8),
    };
  });

  return { weeks, monthIndex, range: formatRange(busiest) };
}

export function toData(visitsPerMonth: number[], weeks?: BusiestMonthCardWeek[]): BusiestMonthCardData {
  return weeks ? { visitsPerMonth, year: YEAR, weeks } : { visitsPerMonth, year: YEAR };
}
