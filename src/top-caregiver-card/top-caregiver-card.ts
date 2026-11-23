import { createCardShell, element, place } from '../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { addCounter, SCREEN_SECONDS } from '../shared/counter';
import { addPagesIn, createPages } from '../shared/pages';
import { ensureStyles } from '../shared/styles';

export interface TopCaregiverCardData {
  /** The caregiver is in the top this-many percent, by hours of care: 10 for "Top 10%". */
  topPercent: number;
  /**
   * Optional: how many caregivers fall into each band of hours, from fewest to most hours.
   * Any positive numbers; the tallest bar is scaled to the chart. Defaults to the curve drawn in Figma (20 bars).
   */
  distribution?: number[];
}

export interface TopCaregiverCardLabels {
  /** Word before the percentage. */
  top: string;
  /** Pill next to it. */
  chip: string;
  /** Under the left and right ends of the chart. */
  fewer: string;
  more: string;
  /** The pin. */
  you: string;
}

export interface TopCaregiverCardOptions extends WrapUpOptions {
  /** Locale for number formatting. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<TopCaregiverCardLabels>;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
  /** Replaces the generated screen reader description of the card. */
  ariaLabel?: string;
}

export interface TopCaregiverCardController extends WrapUpController {
  /** Number of bars on the right that are highlighted as the top group. */
  readonly topBars: number;
}

const DEFAULT_LABELS: TopCaregiverCardLabels = {
  top: 'Top',
  chip: 'by hours',
  fewer: 'Fewer hours',
  more: 'More hours',
  you: 'You',
};

/** The Figma "Rank card" frame. */
const FRAME = { width: 360, height: 350 };

/** Bar heights of the 20 bars drawn in Figma. */
const FIGMA_DISTRIBUTION = [17, 28, 42, 59, 76, 87, 92, 90, 81, 71, 62, 53, 46, 39, 34, 29, 25, 22, 31, 25];

/** Chart on the front page (214 x 236): bars stand on y = 197, 7 px wide and 2 px apart when there are 20. */
const CHART = { x: 16, baseline: 197, span: 178, gapRatio: 2 / 7, maxBarHeight: 92, minBarHeight: 2 };
/** The pin: a pill 34 px above the bar with a line down to it; the pill's centre stays between minX and maxX. */
const PIN = { pillAbove: 34, lineWidth: 1.5, minX: 32, maxX: 182 };

/**
 * Seconds from `play()`: bars grow from 0.8 s, the number counts down from 100 % until 2.0 s,
 * then the top bars turn brand-500 and the pin drops in with a bounce, done by 2.5 s.
 */
const TIMING = {
  bars: { at: 0.8, duration: 0.6, endAt: 2.0 },
  counter: { at: 0.8, duration: 1.2 },
  chip: { at: 1.0, duration: 0.2 },
  highlight: { at: 2.0, duration: 0.2 },
  pin: { at: 2.05, duration: 0.45, dropFrom: -28 },
};

const STYLES = /* css */ `
.wu-top-caregiver-card__value {
  position: absolute;
  left: calc(16 * var(--wu-u));
  top: calc(21 * var(--wu-u));
  color: var(--brand-500, #066e3d);
  font-size: calc(30 * var(--wu-u));
  font-weight: 800;
  line-height: calc(39 * var(--wu-u));
  white-space: nowrap;
}

.wu-top-caregiver-card__chip {
  position: absolute;
  right: calc(16 * var(--wu-u));
  top: calc(31 * var(--wu-u));
  padding: calc(3 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--olive-300, #dce7cf);
  color: var(--emerald-500, #023620);
  font-size: calc(11 * var(--wu-u));
  font-weight: 600;
  line-height: calc(14 * var(--wu-u));
  white-space: nowrap;
}

/* --x, --w place a bar; --h is its final height and --wu-p how much of it has grown. */
.wu-top-caregiver-card__bar {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  bottom: calc(39.029 * var(--wu-u));
  width: calc(var(--w) * var(--wu-u));
  height: calc(var(--h) * var(--wu-p, 1) * var(--wu-u));
  overflow: hidden;
  border-radius: calc(2 * var(--wu-u));
  background: var(--olive-300, #dce7cf);
}

.wu-top-caregiver-card__bar-highlight {
  position: absolute;
  inset: 0;
  background: var(--brand-500, #066e3d);
}

.wu-top-caregiver-card__pin {
  transform: translate3d(0, calc(var(--wu-y, 0) * var(--wu-u)), 0);
}

.wu-top-caregiver-card__pin-pill {
  position: absolute;
  left: calc(var(--pill-x) * var(--wu-u));
  top: 0;
  padding: calc(3 * var(--wu-u)) calc(8 * var(--wu-u));
  border-radius: 999px;
  background: var(--emerald-500, #023620);
  color: var(--olive-500, #d7e4c9);
  font-size: calc(11 * var(--wu-u));
  font-weight: 600;
  line-height: calc(14 * var(--wu-u));
  white-space: nowrap;
  transform: translateX(-50%);
}

.wu-top-caregiver-card__pin-line {
  position: absolute;
  left: calc(var(--line-x) * var(--wu-u));
  top: calc(21 * var(--wu-u));
  width: calc(1.5 * var(--wu-u));
  height: calc(12 * var(--wu-u));
  background: var(--emerald-500, #023620);
}

.wu-top-caregiver-card__axis {
  position: absolute;
  top: calc(203 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(10 * var(--wu-u));
  font-weight: 500;
  line-height: calc(13 * var(--wu-u));
  white-space: nowrap;
}

.wu-top-caregiver-card__axis--fewer {
  left: calc(16 * var(--wu-u));
}

.wu-top-caregiver-card__axis--more {
  right: calc(16 * var(--wu-u));
}
`;

/**
 * Mounts the 10 "Top caregiver" rank card into `el` and scales it to fit that element.
 * A chart of all caregivers by hours; the bars of the caregiver's top group turn brand-500 and get the "You" pin.
 */
export function mountTopCaregiverCard(
  el: HTMLElement,
  data: TopCaregiverCardData,
  options: TopCaregiverCardOptions = {},
): TopCaregiverCardController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const topPercent = Math.min(Math.max(Math.round(data.topPercent), 1), 100);
  const values = (data.distribution?.length ? data.distribution : FIGMA_DISTRIBUTION).map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0,
  );
  const count = values.length;
  const topBars = Math.min(Math.max(Math.round((count * topPercent) / 100), 1), count);
  const firstTop = count - topBars;

  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  // A no-break space: "Top" and its number stay on one line.
  const format = (value: number) => `${labels.top}\u00a0${numberFormat.format(Math.round(value))}%`;

  ensureStyles('top-caregiver-card', STYLES);
  const shell = createCardShell(el, {
    className: 'wu-top-caregiver-card',
    frame: FRAME,
    maxScale,
    ariaLabel: options.ariaLabel ?? `${labels.top} ${numberFormat.format(topPercent)}% ${labels.chip}`,
  });
  const pages = createPages(shell.stage);

  const value = element('wu-top-caregiver-card__value', format(100));
  const chip = element('wu-top-caregiver-card__chip', labels.chip);
  pages.front.append(value, chip);

  const barWidth = CHART.span / (count + (count - 1) * CHART.gapRatio);
  const pitch = barWidth * (1 + CHART.gapRatio);
  const tallest = Math.max(...values, 1);
  const heights = values.map((bar) => Math.max(CHART.minBarHeight, Math.round((CHART.maxBarHeight * bar) / tallest)));
  const highlights: HTMLElement[] = [];
  const bars = heights.map((height, index) => {
    const bar = element('wu-top-caregiver-card__bar');
    bar.style.setProperty('--x', String(CHART.x + pitch * index));
    bar.style.setProperty('--w', String(barWidth));
    bar.style.setProperty('--h', String(height));
    if (index >= firstTop) {
      const highlight = element('wu-top-caregiver-card__bar-highlight');
      bar.append(highlight);
      highlights.push(highlight);
    }
    return bar;
  });
  pages.front.append(...bars);

  // The pin stands on the first bar of the top group; its pill stays inside the page.
  const pinX = CHART.x + pitch * firstTop + barWidth / 2;
  const pinTop = CHART.baseline - heights[firstTop]! - PIN.pillAbove;
  const pin = place(element('wu-top-caregiver-card__pin'), { x: 0, y: pinTop, w: FRAME.width, h: PIN.pillAbove });
  const pill = element('wu-top-caregiver-card__pin-pill', labels.you);
  pill.style.setProperty('--pill-x', String(Math.min(Math.max(pinX, PIN.minX), PIN.maxX)));
  const line = element('wu-top-caregiver-card__pin-line');
  line.style.setProperty('--line-x', String(pinX - PIN.lineWidth / 2));
  pin.append(pill, line);
  pages.front.append(
    pin,
    element('wu-top-caregiver-card__axis wu-top-caregiver-card__axis--fewer', labels.fewer),
    element('wu-top-caregiver-card__axis wu-top-caregiver-card__axis--more', labels.more),
  );

  const timeline = holdTimeline(SCREEN_SECONDS);
  addPagesIn(timeline, pages);
  const stagger = (TIMING.bars.endAt - TIMING.bars.at - TIMING.bars.duration) / Math.max(1, count - 1);
  timeline
    .fromTo(
      bars,
      { '--wu-p': 0 },
      { '--wu-p': 1, duration: TIMING.bars.duration, ease: 'power2.out', stagger },
      TIMING.bars.at,
    )
    .fromTo(chip, { opacity: 0 }, { opacity: 1, duration: TIMING.chip.duration, ease: 'power1.out' }, TIMING.chip.at)
    .fromTo(
      highlights,
      { opacity: 0 },
      { opacity: 1, duration: TIMING.highlight.duration, ease: 'power1.out' },
      TIMING.highlight.at,
    )
    .fromTo(
      pin,
      { '--wu-y': TIMING.pin.dropFrom },
      { '--wu-y': 0, duration: TIMING.pin.duration, ease: 'bounce.out' },
      TIMING.pin.at,
    )
    .fromTo(pin, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power1.out' }, TIMING.pin.at);
  // The number counts down: from everyone (100 %) to the caregiver's group.
  addCounter(timeline, value, topPercent, { ...TIMING.counter, from: 100, format, ease: 'power2.out' });

  const controller = createController({ timeline, onComplete, onDestroy: shell.remove });
  const card = Object.defineProperty(controller, 'topBars', {
    value: topBars,
    enumerable: true,
  }) as TopCaregiverCardController;

  if (autoplay) card.play();
  return card;
}
