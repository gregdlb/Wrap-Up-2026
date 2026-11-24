import { createCardShell, element } from '../shared/card';
import { createController, holdTimeline, type WrapUpController, type WrapUpOptions } from '../shared/controller';
import { SCREEN_SECONDS } from '../shared/counter';
import { createSheets } from '../shared/flips';
import { trackImages } from '../shared/images';
import { addPagesIn, createPages, FRONT_PAGE } from '../shared/pages';
import { addStickerPop, createSticker } from '../shared/sticker';
import { ensureStyles } from '../shared/styles';

export interface FirstVisitCardData {
  /** Day of the first visit as `YYYY-MM-DD`, e.g. "2026-03-04". */
  date: string;
}

export interface FirstVisitCardLabels {
  /** Text of the sticker. */
  sticker: string;
}

export interface FirstVisitCardOptions extends WrapUpOptions {
  /** Locale for the month and weekday names. Defaults to "en-US". */
  locale?: string;
  labels?: Partial<FirstVisitCardLabels>;
  /** Largest scale relative to the Figma size. Defaults to 1.15. */
  maxScale?: number;
  /** Replaces the generated screen reader description of the card. */
  ariaLabel?: string;
  /** Folder with the images, ending in "/". Defaults to the `assets` folder next to this module. */
  assetBaseUrl?: string;
}

export interface FirstVisitCardController extends WrapUpController {
  /** The dates the calendar flips through, as `YYYY-MM-DD`: the first one is on top at the start, the last is `date`. */
  readonly flipDates: string[];
}

const DEFAULT_LABELS: FirstVisitCardLabels = { sticker: 'First visit' };

/** The Figma "Calendar · stripe" frame. */
const FRAME = { width: 360, height: 350 };
const MS_PER_DAY = 86_400_000;

/**
 * The calendar flips from 1 January to the date: sheets turn up over the hinge under the month stripe,
 * one closely after the other (the motion of a sheet is in `shared/flips`). Seconds are counted from `play()`;
 * the first sheet lifts while the calendar is still sliding in, the last one is gone before the marker starts.
 */
/** Height of the month stripe: the sheets are hinged at its bottom edge. */
const STRIPE_HEIGHT = 52;

const FLIP = {
  startAt: 0.75,
  endAt: 3.05,
  /** At most this many flips. */
  most: 7,
  /** Days right before the date that get a sheet of their own, day after day. */
  daysBefore: 2,
  /** Between 1 January and those days: one more stop for every so many days, as far as `most` allows. */
  daysPerStop: 20,
  /** Days each stop is moved off an even spread, so the numbers do not look like a pattern. */
  uneven: [2, -4, 5, -3],
};

/**
 * The hand-drawn marker circle around the day, from Figma: an open loop that ends a little past its start.
 * Drawn in a 178.808 x 110.928 box, tilted, centred on the day. Two digits get a wider loop.
 */
const MARKER = {
  at: 3.1,
  duration: 0.7,
  path: [
    ['M', 74.1051, 9.47798],
    ['C', 123.202, 1.29514, 172.299, 17.6608, 172.299, 53.1198],
    ['C', 172.299, 91.3064, 117.747, 110.4, 74.1051, 107.672],
    ['C', 27.7357, 104.944, 0.45959, 83.1235, 3.1872, 53.1198],
    ['C', 5.91482, 23.116, 46.829, 6.75036, 101.381, 4.02275],
    ['C', 134.113, 1.29514, 155.934, 4.02275, 177.754, 12.2056],
  ] as const,
  width: 178.808,
  height: 110.928,
  strokeWidth: 6,
  tilt: 9,
  /** Centre on the front page. */
  x: 105.54,
  y: 128.34,
  /** Horizontal stretch by the number of digits of the day. */
  stretch: { 1: 1, 2: 1.1445 } as Record<number, number>,
};

/** The "First visit" sticker: unrotated top left corner in the frame, its tilt, and how far it turns popping in. */
const STICKER = { at: 3.8, duration: 0.4, x: 233.48, y: 50.5, tilt: 6, turn: 18, shadow: { y: 12, blur: 20 } };

/** Text positions are on the front page (214 x 236); a sheet that flips is the page below the 52 px stripe. */
const STYLES = /* css */ `
.wu-first-visit-card__stripe {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: calc(52 * var(--wu-u));
  border-radius: calc(14 * var(--wu-u)) calc(14 * var(--wu-u)) 0 0;
  background: var(--brand-500, #066e3d);
}

.wu-first-visit-card__text {
  position: absolute;
  left: 0;
  width: 100%;
  text-align: center;
  line-height: 1;
  white-space: nowrap;
}

.wu-first-visit-card__month {
  top: calc(20 * var(--wu-u));
  color: var(--beige-50, #fefdfc);
  font-size: calc(13 * var(--wu-u));
  font-weight: 700;
  letter-spacing: calc(2.34 * var(--wu-u));
  text-transform: uppercase;
}

.wu-first-visit-card__day {
  top: calc(83 * var(--wu-u));
  color: var(--emerald-500, #023620);
  font-size: calc(96 * var(--wu-u));
  font-weight: 800;
}

.wu-first-visit-card__weekday {
  top: calc(194 * var(--wu-u));
  color: var(--taupe-700, #6d615d);
  font-size: calc(16 * var(--wu-u));
  font-weight: 500;
}

/* The sheets that turn are hinged right under the stripe, so only their bottom corners are round. */
.wu-first-visit-card .wu-sheets {
  --wu-sheet-radius: 0 0 calc(14 * var(--wu-u)) calc(14 * var(--wu-u));
}

.wu-sheet .wu-first-visit-card__day {
  top: calc(31 * var(--wu-u));
}

.wu-sheet .wu-first-visit-card__weekday {
  top: calc(142 * var(--wu-u));
}

.wu-first-visit-card__marker {
  position: absolute;
  left: calc(var(--x) * var(--wu-u));
  top: calc(var(--y) * var(--wu-u));
  width: calc(var(--w) * var(--wu-u));
  height: calc(var(--h) * var(--wu-u));
  overflow: visible;
  transform: rotate(calc(var(--wu-tilt) * 1deg));
}

.wu-first-visit-card__marker path {
  fill: none;
  stroke: var(--olive-500, #d7e4c9);
  stroke-dasharray: 100;
  /* Rounded ends, like the tip of a real marker. */
  stroke-linecap: round;
}
`;

interface Sheet {
  iso: string;
  month: string;
  day: string;
  weekday: string;
}

/** Reads `YYYY-MM-DD` as a calendar day, independent of the device's time zone. */
function parseDay(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const day = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!day || Number.isNaN(day.getTime())) throw new Error(`FirstVisitCard: date must be YYYY-MM-DD, got "${date}"`);
  return day;
}

const addDays = (day: Date, count: number) => new Date(day.getTime() + count * MS_PER_DAY);

/**
 * The dates on the sheets, from the one on top at the start to the first visit.
 * They go forward through the year in uneven steps and no day number appears twice, so every flip shows
 * a new number: for 4 March that is 1 Jan, 18 Jan, 27 Jan, 20 Feb, 2 Mar, 3 Mar, 4 Mar. The last two sheets
 * before the date are always the two days before it. A date early in January gets fewer sheets.
 * 1 January itself gets a single flip, from 31 December.
 */
function sheetDates(target: Date): Date[] {
  const start = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  if (target.getTime() === start.getTime()) return [addDays(start, -1), target];

  const near: Date[] = [];
  for (let back = FLIP.daysBefore; back >= 1; back--) {
    const day = addDays(target, -back);
    if (day > start) near.push(day);
  }

  // Days of the year that lie strictly between 1 January and the first of the days before the date.
  const free = Math.round(((near[0] ?? target).getTime() - start.getTime()) / MS_PER_DAY) - 1;
  const count = Math.min(FLIP.most - 1 - near.length, Math.ceil(free / FLIP.daysPerStop));
  const step = (free + 1) / (count + 1);
  const taken = new Set([start, ...near, target].map((day) => day.getUTCDate()));
  const stops: Date[] = [];
  let after = 0;
  for (let index = 0; index < count; index++) {
    // Evenly spread, nudged off the grid; never so late that the stops still to come have no day left.
    const nudge = Math.round(FLIP.uneven[index % FLIP.uneven.length]! * Math.min(1, step / 15));
    const latest = free - (count - 1 - index);
    const ideal = Math.min(Math.max(Math.round(step * (index + 1)) + nudge, after + 1), latest);
    // The closest day whose number is not on another sheet.
    for (let shift = 0; shift <= free; shift = shift > 0 ? -shift : 1 - shift) {
      const offset = ideal + shift;
      if (offset <= after || offset > latest) continue;
      const day = addDays(start, offset);
      if (taken.has(day.getUTCDate())) continue;
      taken.add(day.getUTCDate());
      stops.push(day);
      after = offset;
      break;
    }
  }
  return [start, ...stops, ...near, target];
}

function markerPath(stretch: number): string {
  const centre = MARKER.width / 2;
  return MARKER.path
    .map(([command, ...numbers]) => {
      const points = numbers.map((value, index) => (index % 2 === 0 ? centre + (value - centre) * stretch : value));
      return `${command}${points.map((value) => value.toFixed(3)).join(' ')}`;
    })
    .join('');
}

function createMarker(digits: number): { marker: SVGSVGElement; line: SVGPathElement } {
  const stretch = MARKER.stretch[digits] ?? MARKER.stretch[2]!;
  const namespace = 'http://www.w3.org/2000/svg';
  const marker = document.createElementNS(namespace, 'svg');
  marker.setAttribute('class', 'wu-first-visit-card__marker');
  marker.setAttribute('viewBox', `0 0 ${MARKER.width} ${MARKER.height}`);
  marker.setAttribute('aria-hidden', 'true');
  marker.style.setProperty('--x', String(MARKER.x - MARKER.width / 2));
  marker.style.setProperty('--y', String(MARKER.y - MARKER.height / 2));
  marker.style.setProperty('--w', String(MARKER.width));
  marker.style.setProperty('--h', String(MARKER.height));
  marker.style.setProperty('--wu-tilt', String(MARKER.tilt));

  const line = document.createElementNS(namespace, 'path');
  line.setAttribute('d', markerPath(stretch));
  line.setAttribute('stroke-width', String(MARKER.strokeWidth));
  // The dash pattern is given in hundredths of the line, whatever its real length.
  line.setAttribute('pathLength', '100');
  marker.append(line);
  return { marker, line };
}

/**
 * Mounts the 02 "First visit" calendar into `el` and scales it to fit that element.
 * The calendar flips from 1 January to `data.date`, a marker circles the day, and the "First visit" sticker pops in.
 */
export function mountFirstVisitCard(
  el: HTMLElement,
  data: FirstVisitCardData,
  options: FirstVisitCardOptions = {},
): FirstVisitCardController {
  const { locale = 'en-US', autoplay = false, onComplete, maxScale, ariaLabel, assetBaseUrl } = options;
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const target = parseDay(data.date);
  const format = (day: Date, parts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...parts, timeZone: 'UTC' }).format(day);
  const sheets: Sheet[] = sheetDates(target).map((day) => ({
    iso: day.toISOString().slice(0, 10),
    month: format(day, { month: 'long', year: 'numeric' }),
    day: format(day, { day: 'numeric' }),
    weekday: format(day, { weekday: 'long' }),
  }));
  const last = sheets.length - 1;

  ensureStyles('first-visit-card', STYLES);
  const shell = createCardShell(el, {
    className: 'wu-first-visit-card',
    frame: FRAME,
    maxScale,
    ariaLabel: ariaLabel ?? format(target, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  });
  const pages = createPages(shell.stage);
  pages.all.forEach((page) => page.append(element('wu-first-visit-card__stripe')));

  const text = (name: string) => element(`wu-first-visit-card__text wu-first-visit-card__${name}`);
  const month = text('month');
  const printed = (sheet: Sheet) => {
    const day = text('day');
    const weekday = text('weekday');
    day.textContent = sheet.day;
    weekday.textContent = sheet.weekday;
    return [day, weekday];
  };
  const { marker, line } = createMarker(sheets[last]!.day.length);
  // The date itself is printed on the page; every date before it is a sheet lying on top, 1 January uppermost.
  const stack = createSheets({ count: last, hinge: STRIPE_HEIGHT, height: FRONT_PAGE.height, window: FLIP.endAt - FLIP.startAt });
  stack.sheets.forEach((sheet, index) => sheet.append(...printed(sheets[index]!)));
  pages.front.append(month, marker, ...printed(sheets[last]!), stack.node);

  const sticker = createSticker({ text: labels.sticker, ...STICKER, assetBaseUrl });
  shell.stage.append(sticker);

  /** Shows the calendar `seconds` into the flipping: every sheet's pose, and the month of the sheet on top. */
  const showFlip = (seconds: number) => {
    const onTop = sheets[stack.show(seconds)]!.month;
    if (month.textContent !== onTop) month.textContent = onTop;
  };

  // GSAP writes through the setter on every render, so the sheets also follow seek() and rewinds.
  let flipped = 0;
  const flipping = {
    get seconds() {
      return flipped;
    },
    set seconds(next: number) {
      flipped = next;
      showFlip(next);
    },
  };

  const timeline = holdTimeline(SCREEN_SECONDS);
  addPagesIn(timeline, pages);
  timeline
    .fromTo(flipping, { seconds: 0 }, { seconds: stack.seconds, duration: stack.seconds, ease: 'none' }, FLIP.startAt)
    .fromTo(marker, { opacity: 0 }, { opacity: 1, duration: 0.01 }, MARKER.at)
    .fromTo(
      line,
      { strokeDashoffset: 100 },
      { strokeDashoffset: 0, duration: MARKER.duration, ease: 'power1.inOut' },
      MARKER.at,
    );
  addStickerPop(timeline, sticker, STICKER.at, { duration: STICKER.duration, turn: STICKER.turn });

  const controller = createController({
    timeline,
    ready: trackImages(shell.root.querySelectorAll('img')),
    onComplete,
    onDestroy: shell.remove,
  });
  const card = Object.defineProperty(controller, 'flipDates', {
    value: sheets.map((sheet) => sheet.iso),
    enumerable: true,
  }) as FirstVisitCardController;

  if (autoplay) card.play();
  return card;
}
