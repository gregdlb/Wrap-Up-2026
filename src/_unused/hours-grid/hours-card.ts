import { createCardShell, element, place } from '../../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../../shared/controller';
import { addCounter, SCREEN_SECONDS } from '../../shared/counter';
import { addPagesIn, createPages } from '../../shared/pages';
import { ensureStyles } from '../../shared/styles';

export interface HoursCardData {
  /** Hours of care in the year, counted in full 24 h days. */
  fullDays: number;
}

export interface HoursCardLabels {
  /** Unit next to the number when it is exactly 1. */
  day: string;
  days: string;
}

export interface HoursCardOptions extends WrapUpOptions {
  /** Locale for the weekday letters and number formatting. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<HoursCardLabels>;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
  /** Replaces the generated screen reader description of the card. */
  ariaLabel?: string;
}

export interface HoursCardController extends WrapUpController {
  /** Hours one square stands for: 24, or a multiple of it when there are more days than squares fit. */
  readonly hoursPerSquare: number;
}

const DEFAULT_LABELS: HoursCardLabels = { day: 'day', days: 'days' };

/** The Figma "Days card · torn page" frame. */
const FRAME = { width: 360, height: 350 };

/** Grid on the front page (214 x 236): 7 columns, at most 6 rows of 19 px squares, 24 px apart. */
const GRID = { x: 25.5, y: 76, size: 19, pitch: 24, columns: 7, rows: 6, lettersY: 59 };
const HOURS_PER_DAY = 24;

/** Seconds from `play()`: squares pop in one by one from 0.6 s, 20 ms apart; the number counts along. */
const TIMING = { squares: { at: 0.6, stagger: 0.02, duration: 0.3 } };

const STYLES = /* css */ `
.wu-hours-card__stat {
  position: absolute;
  left: calc(25.5 * var(--wu-u));
  top: calc(22 * var(--wu-u));
  display: flex;
  align-items: flex-start;
  gap: calc(7 * var(--wu-u));
  white-space: nowrap;
}

/* The hidden final value reserves the width, so the unit does not shift while the number counts. */
.wu-hours-card__value {
  display: grid;
  justify-items: start;
  color: var(--brand-500, #066e3d);
  font-size: calc(30 * var(--wu-u));
  font-weight: 700;
  line-height: calc(39 * var(--wu-u));
}

.wu-hours-card__value > * {
  grid-area: 1 / 1;
}

.wu-hours-card__value-final {
  visibility: hidden;
}

.wu-hours-card__unit {
  margin-top: calc(14 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(14 * var(--wu-u));
  font-weight: 500;
  line-height: calc(18 * var(--wu-u));
}

.wu-hours-card__legend {
  position: absolute;
  right: calc(25.5 * var(--wu-u));
  top: calc(32 * var(--wu-u));
  padding: calc(3 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--olive-300, #dce7cf);
  color: var(--emerald-500, #023620);
  font-size: calc(11 * var(--wu-u));
  font-weight: 600;
  line-height: calc(14 * var(--wu-u));
  white-space: nowrap;
}

.wu-hours-card__letter {
  color: var(--taupe-700, #6d615d);
  font-size: calc(10 * var(--wu-u));
  font-weight: 500;
  line-height: calc(13 * var(--wu-u));
  text-align: center;
}

.wu-hours-card__square {
  border-radius: calc(5 * var(--wu-u));
  background: var(--brand-500, #066e3d);
  transform: scale(var(--wu-pop, 1));
}
`;

/** Narrow weekday names, Monday first. */
function weekdayLetters(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
  // 5 January 2026 is a Monday.
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(Date.UTC(2026, 0, 5 + index))));
}

/**
 * Mounts the 04 "Hours" card into `el` and scales it to fit that element.
 * One square is one full day. When there are more days than the 42 squares that fit,
 * a square stands for 2, 3, … days and the legend says so ("1 = 48h").
 */
export function mountHoursCard(el: HTMLElement, data: HoursCardData, options: HoursCardOptions = {}): HoursCardController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const fullDays = Math.max(0, Math.round(data.fullDays));
  const capacity = GRID.columns * GRID.rows;
  const daysPerSquare = Math.max(1, Math.ceil(fullDays / capacity));
  const squareCount = Math.round(fullDays / daysPerSquare);
  const hoursPerSquare = daysPerSquare * HOURS_PER_DAY;

  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value: number) => numberFormat.format(Math.round(value));
  const unit = fullDays === 1 ? labels.day : labels.days;

  ensureStyles('hours-card', STYLES);
  const shell = createCardShell(el, {
    className: 'wu-hours-card',
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? `${format(fullDays)} ${unit}`,
  });
  const pages = createPages(shell.stage);

  const value = element('wu-hours-card__value-live', '0');
  const valueBox = element('wu-hours-card__value');
  valueBox.append(element('wu-hours-card__value-final', format(fullDays)), value);
  const stat = element('wu-hours-card__stat');
  stat.append(valueBox, element('wu-hours-card__unit', unit));
  pages.front.append(stat, element('wu-hours-card__legend', `1 = ${hoursPerSquare}h`));

  weekdayLetters(locale).forEach((letter, column) => {
    const box = { x: GRID.x + GRID.pitch * column, y: GRID.lettersY, w: GRID.size, h: 13 };
    pages.front.append(place(element('wu-hours-card__letter', letter), box));
  });
  const squares = Array.from({ length: squareCount }, (_, index) => {
    const column = index % GRID.columns;
    const row = Math.floor(index / GRID.columns);
    const box = { x: GRID.x + GRID.pitch * column, y: GRID.y + GRID.pitch * row, w: GRID.size, h: GRID.size };
    return place(element('wu-hours-card__square'), box);
  });
  pages.front.append(...squares);

  const timeline = holdTimeline(SCREEN_SECONDS);
  addPagesIn(timeline, pages);
  const { at, stagger, duration } = TIMING.squares;
  if (squares.length > 0) {
    timeline
      .fromTo(squares, { '--wu-pop': 0.4 }, { '--wu-pop': 1, duration, ease: 'back.out(2)', stagger }, at)
      .fromTo(squares, { opacity: 0 }, { opacity: 1, duration: duration / 2, ease: 'power1.out', stagger }, at);
  }
  // The number runs with the squares: it reaches the total as the last square lands.
  addCounter(timeline, value, fullDays, {
    at,
    duration: Math.max(0.6, stagger * (squares.length - 1) + duration),
    format,
    ease: 'none',
  });

  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  const card = Object.defineProperty(controller, 'hoursPerSquare', {
    value: hoursPerSquare,
    enumerable: true,
  }) as HoursCardController;

  if (autoplay) card.play();
  return card;
}
