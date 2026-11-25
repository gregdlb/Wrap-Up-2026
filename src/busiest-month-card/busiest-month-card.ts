import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { containScale, DEFAULT_MAX_SCALE, observeSize } from '../shared/fit';
import { MONTHS_CARD_FRAME } from '../shared/screen-05';
import { addBlankFlips } from '../shared/flips';
import { ensureStyles } from '../shared/styles';
import {
  analyzeBusiestMonthCard,
  MONTHS_IN_YEAR,
  type BusiestMonthCardAnalysis,
  type BusiestMonthCardData,
  type BusiestMonthCardVariant,
} from './analyze';
import { BUSIEST_MONTH_CARD_STYLES } from './styles';

export interface BusiestMonthCardLabels {
  /** Unit next to the number when it is exactly 1. */
  visit: string;
  visits: string;
  /** Unit of the `steady` variant, where the number is a monthly average. */
  perMonth: string;
}

export interface BusiestMonthCardOptions extends WrapUpOptions {
  /** See `BusiestMonthCardAnalyzeOptions.steadyThreshold`. */
  steadyThreshold?: number;
  /** Locale for the month letters and number formatting. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<BusiestMonthCardLabels>;
  /** Replaces the generated screen reader description of the card. */
  ariaLabel?: string;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
}

export interface BusiestMonthCardController extends WrapUpController {
  /** Variant and highlighted bars computed from the data, for the host's headline, copy and illustration. */
  readonly analysis: BusiestMonthCardAnalysis;
}

const DEFAULT_LABELS: BusiestMonthCardLabels = { visit: 'visit', visits: 'visits', perMonth: 'a month' };

/**
 * Seconds from `play()`. The screen lasts 6 s: pages come in at 0.4–1.0, bars and counter are done by 2.5,
 * the busiest bar is highlighted by 2.8, then the card holds until the screen ends.
 */
const TIMING = {
  screen: 6,
  pages: { at: 0.4, duration: 0.48, stagger: 0.06, offsetY: 24 },
  // Bars and counter start when the last blank sheet has turned see-through.
  bars: { at: 1.05, endAt: 2.5, stagger: 0.04, minDuration: 0.3 },
  counter: { at: 1.05, endAt: 2.5 },
  highlight: { at: 2.5, duration: 0.3, overshoot: 1.06 },
};

/** Chart geometry in Figma units, relative to the front page (214 x 236.029). */
const CHART = {
  maxBarHeight: 110,
  minBarHeight: 2,
  month: { firstX: 16.25, barWidth: 11, pitch: 15.5 },
  week: { firstX: 16, span: 184, gapRatio: 0.5 },
};

interface BarSlot {
  x: number;
  width: number;
}

interface BusiestMonthCardView {
  root: HTMLElement;
  /** Front page first: it leads the entrance, the back pages follow. */
  pages: HTMLElement[];
  value: HTMLElement;
  bars: HTMLElement[];
  highlightedBars: HTMLElement[];
  barHighlights: HTMLElement[];
  labelTexts: HTMLElement[];
  labelHighlights: HTMLElement[];
}

function element(className: string, text?: string): HTMLElement {
  const node = document.createElement('div');
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function monthNames(locale: string, width: 'narrow' | 'long'): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: width, timeZone: 'UTC' });
  return Array.from({ length: MONTHS_IN_YEAR }, (_, month) => format.format(new Date(Date.UTC(2026, month, 1))));
}

function layoutBars(count: number, variant: BusiestMonthCardVariant): BarSlot[] {
  if (variant !== 'busiest_week') {
    const { firstX, barWidth, pitch } = CHART.month;
    return Array.from({ length: count }, (_, index) => ({ x: firstX + pitch * index, width: barWidth }));
  }
  const { firstX, span, gapRatio } = CHART.week;
  const width = span / (count + (count - 1) * gapRatio);
  return Array.from({ length: count }, (_, index) => ({ x: firstX + width * (1 + gapRatio) * index, width }));
}

/** Bar height in Figma units. It depends on the data only: the tallest bar is always `maxBarHeight`. */
function barHeight(value: number, max: number): number {
  if (value <= 0 || max <= 0) return CHART.minBarHeight;
  return Math.max(CHART.minBarHeight, Math.round((CHART.maxBarHeight * value) / max));
}

/**
 * Week labels are wider than the bar pitch, so only some fit: the highlighted ones always,
 * the rest when neither neighbour is labelled (every other label in the Figma screen).
 */
function visibleWeekLabels(count: number, highlighted: number[]): Set<number> {
  const visible = new Set(highlighted);
  for (let index = 0; index < count; index++) {
    if (!visible.has(index - 1) && !visible.has(index + 1)) visible.add(index);
  }
  return visible;
}

function describe(
  analysis: BusiestMonthCardAnalysis,
  data: BusiestMonthCardData,
  unit: string,
  value: string,
  locale: string,
): string {
  const summary = `${data.year}: ${value} ${unit}`;
  if (analysis.variant === 'steady' || analysis.highlighted.length === 0) return summary;
  const fullMonthNames = analysis.variant === 'busiest_week' ? null : monthNames(locale, 'long');
  const names = analysis.highlighted.map((index) => fullMonthNames?.[index] ?? analysis.bars[index]?.label ?? '');
  return `${names.join(', ')}, ${summary}`;
}

function render(analysis: BusiestMonthCardAnalysis, data: BusiestMonthCardData, unit: string): BusiestMonthCardView {
  const root = element('wu-busiest-month-card');
  root.dataset.variant = analysis.variant;
  root.setAttribute('role', 'img');

  const stage = element('wu-busiest-month-card__stage');
  const back = element('wu-busiest-month-card__page wu-busiest-month-card__page--back');
  const middle = element('wu-busiest-month-card__page wu-busiest-month-card__page--middle');
  const front = element('wu-busiest-month-card__page wu-busiest-month-card__page--front');

  const stat = element('wu-busiest-month-card__stat');
  const value = element('wu-busiest-month-card__value', '0');
  stat.append(value, element('wu-busiest-month-card__unit', unit));
  front.append(stat, element('wu-busiest-month-card__year', String(data.year)));

  const view: BusiestMonthCardView = {
    root,
    pages: [front, middle, back],
    value,
    bars: [],
    highlightedBars: [],
    barHighlights: [],
    labelTexts: [],
    labelHighlights: [],
  };

  const slots = layoutBars(analysis.bars.length, analysis.variant);
  const labelled =
    analysis.variant === 'busiest_week' ? visibleWeekLabels(analysis.bars.length, analysis.highlighted) : null;

  analysis.bars.forEach((bar, index) => {
    const slot = slots[index]!;
    const column = element('wu-busiest-month-card__column');
    column.style.setProperty('--wu-x', String(slot.x));
    column.style.setProperty('--wu-w', String(slot.width));
    column.style.setProperty('--wu-h', String(barHeight(bar.value, analysis.max)));

    const barNode = element('wu-busiest-month-card__bar');
    column.append(barNode);
    view.bars.push(barNode);

    const showLabel = labelled === null || labelled.has(index);
    const label = showLabel ? element('wu-busiest-month-card__label') : null;
    const labelText = label ? element('wu-busiest-month-card__label-text', bar.label) : null;
    if (label && labelText) {
      label.append(labelText);
      column.append(label);
    }

    if (bar.highlighted) {
      const barHighlight = element('wu-busiest-month-card__bar-highlight');
      barNode.append(barHighlight);
      view.highlightedBars.push(barNode);
      view.barHighlights.push(barHighlight);
      if (label && labelText) {
        const labelHighlight = element('wu-busiest-month-card__label-highlight', bar.label);
        label.append(labelHighlight);
        view.labelTexts.push(labelText);
        view.labelHighlights.push(labelHighlight);
      }
    }

    front.append(column);
  });

  stage.append(back, middle, front);
  root.append(stage);
  return view;
}

/**
 * Keeps the whole frame inside the container at its Figma proportions, like `object-fit: contain`.
 * A container without a height of its own gets one from the card, scaled by its width.
 */
function fitToContainer(root: HTMLElement, maxScale: number): () => void {
  let ownsHeight: boolean | null = null;

  return observeSize(root, (box) => {
    if (box.width === 0) return;
    if (ownsHeight === null) ownsHeight = box.height === 0;

    const scale = containScale(ownsHeight ? { ...box, height: Infinity } : box, MONTHS_CARD_FRAME, maxScale);
    if (ownsHeight) root.style.height = `${MONTHS_CARD_FRAME.height * scale}px`;
    root.style.setProperty('--wu-u', `${scale}px`);
  });
}

function buildTimeline(
  view: BusiestMonthCardView,
  target: number,
  format: (value: number) => string,
): gsap.core.Timeline {
  const { pages, bars, counter, highlight } = TIMING;
  const timeline = holdTimeline(TIMING.screen);
  // The last bar lands together with the counter, however many bars there are.
  const barDuration = Math.max(bars.minDuration, bars.endAt - bars.at - bars.stagger * (view.bars.length - 1));

  // GSAP writes through the setter on every render, so the text also follows seek() and rewinds.
  let counted = 0;
  const count = {
    get value() {
      return counted;
    },
    set value(next: number) {
      counted = next;
      view.value.textContent = format(Math.round(next));
    },
  };

  timeline
    .fromTo(
      view.pages,
      { opacity: 0, '--wu-y': pages.offsetY },
      { opacity: 1, '--wu-y': 0, duration: pages.duration, ease: 'power3.out', stagger: pages.stagger },
      pages.at,
    )
    .fromTo(
      view.bars,
      { '--wu-p': 0 },
      { '--wu-p': 1, duration: barDuration, ease: 'power2.out', stagger: bars.stagger },
      bars.at,
    )
    .fromTo(
      count,
      { value: 0 },
      { value: target, duration: counter.endAt - counter.at, ease: 'power1.out' },
      counter.at,
    )
    .fromTo(
      view.barHighlights,
      { opacity: 0 },
      { opacity: 1, duration: highlight.duration, ease: 'power1.out' },
      highlight.at,
    )
    .fromTo(
      view.labelHighlights,
      { opacity: 0 },
      { opacity: 1, duration: highlight.duration, ease: 'power1.out' },
      highlight.at,
    )
    .fromTo(
      view.labelTexts,
      { opacity: 1 },
      { opacity: 0, duration: highlight.duration, ease: 'power1.out' },
      highlight.at,
    )
    .fromTo(
      view.highlightedBars,
      { '--wu-p': 1 },
      {
        '--wu-p': highlight.overshoot,
        duration: highlight.duration / 2,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: 1,
        immediateRender: false,
      },
      highlight.at,
    );

  return timeline;
}

/**
 * Mounts the 05 "Busiest month" card into `el` and scales it to fit that element.
 * The card picks its own variant (peak, tie, steady, busiest week) from the data.
 */
export function mountBusiestMonthCard(
  el: HTMLElement,
  data: BusiestMonthCardData,
  options: BusiestMonthCardOptions = {},
): BusiestMonthCardController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale = DEFAULT_MAX_SCALE } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };

  const analysis = analyzeBusiestMonthCard(data, {
    steadyThreshold: options.steadyThreshold,
    monthLabels: monthNames(locale, 'narrow'),
  });

  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const format = (value: number) => numberFormat.format(value);
  const finalValue = format(analysis.value);
  const unit =
    analysis.unit === 'per_month' ? labels.perMonth : analysis.value === 1 ? labels.visit : labels.visits;

  ensureStyles('busiest-month-card', BUSIEST_MONTH_CARD_STYLES);
  const view = render(analysis, data, unit);
  view.root.setAttribute('aria-label', options.ariaLabel ?? describe(analysis, data, unit, finalValue, locale));
  el.append(view.root);
  const stopFitting = fitToContainer(view.root, maxScale);

  const timeline = buildTimeline(view, analysis.value, format);
  addBlankFlips(timeline, view.pages[0]!);

  const controller = createController({
    timeline,
    onComplete,
    onDestroy: () => {
      stopFitting();
      view.root.remove();
    },
  });

  const card: BusiestMonthCardController = Object.defineProperty(controller, 'analysis', {
    value: analysis,
    enumerable: true,
  }) as BusiestMonthCardController;

  if (autoplay) card.play();
  return card;
}
