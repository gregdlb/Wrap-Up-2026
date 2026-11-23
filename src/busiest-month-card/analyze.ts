export interface BusiestMonthCardWeek {
  /** Shown under the bar, e.g. "10/12". */
  label: string;
  value: number;
}

export interface BusiestMonthCardData {
  /** Visits for January..December. Exactly 12 numbers. */
  visitsPerMonth: number[];
  year: number;
  /** When provided, the card shows these weeks instead of the months (the "busiest week" variant). */
  weeks?: BusiestMonthCardWeek[];
}

export type BusiestMonthCardVariant = 'peak' | 'tie' | 'steady' | 'busiest_week';

export interface BusiestMonthCardBar {
  label: string;
  value: number;
  highlighted: boolean;
}

export interface BusiestMonthCardAnalysis {
  variant: BusiestMonthCardVariant;
  bars: BusiestMonthCardBar[];
  /** Indices of the bars that end up on brand-500. */
  highlighted: number[];
  /**
   * The bar the screen is about: its month drives the headline, the garland and the background.
   * With several equal maxima this is the latest one, as in the Figma "Tie" screen
   * (October in the headline, "same as July" in the body).
   */
  primaryIndex: number;
  /** The big number: the maximum, or the monthly average for `steady`. */
  value: number;
  /** What the big number counts. */
  unit: 'visits' | 'per_month';
  max: number;
  average: number;
}

export interface BusiestMonthCardAnalyzeOptions {
  /**
   * A year counts as `steady` when (max - min) / average is below this value.
   * Defaults to 0.22.
   */
  steadyThreshold?: number;
  /** Labels under the month bars, January first. Defaults to J F M A M J J A S O N D. */
  monthLabels?: string[];
}

export const MONTHS_IN_YEAR = 12;
export const DEFAULT_STEADY_THRESHOLD = 0.22;
export const DEFAULT_MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const MIN_WEEKS = 2;

function sanitize(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function indicesOfMax(values: number[], max: number): number[] {
  if (max <= 0) return [];
  return values.flatMap((value, index) => (value === max ? [index] : []));
}

/** Decides which variant of the card a user gets and which bars are highlighted. */
export function analyzeBusiestMonthCard(data: BusiestMonthCardData, options: BusiestMonthCardAnalyzeOptions = {}): BusiestMonthCardAnalysis {
  const { steadyThreshold = DEFAULT_STEADY_THRESHOLD, monthLabels = DEFAULT_MONTH_LABELS } = options;

  if (data.visitsPerMonth.length !== MONTHS_IN_YEAR) {
    throw new Error(`BusiestMonthCard: visitsPerMonth needs ${MONTHS_IN_YEAR} values, got ${data.visitsPerMonth.length}`);
  }

  const useWeeks = (data.weeks?.length ?? 0) >= MIN_WEEKS;
  const source = useWeeks
    ? data.weeks!.map(({ label, value }) => ({ label, value: sanitize(value) }))
    : data.visitsPerMonth.map((value, index) => ({ label: monthLabels[index] ?? '', value: sanitize(value) }));

  const values = source.map((bar) => bar.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const maxima = indicesOfMax(values, max);
  const primaryIndex = maxima.at(-1) ?? 0;

  let variant: BusiestMonthCardVariant;
  let highlighted = maxima;

  if (useWeeks) {
    variant = 'busiest_week';
  } else if (average === 0 || (max - min) / average < steadyThreshold) {
    variant = 'steady';
    highlighted = maxima.length > 0 ? [primaryIndex] : [];
  } else {
    variant = maxima.length > 1 ? 'tie' : 'peak';
  }

  return {
    variant,
    bars: source.map((bar, index) => ({ ...bar, highlighted: highlighted.includes(index) })),
    highlighted,
    primaryIndex,
    value: variant === 'steady' ? Math.round(average) : max,
    unit: variant === 'steady' ? 'per_month' : 'visits',
    max,
    average,
  };
}
