import { createCardShell, element, place } from '../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { addCounter, SCREEN_SECONDS } from '../shared/counter';
import { addBlankFlips } from '../shared/flips';
import { addPagesIn, createPages } from '../shared/pages';
import { ensureStyles } from '../shared/styles';
import { keepTogether } from '../shared/text';

export interface WeeksCardData {
  /** Length of the streak: weeks in a row with at least one visit. */
  weeksInARow: number;
  /** Weeks shown in the grid, e.g. 48 for January to November. */
  totalWeeks: number;
  /**
   * Optional, one entry per week of the grid: true when the week had a visit.
   * Weeks with visits outside the streak are then shown in the lighter color, and the streak sits on the
   * longest run of true values. Without it the streak is the last `weeksInARow` weeks and the rest is empty.
   */
  weeks?: boolean[];
}

export interface WeeksCardLabels {
  /** Unit next to the number when it is exactly 1. */
  week: string;
  weeks: string;
  /** Text of the pill. */
  legend: string;
  /** Under the first and the last column. Default: "Jan" and the month the last week falls in. */
  from: string;
  to: string;
}

export interface WeeksCardOptions extends WrapUpOptions {
  /** Locale for month names and number formatting. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<WeeksCardLabels>;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
  /** Replaces the generated screen reader description of the card. */
  ariaLabel?: string;
}

export interface WeeksCardController extends WrapUpController {
  /** Where the streak sits in the grid: 0-based index of its first and last week. */
  readonly streak: { start: number; end: number };
}

/** The Figma "Weeks card · torn page" frame. */
const FRAME = { width: 360, height: 350 };

/** Grid on the front page (214 x 236): 8 columns of 18 px squares, 22.5 px apart; 6 rows for 48 weeks. */
const GRID = { x: 19.25, y: 62, size: 18, pitch: 22.5, columns: 8, maxRows: 7, labelGap: 6 };

/**
 * Seconds from `play()`: the streak fills square by square and is done by 2.0 s.
 * It starts when the last blank sheet lifts off the page, so no square fills unseen.
 */
const TIMING = { fill: { at: 0.85, endAt: 2.0, duration: 0.25, maxStagger: 0.04 } };

const STYLES = /* css */ `
.wu-weeks-card__stat {
  position: absolute;
  left: calc(19.25 * var(--wu-u));
  top: calc(24 * var(--wu-u));
  display: flex;
  align-items: flex-start;
  gap: calc(8 * var(--wu-u));
  white-space: nowrap;
}

/* The unit follows the number as it counts; tabular digits keep it from jittering. */
.wu-weeks-card__value {
  color: var(--brand-500, #066e3d);
  font-size: calc(30 * var(--wu-u));
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: calc(39 * var(--wu-u));
}

.wu-weeks-card__unit {
  margin-top: calc(14 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(14 * var(--wu-u));
  font-weight: 500;
  line-height: calc(18 * var(--wu-u));
}

.wu-weeks-card__legend {
  position: absolute;
  right: calc(19.25 * var(--wu-u));
  top: calc(34 * var(--wu-u));
  padding: calc(3 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--olive-300, #dce7cf);
  color: var(--emerald-500, #023620);
  font-size: calc(11 * var(--wu-u));
  font-weight: 600;
  line-height: calc(14 * var(--wu-u));
  white-space: nowrap;
}

/* A week without a visit: an empty outlined square. */
.wu-weeks-card__week {
  box-sizing: border-box;
  border: calc(1.5 * var(--wu-u)) solid var(--wu-border, #d4d4d4);
  border-radius: calc(4 * var(--wu-u));
  background: var(--wu-card, #ffffff);
}

/* A week with a visit outside the streak. */
.wu-weeks-card__week--visited {
  border: 0;
  background: var(--olive-500, #d7e4c9);
}

/* The streak color, laid over the square when its turn comes. */
.wu-weeks-card__fill {
  position: absolute;
  inset: calc(-1.5 * var(--wu-u));
  border-radius: calc(4 * var(--wu-u));
  background: var(--brand-500, #066e3d);
  transform: scale(var(--wu-pop, 1));
}

.wu-weeks-card__week--visited .wu-weeks-card__fill {
  inset: 0;
}

.wu-weeks-card__month {
  position: absolute;
  top: calc(var(--y) * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(10 * var(--wu-u));
  font-weight: 500;
  line-height: calc(13 * var(--wu-u));
  white-space: nowrap;
}

.wu-weeks-card__month--from {
  left: calc(19.25 * var(--wu-u));
}

.wu-weeks-card__month--to {
  right: calc(19.25 * var(--wu-u));
}
`;

/** The longest run of weeks with a visit; the latest one when several are equally long. */
function longestRun(weeks: boolean[]): { start: number; end: number } | null {
  let best: { start: number; end: number } | null = null;
  let start = -1;
  weeks.forEach((visited, index) => {
    if (!visited) {
      start = -1;
      return;
    }
    if (start < 0) start = index;
    if (!best || index - start >= best.end - best.start) best = { start, end: index };
  });
  return best;
}

/** Short name of the month the grid's last week falls in, counting weeks from 1 January. */
function lastMonth(totalWeeks: number, locale: string): string {
  const midWeek = new Date(Date.UTC(2026, 0, totalWeeks * 7 - 3));
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(midWeek);
}

/**
 * Mounts the 07 "Weeks in a row" card into `el` and scales it to fit that element.
 * One square per week; the streak fills in the brand color, square by square.
 */
export function mountWeeksCard(el: HTMLElement, data: WeeksCardData, options: WeeksCardOptions = {}): WeeksCardController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale } = options;
  const totalWeeks = Math.min(Math.max(1, Math.round(data.totalWeeks)), GRID.columns * GRID.maxRows);
  const weeksInARow = Math.min(Math.max(0, Math.round(data.weeksInARow)), totalWeeks);
  const visited = Array.from({ length: totalWeeks }, (_, index) => data.weeks?.[index] === true);

  // The streak ends where the longest run of visited weeks ends, or at the last week of the grid.
  const end = (data.weeks && longestRun(visited)?.end) ?? totalWeeks - 1;
  const streak = { start: Math.max(0, end - weeksInARow + 1), end };
  const inStreak = (index: number) => weeksInARow > 0 && index >= streak.start && index <= streak.end;

  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value: number) => numberFormat.format(Math.round(value));
  const labels: WeeksCardLabels = {
    week: 'week',
    weeks: 'weeks',
    legend: '1 = 1 week',
    from: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 1))),
    to: lastMonth(totalWeeks, locale),
    ...options.labels,
  };
  const unit = weeksInARow === 1 ? labels.week : labels.weeks;

  ensureStyles('weeks-card', STYLES);
  const shell = createCardShell(el, {
    className: 'wu-weeks-card',
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? `${format(weeksInARow)} ${unit}`,
  });
  const pages = createPages(shell.stage);

  const value = element('wu-weeks-card__value', '0');
  const stat = element('wu-weeks-card__stat');
  stat.append(value, element('wu-weeks-card__unit', unit));
  pages.front.append(stat, element('wu-weeks-card__legend', keepTogether(labels.legend)));

  const fills: HTMLElement[] = [];
  for (let index = 0; index < totalWeeks; index++) {
    const column = index % GRID.columns;
    const row = Math.floor(index / GRID.columns);
    const box = { x: GRID.x + GRID.pitch * column, y: GRID.y + GRID.pitch * row, w: GRID.size, h: GRID.size };
    const week = place(element(`wu-weeks-card__week${visited[index] ? ' wu-weeks-card__week--visited' : ''}`), box);
    if (inStreak(index)) {
      const fill = element('wu-weeks-card__fill');
      week.append(fill);
      fills.push(fill);
    }
    pages.front.append(week);
  }

  const rows = Math.ceil(totalWeeks / GRID.columns);
  const monthsY = GRID.y + GRID.pitch * (rows - 1) + GRID.size + GRID.labelGap;
  for (const [side, text] of [['from', labels.from], ['to', labels.to]] as const) {
    const month = element(`wu-weeks-card__month wu-weeks-card__month--${side}`, text);
    month.style.setProperty('--y', String(monthsY));
    pages.front.append(month);
  }

  const timeline = holdTimeline(SCREEN_SECONDS);
  addPagesIn(timeline, pages);
  addBlankFlips(timeline, pages.front);
  const { at, endAt, duration, maxStagger } = TIMING.fill;
  const stagger = Math.min(maxStagger, (endAt - at - duration) / Math.max(1, fills.length - 1));
  if (fills.length > 0) {
    timeline
      .fromTo(fills, { '--wu-pop': 0.5 }, { '--wu-pop': 1, duration, ease: 'back.out(2)', stagger }, at)
      .fromTo(fills, { opacity: 0 }, { opacity: 1, duration: duration / 2, ease: 'power1.out', stagger }, at);
  }
  // The number runs with the squares: it reaches the streak length as the last square fills.
  addCounter(timeline, value, weeksInARow, {
    at,
    duration: Math.max(0.6, stagger * (fills.length - 1) + duration),
    format,
    ease: 'none',
  });

  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  const card = Object.defineProperty(controller, 'streak', { value: streak, enumerable: true }) as WeeksCardController;

  if (autoplay) card.play();
  return card;
}
